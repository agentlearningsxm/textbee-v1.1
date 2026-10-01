package com.vernu.sms.dtos;

import com.google.gson.Gson;
import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

public class LegacyHeartbeatResponseDTOTest {
    private final Gson gson = new Gson();

    @Test
    public void parsesIsoTimestampFromHeartbeatResponse() {
        HeartbeatResponseDTO response = gson.fromJson(
                "{\"success\":true,\"fcmTokenUpdated\":true,"
                        + "\"lastHeartbeat\":\"2026-09-21T05:32:28.558Z\",\"name\":\"Test phone\"}",
                HeartbeatResponseDTO.class);

        assertTrue(response.success);
        assertTrue(response.fcmTokenUpdated);
        assertEquals("2026-09-21T05:32:28.558Z", response.lastHeartbeat);
        assertEquals("Test phone", response.name);
    }

    @Test
    public void preservesExplicitNullTimestampAndName() {
        HeartbeatResponseDTO response = gson.fromJson(
                "{\"success\":true,\"fcmTokenUpdated\":false,\"lastHeartbeat\":null,\"name\":null}",
                HeartbeatResponseDTO.class);

        assertTrue(response.success);
        assertFalse(response.fcmTokenUpdated);
        assertNull(response.lastHeartbeat);
        assertNull(response.name);
    }

    @Test
    public void acceptsMissingOptionalResponseFields() {
        HeartbeatResponseDTO response = gson.fromJson(
                "{\"success\":true}", HeartbeatResponseDTO.class);

        assertTrue(response.success);
        assertFalse(response.fcmTokenUpdated);
        assertNull(response.lastHeartbeat);
        assertNull(response.name);
    }
}
