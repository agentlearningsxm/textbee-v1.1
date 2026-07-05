---
type: handoff
project: my_textbee
date: 2026-07-05
status: 3-of-4-layers-green — Layer C blocked on APK launch crash
decision: "B — web on Vercel, API+MongoDB on Hostinger VPS/Coolify"
tags: [textbee, v2.8.0, deploy, handoff, hostinger, vercel, coolify, layer-c, crash]
related: ["[[baton-my-textbee-v280-deploy-in-progress]]", "[[2026-07-04-goal-and-verification-harness]]", "[[2026-07-04-plan-hostinger-vercel-deploy]]"]
---

# TextBee v2.8.0 Deploy — Full Handoff (2026-07-05)

## TL;DR
Deploy of TextBee v2.8.0 (Option B). **API + web are LIVE and verified.** 3 of 4 verification
layers pass. The ONLY remaining blocker: the rebuilt self-hosted Android APK **crashes on launch**
(Layer C), so we can't yet register a device + send the test SMS. Root cause NOT yet found — needs a
stack trace (no emulator/device available to this session). Firebase key rotation deferred by owner.

## What is DONE and VERIFIED (command evidence)

### Layer A — API — ✅ PASS
- Commit **`c6acb69`** (`c6acb698573ba8908ed46b693c50938d7f9223f3`) pushed to `origin/main` of
  `agentlearningsxm/textbee-v1.1` (fast-forward from 556be74; 210 files; secrets removed from tree;
  `api/src/health.controller.ts` present).
- Coolify app **`textbee-api`** (UUID `m14jfxxd994ptky569iteqse`) redeployed. Deployment id 14 =
  commit c6acb69, status **finished**.
- `https://textbee.srv1093654.hstgr.cloud/api/v1/health` → **200**, body `{"status":"ok"}` (stable 3×).
  Running container image tag = `c6acb69…` (≠ 556be74). Old container gone.
- How it was triggered: Coolify has **no GitHub webhook** (anonymous "Public GitHub" source, no App/
  deploy key) → pushes do NOT auto-deploy. Triggered via a self-issued Coolify API token (Artisan,
  then deleted). **Future API deploys = click Deploy in Coolify UI, or use a Coolify API token.**

### Layer B — Web — ✅ PASS
- Vercel project **`textbee-cloud`** was watching the WRONG repo (`agentlearningsxm/textbee-cloud`,
  private, stale). Re-pointed its Git to **`agentlearningsxm/textbee-v1.1` / main** (root dir already
  `web`). Future pushes to textbee-v1.1 main now auto-deploy the web.
- Prod deploy READY, aliased to `https://textbee-cloud.vercel.app`.
- Verified: `/login` 200; deployed bundle calls `textbee.srv1093654.hstgr.cloud` (in HTML + JS; no
  onrender/localhost); CORS preflight **204, `Access-Control-Allow-Origin: *`**.
- Fixed two stale env vars on the Vercel project (prod): `NEXT_PUBLIC_SITE_URL` and `NEXTAUTH_URL`
  were pointing at a dead `textbee-dashboard.vercel.app` → set to `https://textbee-cloud.vercel.app`;
  redeployed. `/api/auth/providers` now shows correct callback URLs (Google login IS configured).
  `NEXT_PUBLIC_API_BASE_URL` was already correct (VPS API).

### Layer D — App-sec / env — ✅ (except deferred rotation)
- Commit c6acb69 clean: no secret/artifact ADDED; `.env.bak` ×2, `debug.keystore`, stray apk,
  tunnel/CI logs all DELETED; `.gitignore` fences them. Independently audited (SHA256-verified APK).
- Env correct both sides: API `FRONTEND_URL` = vercel URL; web `NEXT_PUBLIC_API_BASE_URL` = VPS API;
  NEXTAUTH_URL / SITE_URL fixed.
- **DEFERRED by owner ("later"):** rotate the leaked Firebase service-account private key (was in
  `api/.env.bak`, public repo history at 556be74). See memory [[my-textbee-public-repo-secret-leak]].

## The ONE blocker — Layer C: APK crashes on launch

Owner installed the rebuilt self-hosted APK on his Samsung phone (had to uninstall the old one first).
On tap it flashes then closes with Android's generic: **"TextBee SelfHosted closed because this app
has a bug."** No stack trace captured yet.

### Facts established
- The rebuilt APK is correct otherwise: `BuildConfig` `API_BASE_URL=https://textbee.srv1093654.hstgr.cloud/api/v1/`,
  `WEB_BASE_URL=https://textbee-cloud.vercel.app`; served at `https://textbee-cloud.vercel.app/textbee-selfhosted.apk`
  (200, 20,341,311 bytes). The URL change canNOT cause a launch crash → this is a **v2.8.0 code bug**,
  likely never run on a device before (self-hosted flavor).
- Launcher = `.ui.splash.SplashActivity` (Compose; 400 ms delay → `route()` → fresh install has no
  deviceId → `OnboardingActivity`). `SMSGatewayApplication.onCreate` only inits WorkManager (try/caught,
  safe). `androidx.startup.InitializationProvider` is removed via `tools:node="remove"`.
- **Placeholder Firebase config:** `android/app/src/selfhosted/google-services.json` is a placeholder
  (`project_number 000000000000`, `mobilesdk_app_id 1:000000000000:android:0000…`, api_key
  `placeholder-selfhosted-build-only`). The `com.google.gms.google-services` plugin IS applied
  (app/build.gradle:3). App calls `FirebaseMessaging.getInstance().token` in `OnboardingViewModel.kt:181`,
  `MainActivity.java:513/692`, `HeartbeatHelper.kt`, `BootCompletedReceiver.kt`.

### Leading hypotheses (UNCONFIRMED — do NOT guess-fix; get the trace first)
1. Firebase auto-init or `FirebaseMessaging.getInstance().token` throwing at startup due to the
   placeholder google-services (fake project). Most likely surfaces in `OnboardingActivity` /
   `OnboardingViewModel` on fresh install.
2. A Compose / resource crash in `SplashActivity` or `OnboardingActivity` (`R.drawable.ic_app_logo`
   is a newly added webp — confirm it resolves at runtime; TextBeeTheme).
3. A Kotlin-migration runtime issue (Java→Kotlin in v2.8.0).

### NEXT STEP to unblock (in priority order)
1. **GET THE STACK TRACE.** This session has NO emulator/system-image installed (only
   `C:\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat`; no `emulator` package, no AVDs, no device
   via `adb devices`). Options:
   - **Emulator:** `sdkmanager "emulator" "system-images;android-34;google_apis;x86_64"` → `avdmanager
     create avd` → boot → `adb install -r app-selfhosted-debug.apk` → `adb logcat *:E` while launching →
     capture the `FATAL EXCEPTION`. Definitive, no owner loop. Heavy (~1 GB download + boot).
   - **Owner's device:** owner enables USB debugging, connects to a PC with adb, runs `adb logcat`.
   - **On-screen crash handler:** add `Thread.setDefaultUncaughtExceptionHandler` (or a debug crash
     screen) that shows/writes the exception, rebuild, owner reinstalls + screenshots the trace.
2. Root-cause from the trace, fix, rebuild the self-hosted APK, copy to `web/public/textbee-selfhosted.apk`,
   re-sync the download-page byte size, commit + push (Coolify not needed for the APK; Vercel serves it).
3. Owner reinstalls → registers device → sends 1 test SMS. Then verify Layer C from the VPS.

### Layer C VERIFY plan (once the app runs)
- API routes (all under `/api/v1/gateway`, auth-guarded): register `POST /gateway/devices`; send
  `POST /gateway/devices/:id/sendSMS`; device poll `GET …/pending-sms`; status `PATCH …/sms-status`.
- When owner sends: query MongoDB / API logs for the message going **pending → sent** + the device's
  poll/status calls. That is the command evidence to pass Layer C.

## Key facts / access
- **VPS/Coolify:** Hostinger `31.97.181.108` / `srv1093654.hstgr.cloud`, Coolify v4 at
  `http://31.97.181.108:8000`. **Coolify has 2 teams — the app is in the non-empty team** (the "empty
  dashboard" the owner saw was the wrong team selected).
- **SSH (Windows OpenSSH only):** `& "C:\Windows\System32\OpenSSH\ssh.exe" hostinger-vps '<bash>'` —
  outer PowerShell string SINGLE-quoted, bash DOUBLE-quotes inside. coolify-db:
  `docker exec coolify-db psql -U coolify -d coolify -c "SQL"`. Coolify app is Laravel container `coolify`.
- **Repos:** `agentlearningsxm/textbee-v1.1` (PUBLIC — API + web source now) and
  `agentlearningsxm/textbee-cloud` (PRIVATE, old web repo, now unused for deploy). Vault repo is
  `agentlearningsxm/reynubix-brain` (PRIVATE).
- **Credentials:** `D:\Desktop\ReynubixBrain\30_System\credentials\hostinger-secrets.md` (gitignored)
  has VPS/Coolify/TextBee creds incl. existing TextBee API key `6a1875e2-edb9-48b0-8802-c73a5883fa39`
  and device `69d824b7b5cd3ce4c708d041`. Owner pasted a Coolify token `1|OVbv…` in chat — advised to
  rotate/delete since it's now in transcript.
- **Android build:** `$env:JAVA_HOME="C:\Tools\jdk-17"; $env:ANDROID_HOME="C:\Android\Sdk"` then from
  `android/`: `.\gradlew.bat :app:assembleSelfhostedDebug --no-daemon`. Output at
  `android\app\build\outputs\apk\selfhosted\debug\app-selfhosted-debug.apk`. BuildConfig at
  `android\app\build\generated\source\buildConfig\selfhosted\debug\com\vernu\sms\BuildConfig.java`.

## Deferred / follow-ups (owner)
- Rotate the leaked Firebase key (Firebase console) + update API `FIREBASE_*` env in Coolify.
- Repo `textbee-v1.1` still PUBLIC. Going private will BREAK Coolify (anonymous clone) AND needs a
  Vercel GitHub-App access check — set up a Coolify deploy key first, then flip private.
- Email off on the API (`MAIL_HOST=PLACEHOLDER`) → invite/verification emails won't send; new dashboard
  signups blocked. Use existing account. Configure SMTP if invites must email.

## Verification harness (the /goal)
4 layers: A) VPS `/api/v1/health` 200 AND image != 556be74 ✅ · B) Vercel loads + hits VPS API + no
CORS ✅ · C) rebuilt APK registers a device + sends 1 SMS ❌ (crash) · D) no secret in commit + env
correct ✅ (Firebase rotation deferred).
