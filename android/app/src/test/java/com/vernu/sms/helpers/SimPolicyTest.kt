package com.vernu.sms.helpers

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class SimPolicyTest {
    @Test fun onlySelectedActiveRequiredCarrierCanSend() {
        val active = listOf(2 to "Odido", 3 to "hollandsnieuwe")
        fun resolve(requested: Int, preferred: Int, sims: List<Pair<Int, String>> = active) =
            SimPolicy.resolve(requested, preferred, sims, "hollandsnieuwe")
        assertEquals(3, resolve(3, 3))
        assertEquals(3, resolve(-1, 3))
        assertNull(resolve(2, 3))
        assertNull(resolve(3, 2))
        assertNull(resolve(-1, -1))
        assertNull(resolve(-1, 2))
        assertNull(resolve(3, 3, listOf(2 to "Odido")))
        assertNull(resolve(3, 3, listOf(3 to "Odido")))
        assertNull(resolve(3, 3, listOf(3 to "")))
        assertNull(resolve(99, 3))
        assertNull(resolve(3, 3, emptyList()))
        assertEquals(7, resolve(7, 7, listOf(7 to "HOLLANDSNIEUWE")))
    }
}
