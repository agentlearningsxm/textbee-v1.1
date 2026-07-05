package com.vernu.sms

import com.vernu.sms.BuildConfig

/**
 * Single source of truth for web/dashboard URLs.
 *
 * Functional routes (register, dashboard, account, download) resolve to the configured
 * [BuildConfig.WEB_BASE_URL] so self-hosted builds send users to the operator's own dashboard
 * rather than the upstream hosted site.
 *
 * Routes that have no self-hosted equivalent (docs, privacy-policy, terms-of-service, pricing)
 * fall back to the upstream project site so the user still lands somewhere useful.
 */
object WebUrls {
    private val webBaseUrl: String = BuildConfig.WEB_BASE_URL.trimEnd('/')

    /**
     * Upstream project site. Used for docs / legal / marketing pages that are not part of
     * the self-hosted web bundle, and as a generic brand URL.
     */
    const val UPSTREAM_BASE_URL: String = "https://textbee.dev"

    fun buildWebUrl(path: String): String {
        val normalized = if (path.startsWith("/")) path else "/$path"
        return webBaseUrl + normalized
    }

    fun register(): String = buildWebUrl("/register")

    fun dashboard(): String = buildWebUrl("/dashboard")

    fun dashboardAccount(): String = buildWebUrl("/dashboard/account")

    fun download(currentVersion: String? = null): String {
        val base = buildWebUrl("/download")
        return if (currentVersion.isNullOrBlank()) base
        else "$base?currentVersion=${android.net.Uri.encode(currentVersion)}"
    }

    fun dashboardAccountGetSupport(): String = buildWebUrl("/dashboard/account/get-support")

    /** Upstream-only pages — no self-host equivalent; keep pointing at the project site. */
    fun docs(): String = "$UPSTREAM_BASE_URL/docs"

    fun privacyPolicy(): String = "$UPSTREAM_BASE_URL/privacy-policy"

    fun termsOfService(): String = "$UPSTREAM_BASE_URL/terms-of-service"

    fun pricing(): String = "$UPSTREAM_BASE_URL/pricing"
}
