package com.vernu.sms;

import com.vernu.sms.services.GatewayApiService;

import java.io.IOException;

import okhttp3.Interceptor;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class ApiManager {
    private static GatewayApiService apiService;

    public static GatewayApiService getApiService() {
        if (apiService == null) {
            apiService = createApiService();
        }
        return apiService;
    }

    /** Shared by Java and Kotlin clients; selfhosted explicitly selects polling. */
    static OkHttpClient createHttpClient() {
        return createHttpClient(BuildConfig.FLAVOR);
    }

    static OkHttpClient createHttpClient(String flavor) {
        return new OkHttpClient.Builder()
                .addInterceptor(new Interceptor() {
                    @Override
                    public Response intercept(Chain chain) throws IOException {
                        Request.Builder request = chain.request()
                                .newBuilder()
                                .header(AppConstants.CLIENT_HEADER, AppConstants.CLIENT_NAME);
                        if ("selfhosted".equals(flavor)) {
                            request.header("X-Textbee-Transport", "poll");
                        }
                        return chain.proceed(request.build());
                    }
                })
                .build();
    }

    private static GatewayApiService createApiService() {
        Retrofit retrofit = new Retrofit.Builder()
                .baseUrl(AppConstants.API_BASE_URL)
                .client(createHttpClient())
                .addConverterFactory(GsonConverterFactory.create())
                .build();

        return retrofit.create(GatewayApiService.class);
    }
}
