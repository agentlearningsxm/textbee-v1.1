package com.vernu.sms.helpers

/** A locked build may use only its selected, currently active carrier. */
internal object SimPolicy {
    fun resolve(requestedId: Int, preferredId: Int, active: List<Pair<Int, String>>, carrier: String): Int? {
        if (preferredId < 0 || (requestedId != -1 && requestedId != preferredId)) return null
        return preferredId.takeIf { id ->
            active.any { (subscriptionId, name) -> subscriptionId == id && name.trim().equals(carrier, ignoreCase = true) }
        }
    }
}
