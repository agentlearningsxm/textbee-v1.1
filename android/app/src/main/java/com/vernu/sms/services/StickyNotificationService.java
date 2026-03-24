package com.vernu.sms.services;

import android.app.ForegroundServiceStartNotAllowedException;
import android.app.*;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.os.SystemClock;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.vernu.sms.ApiManager;
import com.vernu.sms.R;
import com.vernu.sms.activities.MainActivity;
import com.vernu.sms.dtos.PendingSMSResponseDTO;
import com.vernu.sms.helpers.SMSHelper;
import com.vernu.sms.models.SMSPayload;
import com.vernu.sms.receivers.AlarmReceiver;
import com.vernu.sms.AppConstants;
import com.vernu.sms.helpers.SharedPreferenceHelper;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Foreground service that polls for pending SMS messages using AlarmManager.
 * Uses setExactAndAllowWhileIdle() to survive Doze mode on Android 6+.
 */
public class StickyNotificationService extends Service {

    private static final String TAG = "StickyNotificationService";
    private static final long POLLING_INTERVAL_MS = 15000; // Poll every 15 seconds

    private static final int MAX_CONSECUTIVE_AUTH_FAILURES = 5;

    private AlarmManager alarmManager;
    private PendingIntent alarmPendingIntent;
    private boolean isPolling = false;
    private int consecutiveAuthFailures = 0;

    @Override
    public IBinder onBind(Intent intent) {
        Log.i(TAG, "Service onBind " + (intent != null ? intent.getAction() : "null"));
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "Service onCreate");
        alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.i(TAG, "onStartCommand - startId: " + startId + ", action: " + (intent != null ? intent.getAction() : "null"));

        // Check if sticky notification is enabled
        boolean stickyNotificationEnabled = SharedPreferenceHelper.getSharedPreferenceBoolean(
                getApplicationContext(),
                AppConstants.SHARED_PREFS_STICKY_NOTIFICATION_ENABLED_KEY,
                false
        );

        if (!stickyNotificationEnabled) {
            Log.i(TAG, "Sticky notification disabled, stopping service");
            stopPolling();
            stopSelf();
            return START_NOT_STICKY;
        }

        // Check if we're in a dataSync timeout cooldown (Android 15+ crash loop prevention)
        long lastTimeoutAt = SharedPreferenceHelper.getSharedPreferenceLong(
                getApplicationContext(), AppConstants.SHARED_PREFS_DATASYNC_TIMEOUT_AT_KEY, 0);
        if (lastTimeoutAt > 0) {
            long elapsed = System.currentTimeMillis() - lastTimeoutAt;
            if (elapsed < AppConstants.DATASYNC_TIMEOUT_COOLDOWN_MS) {
                Log.w(TAG, "In dataSync timeout cooldown (" + (elapsed / 1000) + "s elapsed, need " +
                        (AppConstants.DATASYNC_TIMEOUT_COOLDOWN_MS / 1000) + "s). Not starting foreground service.");
                stopSelf();
                return START_NOT_STICKY;
            } else {
                // Cooldown expired, clear the flag
                SharedPreferenceHelper.setSharedPreferenceLong(
                        getApplicationContext(), AppConstants.SHARED_PREFS_DATASYNC_TIMEOUT_AT_KEY, 0);
                Log.i(TAG, "DataSync timeout cooldown expired, resuming normal operation");
            }
        }

        // Start as foreground service with notification
        Notification notification = createNotification();
        try {
            startForeground(1, notification);
            Log.i(TAG, "Started foreground service with sticky notification");
        } catch (ForegroundServiceStartNotAllowedException e) {
            Log.w(TAG, "Cannot start foreground from background, stopping service: " + e.getMessage());
            stopSelf();
            return START_NOT_STICKY;
        }

        // Handle alarm-triggered poll
        if (intent != null && AlarmReceiver.ACTION_POLL_SMS.equals(intent.getAction())) {
            Log.d(TAG, "Received poll trigger from AlarmReceiver");
            pollForPendingSMS();
        }

        // Start or ensure polling is active
        if (!isPolling) {
            startPolling();
        } else {
            // Re-schedule next poll (service may have been recreated)
            scheduleNextPoll();
        }

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        stopPolling();
        Log.i(TAG, "StickyNotificationService destroyed");
    }

    /**
     * Android 14+ (API 34) timeout handler for dataSync foreground services.
     * dataSync services have a 6-hour maximum runtime per 24-hour period.
     * Do NOT restart immediately — the budget is exhausted and restarting causes a crash loop.
     * Instead, schedule a delayed restart via AlarmManager after 1 hour.
     *
     * Note: Service.onTimeout(int) was added in API 34. On API 35+, the new
     * onTimeout(int, int) delegates to this single-param version by default.
     */
    @Override
    public void onTimeout(int startId) {
        Log.w(TAG, "Service timeout reached (Android 15+). Stopping gracefully and scheduling delayed restart.");

        // Save timeout timestamp to prevent START_STICKY crash loop
        SharedPreferenceHelper.setSharedPreferenceLong(
                getApplicationContext(), AppConstants.SHARED_PREFS_DATASYNC_TIMEOUT_AT_KEY, System.currentTimeMillis());

        // Stop current polling
        stopPolling();
        stopForeground(STOP_FOREGROUND_REMOVE);

        // Schedule a delayed restart via AlarmManager (1 hour from now)
        // This gives the dataSync budget time to refresh
        try {
            Intent restartIntent = new Intent(this, AlarmReceiver.class);
            restartIntent.setAction(AlarmReceiver.ACTION_RESTART_SERVICE);
            PendingIntent restartPendingIntent = PendingIntent.getBroadcast(
                    this, 1, restartIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            long restartTime = SystemClock.elapsedRealtime() + (60 * 60 * 1000); // 1 hour
            am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, restartTime, restartPendingIntent);
            Log.i(TAG, "Scheduled service restart in 1 hour");
        } catch (Exception e) {
            Log.e(TAG, "Failed to schedule delayed restart: " + e.getMessage());
        }

        stopSelf(startId);
    }

    /**
     * Start polling for pending SMS messages using AlarmManager.
     * AlarmManager.setExactAndAllowWhileIdle() survives Doze mode.
     */
    private void startPolling() {
        if (isPolling) {
            Log.d(TAG, "Polling already started");
            return;
        }

        isPolling = true;

        // Do immediate first poll
        pollForPendingSMS();

        // Schedule subsequent polls using AlarmManager
        scheduleNextPoll();

        Log.i(TAG, "Started AlarmManager-based polling every " + (POLLING_INTERVAL_MS / 1000) + " seconds");
    }

    /**
     * Schedule the next poll using AlarmManager.setExactAndAllowWhileIdle().
     * This method survives Doze mode and will wake the device if needed.
     */
    private void scheduleNextPoll() {
        if (!isPolling) {
            Log.d(TAG, "Not scheduling next poll - polling is stopped");
            return;
        }

        Intent intent = new Intent(this, AlarmReceiver.class);
        intent.setAction(AlarmReceiver.ACTION_POLL_SMS);

        alarmPendingIntent = PendingIntent.getBroadcast(
                this,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        long triggerAtMillis = SystemClock.elapsedRealtime() + POLLING_INTERVAL_MS;

        // Use appropriate alarm method based on Android version
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // Android 12+ requires checking if exact alarms are allowed
            if (alarmManager.canScheduleExactAlarms()) {
                alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.ELAPSED_REALTIME_WAKEUP,
                        triggerAtMillis,
                        alarmPendingIntent
                );
                Log.d(TAG, "Scheduled exact alarm for next poll in " + (POLLING_INTERVAL_MS / 1000) + " seconds");
            } else {
                // Fallback to inexact alarm if exact alarms not allowed
                alarmManager.setAndAllowWhileIdle(
                        AlarmManager.ELAPSED_REALTIME_WAKEUP,
                        triggerAtMillis,
                        alarmPendingIntent
                );
                Log.w(TAG, "Exact alarms not allowed, using inexact alarm (may be less precise in Doze)");
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            // Android 6-11: setExactAndAllowWhileIdle is available without permission check
            alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.ELAPSED_REALTIME_WAKEUP,
                    triggerAtMillis,
                    alarmPendingIntent
            );
            Log.d(TAG, "Scheduled exact alarm for next poll in " + (POLLING_INTERVAL_MS / 1000) + " seconds");
        } else {
            // Android 5 and below: use setExact
            alarmManager.setExact(
                    AlarmManager.ELAPSED_REALTIME_WAKEUP,
                    triggerAtMillis,
                    alarmPendingIntent
            );
            Log.d(TAG, "Scheduled exact alarm for next poll in " + (POLLING_INTERVAL_MS / 1000) + " seconds");
        }
    }

    /**
     * Stop polling for pending SMS and cancel any pending alarms.
     */
    private void stopPolling() {
        isPolling = false;

        if (alarmManager != null && alarmPendingIntent != null) {
            alarmManager.cancel(alarmPendingIntent);
            alarmPendingIntent = null;
            Log.d(TAG, "Cancelled pending alarm");
        }

        Log.i(TAG, "Stopped polling for pending SMS");
    }

    /**
     * Poll the server for pending SMS and send them.
     * After completion (success or failure), schedules the next poll.
     */
    private void pollForPendingSMS() {
        String deviceId = SharedPreferenceHelper.getSharedPreferenceString(
                getApplicationContext(), AppConstants.SHARED_PREFS_DEVICE_ID_KEY, "");
        String apiKey = SharedPreferenceHelper.getSharedPreferenceString(
                getApplicationContext(), AppConstants.SHARED_PREFS_API_KEY_KEY, "");
        boolean gatewayEnabled = SharedPreferenceHelper.getSharedPreferenceBoolean(
                getApplicationContext(), AppConstants.SHARED_PREFS_GATEWAY_ENABLED_KEY, false);

        if (deviceId.isEmpty() || apiKey.isEmpty() || !gatewayEnabled) {
            Log.d(TAG, "Skipping poll - device not configured or gateway disabled");
            scheduleNextPoll(); // Still schedule next poll
            return;
        }

        Log.d(TAG, "Polling for pending SMS...");

        ApiManager.getApiService().getPendingSMS(deviceId, apiKey, 10)
                .enqueue(new Callback<PendingSMSResponseDTO>() {
                    @Override
                    public void onResponse(Call<PendingSMSResponseDTO> call, Response<PendingSMSResponseDTO> response) {
                        if (!response.isSuccessful() || response.body() == null || response.body().data == null) {
                            Log.e(TAG, "Failed to fetch pending SMS: " + response.code());

                            // Circuit breaker: stop polling on persistent auth failures
                            if (response.code() == 401) {
                                consecutiveAuthFailures++;
                                Log.w(TAG, "Auth failure " + consecutiveAuthFailures + "/" + MAX_CONSECUTIVE_AUTH_FAILURES);
                                if (consecutiveAuthFailures >= MAX_CONSECUTIVE_AUTH_FAILURES) {
                                    Log.e(TAG, "Too many consecutive auth failures. API key is invalid or revoked. Stopping polling.");
                                    stopPolling();
                                    showAuthErrorNotification();
                                    return;
                                }
                            }

                            scheduleNextPoll();
                            return;
                        }

                        // Reset failure counter on success
                        consecutiveAuthFailures = 0;

                        int count = response.body().data.count;
                        if (count == 0) {
                            Log.d(TAG, "No pending SMS");
                        } else {
                            Log.i(TAG, "Found " + count + " pending SMS to send");

                            // Process each pending SMS
                            for (SMSPayload smsPayload : response.body().data.messages) {
                                sendSMS(smsPayload);
                            }
                        }

                        scheduleNextPoll();
                    }

                    @Override
                    public void onFailure(Call<PendingSMSResponseDTO> call, Throwable t) {
                        Log.e(TAG, "Error polling for pending SMS: " + t.getMessage());
                        scheduleNextPoll();
                    }
                });
    }

    /**
     * Send SMS using the SMS payload.
     */
    private void sendSMS(SMSPayload smsPayload) {
        if (smsPayload == null) {
            Log.e(TAG, "SMS payload is null");
            return;
        }

        // Get preferred SIM
        int preferredSim = SharedPreferenceHelper.getSharedPreferenceInt(
                getApplicationContext(), AppConstants.SHARED_PREFS_PREFERRED_SIM_KEY, -1);

        String[] recipients = smsPayload.getRecipients();
        if (recipients == null || recipients.length == 0) {
            Log.e(TAG, "No recipients in SMS payload");
            return;
        }

        for (String recipient : recipients) {
            boolean smsSent;
            if (preferredSim == -1) {
                smsSent = SMSHelper.sendSMS(
                        recipient,
                        smsPayload.getMessage(),
                        smsPayload.getSmsId(),
                        smsPayload.getSmsBatchId(),
                        getApplicationContext()
                );
            } else {
                try {
                    smsSent = SMSHelper.sendSMSFromSpecificSim(
                            recipient,
                            smsPayload.getMessage(),
                            preferredSim,
                            smsPayload.getSmsId(),
                            smsPayload.getSmsBatchId(),
                            getApplicationContext()
                    );
                } catch (Exception e) {
                    Log.e(TAG, "Error sending SMS from specific SIM: " + e.getMessage());
                    smsSent = false;
                }
            }

            Log.d(TAG, "SMS to " + recipient + ": " + (smsSent ? "sent" : "failed"));
        }
    }

    /**
     * Show a high-priority notification telling the user their API key is invalid.
     * This replaces the foreground notification so they notice it.
     */
    private void showAuthErrorNotification() {
        String notificationChannelId = "authErrorChannel";
        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    notificationChannelId,
                    "Authentication Errors",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Alerts when your API key is invalid or revoked");
            notificationManager.createNotificationChannel(channel);
        }

        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, notificationIntent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, notificationChannelId)
                .setContentTitle("TextBee: Invalid API Key")
                .setContentText("Your API key is invalid or revoked. Tap to open the app and enter a new key from the dashboard.")
                .setStyle(new NotificationCompat.BigTextStyle()
                        .bigText("Your API key is invalid or revoked. SMS gateway has stopped polling. Open the app, generate a new API key from the web dashboard, and tap Register."))
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH);

        notificationManager.notify(2, builder.build());

        // Also stop the foreground service since polling is stopped
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    /**
     * Create the foreground notification.
     */
    private Notification createNotification() {
        String notificationChannelId = "stickyNotificationChannel";

        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    notificationChannelId,
                    "SMS Gateway Service",
                    NotificationManager.IMPORTANCE_LOW // Low importance = no sound/vibration
            );
            channel.enableVibration(false);
            channel.setShowBadge(false);
            channel.setDescription("Keeps the SMS gateway active in background");
            notificationManager.createNotificationChannel(channel);

            Intent notificationIntent = new Intent(this, MainActivity.class);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                    this, 0, notificationIntent,
                    PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
            );

            Notification.Builder builder = new Notification.Builder(this, notificationChannelId);
            return builder
                    .setContentTitle("TextBee Active")
                    .setContentText("SMS gateway polling every 15 seconds")
                    .setContentIntent(pendingIntent)
                    .setOngoing(true)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .build();
        } else {
            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, notificationChannelId);
            return builder
                    .setContentTitle("TextBee Active")
                    .setContentText("SMS gateway polling every 15 seconds")
                    .setOngoing(true)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .build();
        }
    }
}
