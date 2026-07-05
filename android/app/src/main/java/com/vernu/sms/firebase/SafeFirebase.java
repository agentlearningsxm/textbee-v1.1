package com.vernu.sms.firebase;

import android.content.Context;
import android.content.res.Resources;
import android.util.Log;

import com.google.firebase.crashlytics.FirebaseCrashlytics;
import com.google.firebase.messaging.FirebaseMessaging;
import com.vernu.sms.BuildConfig;

import java.util.Map;

public final class SafeFirebase {
    private static final String TAG = "SafeFirebase";
    private static final String SELFHOSTED_FLAVOR = "selfhosted";
    private static final String PLACEHOLDER_API_KEY = "placeholder-selfhosted-build-only";

    private SafeFirebase() {
    }

    public interface FcmTokenCallback {
        void onToken(String token);
    }

    public static boolean isFirebaseEnabled(Context context) {
        if (SELFHOSTED_FLAVOR.equalsIgnoreCase(BuildConfig.FLAVOR)) {
            return false;
        }
        return !hasPlaceholderFirebaseConfig(context);
    }

    public static void getFcmToken(Context context, FcmTokenCallback callback) {
        if (callback == null) {
            return;
        }
        if (!isFirebaseEnabled(context)) {
            Log.i(TAG, "Firebase disabled for this build/config; FCM token unavailable");
            callback.onToken(null);
            return;
        }

        try {
            FirebaseMessaging.getInstance().getToken()
                    .addOnCompleteListener(task -> {
                        if (task.isSuccessful()) {
                            callback.onToken(task.getResult());
                        } else {
                            Log.w(TAG, "Failed to obtain FCM token", task.getException());
                            callback.onToken(null);
                        }
                    });
        } catch (Exception e) {
            Log.w(TAG, "Firebase Messaging unavailable", e);
            callback.onToken(null);
        }
    }

    public static void setCrashlyticsCustomKey(Context context, String key, Object value) {
        if (!isFirebaseEnabled(context)) {
            return;
        }

        try {
            setCustomKey(FirebaseCrashlytics.getInstance(), key, value);
        } catch (Exception e) {
            Log.w(TAG, "Crashlytics unavailable for custom key: " + key, e);
        }
    }

    public static void logException(Throwable throwable, String message, Map<String, Object> customData) {
        Log.e(TAG, message, throwable);

        if (!isFirebaseEnabled(null)) {
            return;
        }

        try {
            FirebaseCrashlytics crashlytics = FirebaseCrashlytics.getInstance();
            crashlytics.log(message);

            if (customData != null) {
                for (Map.Entry<String, Object> entry : customData.entrySet()) {
                    setCustomKey(crashlytics, entry.getKey(), entry.getValue());
                }
            }

            crashlytics.recordException(throwable);
        } catch (Exception e) {
            Log.e(TAG, "Error logging exception to Crashlytics", e);
        }
    }

    private static boolean hasPlaceholderFirebaseConfig(Context context) {
        if (context == null) {
            return false;
        }

        try {
            Resources resources = context.getResources();
            int apiKeyId = resources.getIdentifier("google_api_key", "string", context.getPackageName());
            return apiKeyId != 0 && PLACEHOLDER_API_KEY.equals(resources.getString(apiKeyId));
        } catch (Exception e) {
            Log.w(TAG, "Unable to inspect Firebase config resources", e);
            return false;
        }
    }

    private static void setCustomKey(FirebaseCrashlytics crashlytics, String key, Object value) {
        if (value == null) {
            return;
        }

        if (value instanceof String) {
            crashlytics.setCustomKey(key, (String) value);
        } else if (value instanceof Boolean) {
            crashlytics.setCustomKey(key, (Boolean) value);
        } else if (value instanceof Integer) {
            crashlytics.setCustomKey(key, (Integer) value);
        } else if (value instanceof Long) {
            crashlytics.setCustomKey(key, (Long) value);
        } else if (value instanceof Float) {
            crashlytics.setCustomKey(key, (Float) value);
        } else if (value instanceof Double) {
            crashlytics.setCustomKey(key, (Double) value);
        } else {
            crashlytics.setCustomKey(key, value.toString());
        }
    }
}
