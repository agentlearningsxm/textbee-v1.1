package com.vernu.sms;

import com.vernu.sms.services.GatewayApiService;
import org.junit.Test;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import okhttp3.OkHttpClient;
import okhttp3.Protocol;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;

public class ApiManagerTest {
    @Test
    public void createsConfiguredServiceWithoutMakingNetworkRequest() {
        GatewayApiService service = ApiManager.getApiService();
        assertNotNull(service);
        assertEquals(AppConstants.API_BASE_URL + "gateway/devices/local-test-device/pending-sms?limit=10",
                service.getPendingSMS("local-test-device", "local-test-key", 10).request().url().toString());
    }

    @Test
    public void pollingTransportHeaderIsExclusiveToSelfhosted() throws Exception {
        for (String flavor : new String[]{"selfhosted", "prod", "dev"}) {
            verifyHeaders(ApiManager.createHttpClient(flavor), "selfhosted".equals(flavor));
        }
        verifyHeaders(ApiManager.createHttpClient(), "selfhosted".equals(BuildConfig.FLAVOR));
    }

    private void verifyHeaders(OkHttpClient client, boolean polling) throws Exception {
        // Terminal application interceptor returns locally before DNS or a socket.
        OkHttpClient localClient = client.newBuilder().addInterceptor(chain -> {
            assertEquals(AppConstants.CLIENT_NAME, chain.request().header(AppConstants.CLIENT_HEADER));
            if (polling) assertEquals("poll", chain.request().header("X-Textbee-Transport"));
            else assertNull(chain.request().header("X-Textbee-Transport"));
            return new Response.Builder().request(chain.request()).protocol(Protocol.HTTP_1_1)
                    .code(200).message("OK").body(ResponseBody.create(null, new byte[0])).build();
        }).build();
        try (Response response = localClient.newCall(new Request.Builder().url("https://local-test.invalid/").build()).execute()) {
            assertEquals(200, response.code());
        }
    }
}
