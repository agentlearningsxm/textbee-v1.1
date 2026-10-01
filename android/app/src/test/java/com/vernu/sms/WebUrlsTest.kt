package com.vernu.sms

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class WebUrlsTest {
    @Test
    fun `selfhosted never offers upstream purchases`() {
        assertFalse(WebUrls.canPurchasePlans("selfhosted"))
        assertFalse(WebUrls.canPurchasePlans("SELFHOSTED"))
        assertTrue(WebUrls.canPurchasePlans("cloud"))
    }
}
