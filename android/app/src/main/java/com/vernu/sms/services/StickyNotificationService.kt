package com.vernu.sms.services

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.SystemClock
import android.util.Log
import androidx.core.app.NotificationCompat
import com.vernu.sms.ApiManager
import com.vernu.sms.AppConstants
import com.vernu.sms.R
import com.vernu.sms.activities.MainActivity
import com.vernu.sms.dtos.PendingSMSResponseDTO
import com.vernu.sms.helpers.SMSHelper
import com.vernu.sms.helpers.SharedPreferenceHelper
import com.vernu.sms.models.SMSPayload
import com.vernu.sms.receivers.AlarmReceiver
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class StickyNotificationService : Service() {
    companion object {
        private const val TAG = "StickyNotificationService"
        private const val NOTIFICATION_CHANNEL_ID = "stickyNotificationChannel"
        private const val AUTH_ERROR_CHANNEL_ID = "authErrorChannel"
        private const val NOTIFICATION_ID = 1
        private const val AUTH_ERROR_NOTIFICATION_ID = 2
        private const val POLLING_INTERVAL_MS = 15_000L
        private const val MAX_CONSECUTIVE_AUTH_FAILURES = 5
    }

    private var alarmManager: AlarmManager? = null
    private var alarmPendingIntent: PendingIntent? = null
    private var isPolling = false

    override fun onBind(intent: Intent?): IBinder? {
        Log.i(TAG, "Service onBind ${intent?.action}")
        return null
    }

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "Service onCreate")
        alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.i(TAG, "onStartCommand - startId: $startId, action: ${intent?.action}")

        val stickyNotificationEnabled = SharedPreferenceHelper.getSharedPreferenceBoolean(
            applicationContext,
            AppConstants.SHARED_PREFS_STICKY_NOTIFICATION_ENABLED_KEY,
            false,
        )
        if (!stickyNotificationEnabled) {
            Log.i(TAG, "Sticky notification disabled, stopping service")
            stopPolling()
            stopSelf()
            return START_NOT_STICKY
        }

        val lastTimeoutAt = SharedPreferenceHelper.getSharedPreferenceLong(
            applicationContext,
            AppConstants.SHARED_PREFS_DATASYNC_TIMEOUT_AT_KEY,
            0L,
        )
        if (lastTimeoutAt > 0) {
            val elapsed = System.currentTimeMillis() - lastTimeoutAt
            if (elapsed < AppConstants.DATASYNC_TIMEOUT_COOLDOWN_MS) {
                Log.w(TAG, "In dataSync timeout cooldown; not starting foreground service")
                stopSelf()
                return START_NOT_STICKY
            }
            SharedPreferenceHelper.setSharedPreferenceLong(
                applicationContext,
                AppConstants.SHARED_PREFS_DATASYNC_TIMEOUT_AT_KEY,
                0L,
            )
        }

        try {
            val notification = createNotification()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
                )
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
            Log.i(TAG, "Started foreground service with sticky notification")
        } catch (e: Exception) {
            Log.w(TAG, "Cannot start foreground service: ${e.message}")
            stopSelf()
            return START_NOT_STICKY
        }

        if (intent?.action == AlarmReceiver.ACTION_POLL_SMS) {
            Log.d(TAG, "Received poll trigger from AlarmReceiver")
        }

        if (!isPolling) {
            isPolling = true
            Log.i(TAG, "Started AlarmManager polling every ${POLLING_INTERVAL_MS / 1000} seconds")
        }
        pollForPendingSMS()

        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        stopPolling()
        Log.i(TAG, "StickyNotificationService destroyed")
    }

    override fun onTimeout(startId: Int) {
        handleServiceTimeout(startId)
    }

    override fun onTimeout(startId: Int, fgsType: Int) {
        handleServiceTimeout(startId)
    }

    private fun handleServiceTimeout(startId: Int) {
        Log.w(TAG, "Service timeout reached. Stopping gracefully and scheduling delayed restart.")
        SharedPreferenceHelper.setSharedPreferenceLong(
            applicationContext,
            AppConstants.SHARED_PREFS_DATASYNC_TIMEOUT_AT_KEY,
            System.currentTimeMillis(),
        )
        stopPolling()
        stopForeground(STOP_FOREGROUND_REMOVE)
        scheduleRestartAfterTimeout()
        stopSelf(startId)
    }

    private fun startPolling() {
        if (isPolling) return
        isPolling = true
        pollForPendingSMS()
        scheduleNextPoll()
        Log.i(TAG, "Started AlarmManager polling every ${POLLING_INTERVAL_MS / 1000} seconds")
    }

    private fun scheduleNextPoll() {
        if (!isPolling) return

        val intent = Intent(this, AlarmReceiver::class.java).apply {
            action = AlarmReceiver.ACTION_POLL_SMS
        }
        val pendingIntent = PendingIntent.getBroadcast(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        alarmPendingIntent = pendingIntent
        val triggerAtMillis = SystemClock.elapsedRealtime() + POLLING_INTERVAL_MS
        val manager = alarmManager ?: return

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !manager.canScheduleExactAlarms()) {
            manager.setAndAllowWhileIdle(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                triggerAtMillis,
                pendingIntent,
            )
            Log.w(TAG, "Exact alarms not allowed, using inexact alarm")
            return
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            manager.setExactAndAllowWhileIdle(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                triggerAtMillis,
                pendingIntent,
            )
        } else {
            manager.setExact(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                triggerAtMillis,
                pendingIntent,
            )
        }
    }

    private fun stopPolling() {
        isPolling = false
        alarmPendingIntent?.let { alarmManager?.cancel(it) }
        alarmPendingIntent = null
    }

    private fun scheduleRestartAfterTimeout() {
        try {
            val restartIntent = Intent(this, AlarmReceiver::class.java).apply {
                action = AlarmReceiver.ACTION_RESTART_SERVICE
            }
            val restartPendingIntent = PendingIntent.getBroadcast(
                this,
                1,
                restartIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            val restartTime = SystemClock.elapsedRealtime() + AppConstants.DATASYNC_TIMEOUT_COOLDOWN_MS
            alarmManager?.setAndAllowWhileIdle(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                restartTime,
                restartPendingIntent,
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to schedule delayed restart: ${e.message}")
        }
    }

    private fun pollForPendingSMS() {
        val deviceId = SharedPreferenceHelper.getSharedPreferenceString(
            applicationContext,
            AppConstants.SHARED_PREFS_DEVICE_ID_KEY,
            "",
        ) ?: ""
        val apiKey = SharedPreferenceHelper.getSharedPreferenceString(
            applicationContext,
            AppConstants.SHARED_PREFS_API_KEY_KEY,
            "",
        ) ?: ""
        val gatewayEnabled = SharedPreferenceHelper.getSharedPreferenceBoolean(
            applicationContext,
            AppConstants.SHARED_PREFS_GATEWAY_ENABLED_KEY,
            false,
        )

        if (deviceId.isEmpty() || apiKey.isEmpty() || !gatewayEnabled) {
            Log.d(TAG, "Skipping poll - device not configured or gateway disabled")
            scheduleNextPoll()
            return
        }

        ApiManager.getApiService().getPendingSMS(deviceId, apiKey, 10)
            .enqueue(object : Callback<PendingSMSResponseDTO> {
                override fun onResponse(
                    call: Call<PendingSMSResponseDTO>,
                    response: Response<PendingSMSResponseDTO>,
                ) {
                    val body = response.body()
                    val data = body?.data
                    if (!response.isSuccessful || data == null) {
                        Log.e(TAG, "Failed to fetch pending SMS: ${response.code()}")
                        if (response.code() == 401 || response.code() == 403) {
                            val consecutiveAuthFailures = incrementConsecutiveAuthFailures()
                            if (consecutiveAuthFailures >= MAX_CONSECUTIVE_AUTH_FAILURES) {
                                stopPolling()
                                showAuthErrorNotification()
                                return
                            }
                        }
                        scheduleNextPoll()
                        return
                    }

                    resetConsecutiveAuthFailures()
                    data.messages?.forEach { sendSMS(it) }
                    scheduleNextPoll()
                }

                override fun onFailure(call: Call<PendingSMSResponseDTO>, t: Throwable) {
                    Log.e(TAG, "Error polling for pending SMS: ${t.message}")
                    scheduleNextPoll()
                }
            })
    }

    private fun incrementConsecutiveAuthFailures(): Int {
        val failures = SharedPreferenceHelper.getSharedPreferenceInt(
            applicationContext,
            AppConstants.SHARED_PREFS_CONSECUTIVE_AUTH_FAILURES_KEY,
            0,
        ) + 1
        SharedPreferenceHelper.setSharedPreferenceInt(
            applicationContext,
            AppConstants.SHARED_PREFS_CONSECUTIVE_AUTH_FAILURES_KEY,
            failures,
        )
        return failures
    }

    private fun resetConsecutiveAuthFailures() {
        SharedPreferenceHelper.setSharedPreferenceInt(
            applicationContext,
            AppConstants.SHARED_PREFS_CONSECUTIVE_AUTH_FAILURES_KEY,
            0,
        )
    }

    private fun sendSMS(smsPayload: SMSPayload?) {
        if (smsPayload == null) return
        val recipients = smsPayload.recipients ?: smsPayload.receivers ?: return
        val message = smsPayload.message ?: smsPayload.smsBody ?: return
        val smsId = smsPayload.smsId ?: return
        val smsBatchId = smsPayload.smsBatchId ?: ""
        val preferredSim = SharedPreferenceHelper.getSharedPreferenceInt(
            applicationContext,
            AppConstants.SHARED_PREFS_PREFERRED_SIM_KEY,
            -1,
        )

        recipients.forEach { recipient ->
            if (preferredSim == -1) {
                SMSHelper.sendSMS(recipient, message, smsId, smsBatchId, applicationContext)
            } else {
                SMSHelper.sendSMSFromSpecificSim(
                    recipient,
                    message,
                    preferredSim,
                    smsId,
                    smsBatchId,
                    applicationContext,
                )
            }
        }
    }

    private fun showAuthErrorNotification() {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                AUTH_ERROR_CHANNEL_ID,
                "Authentication Errors",
                NotificationManager.IMPORTANCE_HIGH,
            )
            channel.description = "Alerts when your API key is invalid or revoked"
            notificationManager.createNotificationChannel(channel)
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val notification = NotificationCompat.Builder(this, AUTH_ERROR_CHANNEL_ID)
            .setContentTitle("TextBee: Invalid API Key")
            .setContentText("Your API key is invalid or revoked. Tap to enter a new key.")
            .setStyle(
                NotificationCompat.BigTextStyle().bigText(
                    "Your API key is invalid or revoked. SMS gateway has stopped polling. Open the app, generate a new API key from the web dashboard, and tap Register.",
                ),
            )
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        notificationManager.notify(AUTH_ERROR_NOTIFICATION_ID, notification)
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun createNotification(): Notification {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "SMS Gateway Service",
                NotificationManager.IMPORTANCE_LOW,
            ).apply {
                enableVibration(false)
                setShowBadge(false)
                description = "Keeps the SMS gateway active in background"
            }
            notificationManager.createNotificationChannel(channel)
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

        return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle("TextBee Active")
            .setContentText("SMS gateway polling every 15 seconds")
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setSmallIcon(R.mipmap.ic_launcher)
            .build()
    }
}
