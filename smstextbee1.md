# TextBee Final Configuration Guide

This document is the **Master Configuration Reference** for deploying TextBee to the Cloud (Vercel + Render) and running it locally.

---

## 1. Environment Variable Reference

### A. Frontend (Vercel / Local Web)
These variables control the User Interface and Authentication.

| Variable | Local Value (`web/.env.local`) | Cloud Value (Vercel) | Purpose |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | `https://YOUR_WEB_URL` | Base URL of the frontend. |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:3001/api/v1` | `https://your-api.onrender.com/api/v1` | URL of the Backend API. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `[Your Google Client ID]` | `[Your Google Client ID]` | For "Sign in with Google". |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | `0x4AAAAAACLmNM_H0quTJUCj` | `0x4AAAAAACLmNM_H0quTJUCj` | Cloudflare Turnstile Public Key. |
| `AUTH_SECRET` | `secret` | `[Generate Random String]` | Encryption key for user sessions. |

### B. Backend (Render / Local API)
These variables control the Database, API Logic, and Background Jobs.

| Variable | Local Value (`api/.env`) | Cloud Value (Render) | Purpose |
| :--- | :--- | :--- | :--- |
| `PORT` | `3001` | `10000` (Automatic on Render) | Port the server listens on. |
| `FRONTEND_URL` | `http://localhost:3000` | `https://YOUR_WEB_URL` | URL to redirect users to (e.g., verify email). |
| `MONGO_URI` | `mongodb://localhost:27017/textbee` | `mongodb+srv://...` | Connection string for MongoDB Atlas. |
| `JWT_SECRET` | `supersecret` | `[Generate Random String]` | Signing key for Access Tokens. |
| `CLOUDFLARE_TURNSTILE_SECRET_KEY` | `0x4AAAAAACLmNOGoy7chvqpX-5Wmj8Iu3ag` | `0x4AAAAAACLmNOGoy7chvqpX-5Wmj8Iu3ag` | Cloudflare Turnstile Private Key. |
| `USE_SMS_QUEUE` | `false` | `false` | Set to `true` only if you have Redis. |

---

## 2. Cloud Configuration Steps

### Step 1: Google Cloud Setup
1.  Go to **[Google Cloud Console](https://console.cloud.google.com/apis/credentials)**.
2.  Edit your **OAuth 2.0 Client ID**.
3.  **Authorized JavaScript origins:**
    *   Add your Vercel URL: `https://YOUR_WEB_URL`
4.  **Authorized redirect URIs:**
    *   Add: `https://YOUR_WEB_URL/api/auth/callback/google`

### Step 2: Vercel (Frontend) Setup
1.  Deploy your `web` folder to Vercel.
2.  Go to **Settings -> Environment Variables**.
3.  Add all variables from the **Frontend Table** above (use the **Cloud Value** column).
    *   **CRITICAL:** Ensure `NEXT_PUBLIC_API_BASE_URL` points to your **Render** URL, not localhost.

### Step 3: Render (Backend) Setup
1.  Deploy your `api` folder to Render (Node.js Service).
2.  Go to **Environment**.
3.  Add all variables from the **Backend Table** above (use the **Cloud Value** column).
    *   **CRITICAL:** Ensure `FRONTEND_URL` points to `https://YOUR_WEB_URL`.

---

## 3. Mobile App Troubleshooting

**Issue:** "My mobile app is still on self host and it doesn't even work now."

**Cause:**
The mobile app APK is hardcoded to look for the API at a specific address. If you built it while referencing `localhost`, it will fail on a real device. If you built it referencing an old IP, it will fail if that IP changes.

**Fix:**
1.  **Open Android Project:** Go to the `android` folder in Android Studio.
2.  **Locate API URL Config:** Search for where the API URL is defined (usually `build.gradle` or a constant file like `ApiConstants.java` or `strings.xml`).
3.  **Update URL:** Change the base URL to your **Cloud API URL** (e.g., `https://textbee-api.onrender.com/api/v1`).
4.  **Rebuild APK:** Build a fresh APK (`Build -> Build Bundle(s) / APK(s) -> Build APK(s)`).
5.  **Install:** Install this new APK on your phone. It will now talk to the Cloud API.
