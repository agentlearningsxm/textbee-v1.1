package com.vernu.sms.dtos

class HeartbeatResponseDTO {
    @JvmField var success: Boolean = false
    @JvmField var fcmTokenUpdated: Boolean = false
    // The API returns an ISO date string; a numeric field fails Gson parsing.
    @JvmField var lastHeartbeat: String? = null
    @JvmField var name: String? = null
}
