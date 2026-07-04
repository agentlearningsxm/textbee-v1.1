---
type: session-log
project: my_textbee
date: 2026-07-04
session_number: 1
created_at: 2026-07-04T10:11:29+02:00
status: in-progress
outcome: partial
tags: [textbee, v2.8.0, merge, reviewer-fixes, android, self-host]
---

# v2.8.0 Merge Review Fixes - Partial, Web Localhost Verification Pending

## Goal of the Session

Continue the in-progress upstream TextBee `v2.8.0` merge on branch `upgrade/upstream-v2.8.0`, fix reviewer FAILs, preserve the custom self-host/admin/invite/Android behavior, and verify backend, web, Docker, and Android as far as the local machine allows.

## Outcome

Most reviewer FAILs were fixed and verified locally. Backend build passes, health route test passes, Docker config passes, Android selfhosted debug APK build passes, no conflict markers remain, and generated artifacts are staged for removal or ignored. Web build passed earlier, but the latest fresh web build failed because the local `web/node_modules` install is corrupt or incomplete. Final verification is still pending, so the merge must not be called done yet.

---

## What Was Done

### Baseline and Merge Hygiene

- Confirmed active branch: `upgrade/upstream-v2.8.0`.
- Re-ran merge safety checks:
  - `git status --short --branch`
  - `git diff --name-only --diff-filter=U`
  - `rg "<<<<<<<|=======|>>>>>>>" api android web .github docker-compose.yaml render.yaml`
  - `git diff --check`
- Result: no unmerged paths, no conflict markers, no whitespace errors beyond CRLF warnings.

### Backend/API Fixes

- Added `api/src/health.controller.ts`.
- Added `api/src/health.controller.spec.ts`.
- Registered `HealthController` in `api/src/app.module.ts`.
- Updated `render.yaml` health check from missing `/health` to real `/api/v1/health`.
- Preserved custom backend modules:
  - `AdminModule`
  - `InvitesModule`
  - `RegistrationRequestsModule`
  - `SeedModule`
  - Firebase fallback behavior
  - invite registration behavior
  - admin-created verified users

### Web/Self-Host Fixes

- Fixed status/API docs URL handling:
  - `web/config/routes.ts`
  - `web/app/(app)/dashboard/messaging/(components)/api-guide.tsx`
- Normalized `NEXT_PUBLIC_API_BASE_URL` so URLs do not duplicate `/api/v1`.
- Removed hosted `textbee-cloud.vercel.app` and hosted Render examples from active docs and web code.
- Reworked `web/app/download/page.tsx` so `/download` serves only the local bundled APK:
  - `/textbee-selfhosted.apk`
  - no GitHub release fetch
  - no external `browser_download_url`
- Kept `web/public/textbee-selfhosted.apk` tracked intentionally because `/download` serves it.

### Docker/Deploy/AppSec Fixes

- Updated `docker-compose.yaml` so missing `api/.env` and `web/.env` no longer break `docker compose config`.
- Updated Mongo URI to use the same `MONGO_ROOT_USER` and `MONGO_ROOT_PASS` values used to create Mongo.
- Bound admin/dev services to localhost by default:
  - MongoDB
  - Mongo Express
  - MailHog
  - Redis
- Left API and web ports exposed as expected.
- Staged removal of tracked secrets/artifacts:
  - `api/.env.bak`
  - `web/.env.bak`
  - `android/debug.keystore`
  - Android build logs
  - root deploy/debug JSON files
  - root APK artifact
  - empty `failed_job_logs.txt`

### Android Fixes

- Preserved `selfhosted` flavor in `android/app/build.gradle`.
- Preserved self-hosted API target in the Android flavor.
- Added `android/app/src/selfhosted/google-services.json` as a placeholder Firebase config for local self-hosted builds.
- Updated debug signing path to use `System.getProperty("user.home")` when Windows does not provide `HOME`.
- Generated local debug keystore at `C:\Users\agent\.android\debug.keystore`, outside the repo.
- Added `WEB_BASE_URL` per Android flavor and removed hosted Vercel dashboard/download links from Android UI.
- Fixed duplicate pending-SMS fetch risk in `StickyNotificationService.kt`.
- Fixed Kotlin smart-cast compile error by scheduling alarms with a non-null local `pendingIntent`.
- Changed auth circuit breaker to count both `401` and `403`.
- Persisted auth failure count through `SharedPreferenceHelper` so service restart does not reset it.
- Added Android 15 foreground-service dataSync timeout callback:
  - `onTimeout(startId: Int, fgsType: Int)`
- Updated Android `compileSdk` and `targetSdk` to `35`.
- Added `android.suppressUnsupportedCompileSdk=35` because the project is still on Android Gradle Plugin `8.2.2`.
- Installed local toolchain on C:
  - JDK: `C:\Tools\jdk-17` (Temurin 17.0.19)
  - Android SDK: `C:\Android\Sdk`
  - SDK packages: `platform-tools`, `platforms;android-35`, `build-tools;35.0.0`

### Project Log Structure

- Migrated logs into month/day layout:
  - `logs/2026-07/2026-07-03/`
  - `logs/2026-07/2026-07-04/`
- Added README/index files:
  - `logs/README.md`
  - `logs/2026-07/README.md`
  - `logs/2026-07/2026-07-03/README.md`
  - `logs/2026-07/2026-07-04/README.md`
- Added this detailed session log.
- Adjusted `.gitignore` so Markdown project logs can be tracked while generated machine logs remain ignored.

### Latest Interruption and Process Correction

- Re-ran `pnpm run build` in `web` after Android fixes.
- Latest web build failed with a missing Next.js worker file:
  - `web/node_modules/.pnpm/next@14.2.26_.../node_modules/next/dist/compiled/jest-worker/processChild.js`
- Started `pnpm install --frozen-lockfile --ignore-scripts --force --reporter=append-only` to repair `web/node_modules`.
- User interrupted that install because it was taking too long.
- Checked for leftover processes and found two aborted install processes:
  - PID `49580`: `pnpm.mjs install --frozen-lockfile --ignore-scripts --force --reporter=append-only`
  - PID `21072`: `pnpm.cjs install --frozen-lockfile --ignore-scripts --force --reporter=append-only`
- Stopped only those two process IDs. Unrelated Node processes for Codex, GitNexus, MongoDB MCP, and Google Workspace CLI were left running.
- User corrected process: after every failure, research first instead of guessing. This is now the required next-session workflow.
- Added continuation prompt: `logs/2026-07/2026-07-04/continue-prompt-v280-localhost-research-first.md`.

---

## What Worked - Verified

- `pnpm run build` in `api` passed.
- `node node_modules\jest\bin\jest.js --runTestsByPath src\health.controller.spec.ts --runInBand --forceExit` passed.
- `pnpm run build` in `web` passed earlier before the latest dependency corruption, but the latest fresh web verification failed. Treat web as not currently verified.
- `docker compose config` passed.
- `android\gradlew.bat :app:assembleSelfhostedDebug --no-daemon` passed with JDK 17 and Android SDK 35.
- `git diff --check` returned no whitespace errors after fixes, only CRLF warnings.
- Conflict marker scan returned no matches.
- Hosted GitHub release download path removed from `/download`.
- `logs/` structure now follows `YYYY-MM/YYYY-MM-DD/<title>.md`.

---

## What Didn't / What's Deferred

1. Web localhost verification is not currently passing. Latest failure is missing `next/dist/compiled/jest-worker/processChild.js` inside `web/node_modules`.
2. The attempted web reinstall was interrupted by the user and its two leftover `pnpm install` processes were stopped.
3. Final multi-layer reviewer verification is still pending after Android and URL fixes.
4. The selfhosted Firebase config is a placeholder. Replace it with a real Firebase config only if the private deployment needs Firebase Cloud Messaging.
5. No deploy, live SMS, commit, push, or folder archive was performed.

---

## Suggestions & Insights

### Patterns Noticed

- Running API and web installs in parallel on this D: workspace causes timeouts and broken `node_modules`. Sequential install/build is more reliable.
- Reviewer agents correctly found issues that main-thread checks missed, especially `/download` external release URLs and Android service timeout edge cases.
- `pnpm` version drift matters. The repo expects pnpm 9, but local global pnpm is 11.8.0, which changes build-script approval behavior.
- The latest issue is local dependency-state corruption, not proven app-code failure. Research `web/node_modules`, pnpm store, and original upstream install expectations before any new fix.

### Strategic Recommendations

- Keep JDK and Android SDK on C: and set `JAVA_HOME`, `ANDROID_HOME`, and `ANDROID_SDK_ROOT` before Android verification.
- Add a repeatable `verify-selfhost.ps1` script that runs backend build, web build, Docker config, URL scans, artifact scans, and Android build when JDK exists.
- Keep `/download` local-only for this fork unless there is an explicit release pipeline that uploads self-host APKs to the correct GitHub repo.
- Treat `web/public/textbee-selfhosted.apk` as an intentional downloadable release artifact until a better artifact pipeline exists.
- Next session should compare local self-host/localhost files against original upstream TextBee before changing code. Do not patch from guesses.

### Things To Avoid

- Do not run web/API installs in parallel on this machine.
- Do not trust staged state after a merge. Always compare `git status --short` and run `git diff --cached --stat`.
- Do not claim Android is verified from source scans. APK build requires JDK and Gradle.
- Do not reintroduce hosted TextBee URLs into self-host docs or dashboard flows unless they are explicitly labeled as examples.
- Do not run another long install command without first researching why `processChild.js` is missing and whether the install path, pnpm store, or Node version is the actual cause.

### Process Improvements

- Project logs should always use `logs/YYYY-MM/YYYY-MM-DD/` from now on.
- Each day should include a README that indexes that day's entries.
- Final merge check should include an AppSec/deploy scan for tracked artifacts and hosted URLs.
- After every failure, write a short log note before the next attempt: command, exact failure, research done, chosen fix, and next verification command.

---

## What's Next

1. Start next session by reading:
   - `logs/README.md`
   - `logs/2026-07/2026-07-04/README.md`
   - `logs/2026-07/2026-07-04/continue-prompt-v280-localhost-research-first.md`
   - this log file
2. Research the current web localhost failure before changing anything:
   - confirm Node version and pnpm version
   - inspect `web/node_modules/.pnpm/next.../dist/compiled/jest-worker/`
   - compare `web/package.json`, `web/pnpm-lock.yaml`, and upstream TextBee v2.8.0 web setup
   - determine whether to repair dependencies, use a clean install, or update local localhost config
3. Update the log after every failure and every fix attempt.
4. Re-run only the failed web localhost/build check after the researched fix.
5. After web is verified, rerun full verification: API build, health route test, web build, Docker config, conflict marker scan, hosted URL scan, Android APK build.
6. Only after final verification passes, decide whether to commit. Do not deploy or send live SMS without explicit approval.

---

## Files Touched

```text
api/src/health.controller.ts                         <- added Render/API health endpoint
api/src/health.controller.spec.ts                    <- added regression test for /api/v1/health
api/src/app.module.ts                                <- registered HealthController
render.yaml                                         <- health check path and pnpm build path
web/config/routes.ts                                <- self-host health URL
web/app/(app)/dashboard/messaging/(components)/api-guide.tsx <- self-host API docs URLs
web/app/download/page.tsx                           <- local-only APK download page
web/app/(app)/dashboard/(components)/community-links.tsx <- self-host share URLs
web/app/(app)/checkout/[planName]/page.tsx          <- neutral support message
web/app/(app)/contribute/page.tsx                   <- neutral support email placeholder
web/app/(app)/dashboard/(components)/account-deletion-alert.tsx <- neutral admin contact message
docker-compose.yaml                                 <- optional env files, safer dev bindings, credential consistency
.gitignore                                          <- artifact/log ignore policy plus Markdown project log exception
android/app/build.gradle                            <- compile/target SDK 35, selfhosted flavor preserved
android/app/src/selfhosted/google-services.json     <- placeholder selfhosted Firebase config for local builds
android/app/src/main/java/com/vernu/sms/AppConstants.java <- persisted auth failure preference key
android/app/src/main/java/com/vernu/sms/activities/MainActivity.java <- flavor-based dashboard/download URLs
android/app/src/main/java/com/vernu/sms/services/StickyNotificationService.kt <- polling/auth/timeout fixes
android/app/src/main/res/layout/activity_main.xml   <- self-host placeholder dashboard text
android/gradle.properties                           <- compile SDK 35 suppression for current AGP
README.md                                           <- self-host placeholder docs
DEPLOYMENT_GUIDE.md                                 <- self-host placeholder docs
ADMIN_PANEL_PLAN.md                                 <- self-host placeholder docs
ADMIN_PANEL_IMPLEMENTATION.md                       <- self-host placeholder docs
smstextbee1.md                                      <- self-host placeholder docs
logs/README.md                                      <- log convention
logs/2026-07/README.md                              <- month index
logs/2026-07/2026-07-03/README.md                   <- day index
logs/2026-07/2026-07-04/README.md                   <- day index
logs/2026-07/2026-07-04/2026-07-04-v280-merge-review-fixes.md <- detailed session log
logs/2026-07/2026-07-04/continue-prompt-v280-localhost-research-first.md <- next-session continuation prompt
```

---

## Reference

- Baton: `D:\Desktop\ReynubixBrain\30_System\Context\Batons\my_textbee\2026-07-03\baton-my-textbee-v280-merge-in-progress.md`
- Previous project log: `logs/2026-07/2026-07-03/my-textbee-v280-merge-handoff.md`
