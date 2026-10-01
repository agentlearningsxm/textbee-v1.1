package com.vernu.sms.models

import com.google.gson.Gson
import com.vernu.sms.dtos.PendingSMSResponseDTO
import com.vernu.sms.dtos.PendingMessagesResponseDTO
import org.junit.Assert.assertEquals
import org.junit.Test

class SMSPayloadTest {
    private val payload = """{"smsId":"sms-stable","smsBatchId":"batch-stable","message":"test","recipients":["+31000000000"],"simSubscriptionId":3}"""

    @Test fun bothPollingContractsPreserveRequestedSimAndStableIds() {
        val gson = Gson()
        val legacy = gson.fromJson("""{"data":{"count":1,"messages":[$payload]}}""", PendingSMSResponseDTO::class.java)
        val recovery = gson.fromJson("""{"data":[$payload]}""", PendingMessagesResponseDTO::class.java)
        for (message in listOf(legacy.data.messages.single(), recovery.data!!.single())) {
            var dispatched = 0
            assertEquals(1, message.forEachSend { phone, text, smsId, batchId, simId ->
                dispatched++
                assertEquals("+31000000000", phone)
                assertEquals("test", text)
                assertEquals("sms-stable", smsId)
                assertEquals("batch-stable", batchId)
                assertEquals(3, simId)
            })
            assertEquals(1, dispatched)
        }
    }

    @Test fun legacyPayloadAliasesRemainUsableWithoutOverridingSim() {
        val message = Gson().fromJson("""{"smsId":"stable","smsBody":"test","receivers":["+31000000000"],"simSubscriptionId":3}""", SMSPayload::class.java)
        assertEquals(1, message.forEachSend { _, text, _, _, simId ->
            assertEquals("test", text)
            assertEquals(3, simId)
        })
    }

    @Test fun malformedPayloadNeverReachesSendWorker() {
        val gson = Gson()
        for (json in listOf("{}", """{"smsId":"","message":"test","recipients":["+31000000000"]}""", """{"smsId":"stable","recipients":["+31000000000"]}""")) {
            assertEquals(0, gson.fromJson(json, SMSPayload::class.java).forEachSend { _, _, _, _, _ ->
                throw AssertionError("Malformed SMS was dispatched")
            })
        }
    }
}
