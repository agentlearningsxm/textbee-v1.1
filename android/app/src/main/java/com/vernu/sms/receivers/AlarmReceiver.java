package com.vernu.sms.receivers;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import com.vernu.sms.services.StickyNotificationService;

/**
 * Receives AlarmManager callbacks to trigger SMS polling even in Doze mode.
 * This is critical for background operation on Android 6+.
 */
public class AlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "AlarmReceiver";
    public static final String ACTION_POLL_SMS = "com.vernu.sms.ACTION_POLL_SMS";

    public static final String ACTION_RESTART_SERVICE = "com.vernu.sms.RESTART_SERVICE";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();

        if (ACTION_POLL_SMS.equals(action) || ACTION_RESTART_SERVICE.equals(action)) {
            Log.d(TAG, "Alarm received, action: " + action);

            // Send intent to service to poll now (or restart after timeout)
            Intent serviceIntent = new Intent(context, StickyNotificationService.class);
            serviceIntent.setAction(ACTION_POLL_SMS);

            // Use startForegroundService on Android O+ since we're starting from a broadcast
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent);
                } else {
                    context.startService(serviceIntent);
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed to start service: " + e.getMessage());
            }
        }
    }
}
