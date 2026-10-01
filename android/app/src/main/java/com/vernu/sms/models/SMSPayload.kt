package com.vernu.sms.models

class SMSPayload {
    var recipients: Array<String>? = null
    var message: String? = null
    var smsId: String? = null
    var smsBatchId: String? = null
    var simSubscriptionId: Int? = null

    // Legacy fields — no longer actively used but kept for backward compatibility
    var receivers: Array<String>? = null
    var smsBody: String? = null

    // Both polling contracts feed the same worker as a push, including the
    // server-selected SIM and stable IDs required for recovery deduplication.
    fun forEachSend(enqueue: (String, String, String, String?, Int?) -> Unit): Int {
        val id = smsId?.takeIf { it.isNotBlank() } ?: return 0
        val text = message ?: smsBody ?: return 0
        val targets = recipients ?: receivers ?: return 0
        var count = 0
        for (recipient in targets) {
            if (recipient.isNullOrBlank()) continue
            enqueue(recipient, text, id, smsBatchId, simSubscriptionId)
            count++
        }
        return count
    }
}
