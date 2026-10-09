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
import android.os.PowerManager
import android.os.SystemClock
import android.util.Log
import androidx.core.app.NotificationCompat
import com.vernu.sms.ApiManager
import com.vernu.sms.AppConstants
import com.vernu.sms.R
import com.vernu.sms.activities.MainActivity
import com.vernu.sms.dtos.PendingSMSResponseDTO
import com.vernu.sms.helpers.DeviceLog
import com.vernu.sms.helpers.SharedPreferenceHelper
import com.vernu.sms.models.SMSPayload
import com.vernu.sms.receivers.AlarmReceiver
import com.vernu.sms.workers.SmsSendWorker
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import java.util.concurrent.TimeUnit

class StickyNotificationService : Service() {
    companion object {
        private const val TAG = "StickyNotificationService"
        private const val NOTIFICATION_CHANNEL_ID = "stickyNotificationChannel"
        private const val AUTH_ERROR_CHANNEL_ID = "authErrorChannel"
        private const val NOTIFICATION_ID = 1
        private const val AUTH_ERROR_NOTIFICATION_ID = 2
        private const val POLLING_INTERVAL_MS = 15_000L
        private const val MAX_CONSECUTIVE_AUTH_FAILURES = 5
        private const val POLL_WAKE_LOCK_TIMEOUT_MS = 30_000L
        private const val POLL_CALL_TIMEOUT_SECONDS = 25L

        private fun pollPendingIntent(context: Context): PendingIntent = PendingIntent.getBroadcast(
            context,
            0,
            Intent(context, AlarmReceiver::class.java).apply { action = AlarmReceiver.ACTION_POLL_SMS },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        // The poll chain runs only while both the gateway and its notification are on.
        @JvmStatic
        fun shouldRun(context: Context): Boolean =
            SharedPreferenceHelper.getSharedPreferenceBoolean(
                context, AppConstants.SHARED_PREFS_STICKY_NOTIFICATION_ENABLED_KEY, false,
            ) && SharedPreferenceHelper.getSharedPreferenceBoolean(
                context, AppConstants.SHARED_PREFS_GATEWAY_ENABLED_KEY, false,
            )

        // Also called by AlarmReceiver when it cannot start the service, so one
        // rejected start does not end the poll chain.
        @JvmStatic
        fun schedulePoll(context: Context) {
            val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val pendingIntent = pollPendingIntent(context)
            val triggerAtMillis = SystemClock.elapsedRealtime() + POLLING_INTERVAL_MS

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
    }

    private var isPolling = false
    private var pollInFlight = false
    private val pollWakeLock by lazy {
        (getSystemService(Context.POWER_SERVICE) as PowerManager)
            .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "textbee:poll")
            .apply { setReferenceCounted(false) }
    }

    override fun onBind(intent: Intent?): IBinder? {
        Log.i(TAG, "Service onBind ${intent?.action}")
        return null
    }

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "Service onCreate")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.i(TAG, "onStartCommand - startId: $startId, action: ${intent?.action}")

        if (!shouldRun(applicationContext)) {
            Log.i(TAG, "Gateway or sticky notification disabled, stopping service")
            stopPolling()
            stopSelf()
            return START_NOT_STICKY
        }

        try {
            val notification = createNotification()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // remoteMessaging has no daily limit; dataSync stops after 6 hours a day on Android 15+.
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_REMOTE_MESSAGING,
                )
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
            Log.i(TAG, "Started foreground service with sticky notification")
        } catch (e: Exception) {
            Log.w(TAG, "Cannot start foreground service: ${e.message}")
            schedulePoll(this) // retry later instead of ending the poll chain
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
        // Keep a retry alarm armed (e.g. after a refused foreground start) unless the
        // user turned the gateway or its notification off; AlarmReceiver re-checks too.
        isPolling = false
        if (!shouldRun(applicationContext)) stopPolling()
        releasePollWakeLock()
        Log.i(TAG, "StickyNotificationService destroyed")
    }

    private fun scheduleNextPoll() {
        if (isPolling) schedulePoll(this)
    }

    private fun stopPolling() {
        isPolling = false
        (getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(pollPendingIntent(this))
    }

    private fun pollForPendingSMS() {
        // Arm the next alarm first. If the phone sleeps during the request, the
        // chain must not depend on a reply arriving.
        scheduleNextPoll()
        if (pollInFlight) return
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
            return
        }

        pollInFlight = true
        // Keep the CPU awake until the reply is handled; the alarm's own wake
        // ends as soon as AlarmReceiver returns.
        pollWakeLock.acquire(POLL_WAKE_LOCK_TIMEOUT_MS)
        try {
            enqueuePoll(deviceId, apiKey)
        } catch (e: Exception) {
            // Otherwise pollInFlight would stay set and every later poll would be skipped.
            pollInFlight = false
            releasePollWakeLock()
            Log.e(TAG, "Could not start pending SMS poll: ${e.message}")
        }
    }

    private fun enqueuePoll(deviceId: String, apiKey: String) {
        val call = ApiManager.getApiService().getPendingSMS(deviceId, apiKey, 10)
        // Bound the whole call so a stalled request cannot keep pollInFlight set.
        call.timeout().timeout(POLL_CALL_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        call.enqueue(object : Callback<PendingSMSResponseDTO> {
            override fun onResponse(
                call: Call<PendingSMSResponseDTO>,
                response: Response<PendingSMSResponseDTO>,
            ) {
                pollInFlight = false
                try {
                    val data = response.body()?.data
                    if (!response.isSuccessful || data == null) {
                        Log.e(TAG, "Failed to fetch pending SMS: ${response.code()}")
                        if (isPolling && (response.code() == 401 || response.code() == 403)) {
                            val consecutiveAuthFailures = incrementConsecutiveAuthFailures()
                            if (consecutiveAuthFailures >= MAX_CONSECUTIVE_AUTH_FAILURES) {
                                stopPolling()
                                showAuthErrorNotification()
                            }
                        }
                        return
                    }

                    resetConsecutiveAuthFailures()
                    // The server already marked these dispatched, so hand them
                    // over even if polling stopped while the request was out.
                    data.messages?.forEach {
                        try {
                            sendSMS(it)
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to queue polled SMS ${it?.smsId}: ${e.message}")
                        }
                    }
                } finally {
                    releasePollWakeLock()
                }
            }

            override fun onFailure(call: Call<PendingSMSResponseDTO>, t: Throwable) {
                pollInFlight = false
                Log.e(TAG, "Error polling for pending SMS: ${t.message}")
                releasePollWakeLock()
            }
        })
    }

    private fun releasePollWakeLock() {
        if (pollWakeLock.isHeld) pollWakeLock.release()
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
        val receivedAt = System.currentTimeMillis()
        val count = smsPayload.forEachSend { recipient, message, smsId, smsBatchId, simId ->
            SmsSendWorker.enqueue(
                applicationContext, recipient, message, smsId, smsBatchId, simId, receivedAt
            )
        }
        DeviceLog.log(applicationContext, "poll_received", "$count recipient(s)", smsPayload.smsId)
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
