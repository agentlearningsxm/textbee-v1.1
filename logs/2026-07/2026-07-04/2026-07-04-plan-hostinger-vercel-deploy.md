---
type: execution-plan
project: my_textbee
date: 2026-07-04
status: ready-to-execute
decision: "B - frontend on Vercel, everything else on Hostinger VPS"
tags: [textbee, v2.8.0, deploy, hostinger, vercel, coolify, plan]
---

# Plan: Deploy TextBee v2.8.0 — Frontend on Vercel, Everything Else on Hostinger VPS

## Decision (confirmed by owner)
**Option B.** Web dashboard (Next.js) stays on **Vercel** (best home for Next.js, free, auto-deploy,
zero server upkeep). API + MongoDB + everything server-side stays on the **Hostinger VPS** (Coolify).
Phone app talks to the VPS API.

## Verified Current State (SSH + curl, 2026-07-04)
- **VPS**: Hostinger `31.97.181.108` / `srv1093654.hstgr.cloud`, Ubuntu 24.04, Coolify v4.
- **API is live on VPS**: Coolify app `textbee-api`, container port `3003`, Traefik
  `Host(textbee.srv1093654.hstgr.cloud)` → serves Swagger. BUT running image = commit `556be74` =
  **PRE the v2.8.0 merge** (`/api/v1/health` returns 404 — health route is in the uncommitted merge).
- **API env** already has `FRONTEND_URL=https://textbee-cloud.vercel.app` → **already correct for option B** (no change needed unless a new Vercel domain is used). Firebase configured; `REGISTRATION_MODE=approval_required`; `MAIL_HOST=PLACEHOLDER` (mail not really set up).
- **Web dashboard**: still on Vercel `https://textbee-cloud.vercel.app` (HTTP 200, alive) — this is the keeper for option B, but it serves OLD pre-merge code until redeployed.
- **Git**: `origin` = `github.com/agentlearningsxm/textbee-v1.1`. Both `main` and `upgrade/upstream-v2.8.0`
  are at `556be74`; the v2.8.0 merge is **uncommitted in the working tree**. Coolify (and presumably
  Vercel) build from `origin/main`.
- **SSH**: Git Bash ssh fails on the key (`libcrypto: unsupported`). Use **Windows OpenSSH**:
  `& "C:\Windows\System32\OpenSSH\ssh.exe" hostinger-vps '<cmd>'` (alias in ~/.ssh/config, key ~/.ssh/opencode-server).

## Already Done This Session (local, UNCOMMITTED — include in the commit)
- Fixed corrupt `web/node_modules` (clean reinstall from intact pnpm store). **Web build PASS.**
- Fresh verification ALL GREEN: web build, API build (`nest build`), health jest test, `docker compose config`, Android selfhosted APK build, git conflict/whitespace/unmerged/hosted-URL scans.
- `android/app/build.gradle` selfhosted flavor now:
  - `API_BASE_URL = "https://textbee.srv1093654.hstgr.cloud/api/v1/"` (VPS API — verified correct)
  - `WEB_BASE_URL = "https://textbee-cloud.vercel.app"` (Vercel dashboard — option B)
- `web/app/download/page.tsx` APK size constant updated to `20_341_307`.
- NOTE: `web/public/textbee-selfhosted.apk` currently has an APK built with the OLD `WEB_BASE_URL`
  (`app.textbee.srv1093654.hstgr.cloud`, from a superseded option-A attempt). **It MUST be rebuilt**
  (Step 4) so the served APK matches `WEB_BASE_URL = textbee-cloud.vercel.app`.

## Execution Plan (ALL steps are production / need owner approval)

### Step 1 — Rebuild the Android APK with the final Vercel WEB_BASE_URL
```
$env:JAVA_HOME="C:\Tools\jdk-17"; $env:ANDROID_HOME="C:\Android\Sdk"; $env:ANDROID_SDK_ROOT="C:\Android\Sdk"; $env:PATH="$env:JAVA_HOME\bin;$env:PATH"
cd D:\Desktop\ReynubixBrain\10_Projects\Active\my_textbee\android
.\gradlew.bat :app:assembleSelfhostedDebug --no-daemon
```
Then copy `android\app\build\outputs\apk\selfhosted\debug\app-selfhosted-debug.apk` →
`web\public\textbee-selfhosted.apk`. Verify generated `BuildConfig.java` shows
`WEB_BASE_URL="https://textbee-cloud.vercel.app"`. Update `web/app/download/page.tsx`
`SELFHOSTED_APK_SIZE_BYTES` if the new byte size differs.

### Step 2 — Commit the merge (scoped, NEVER `git add .`)
On `upgrade/upstream-v2.8.0`, stage the intended merge files + this session's changes
(build.gradle, download/page.tsx, web/public/textbee-selfhosted.apk, logs). Verify no
node_modules/dist/.next staged. Commit.

### Step 3 — Push to `main` → triggers auto-redeploys
Fast-forward/merge the branch into `main` and `git push origin main`.
- Coolify rebuilds `textbee-api` on the VPS with v2.8.0 (adds `/api/v1/health`).
- Vercel rebuilds the dashboard with v2.8.0 (IF the Vercel project is linked to this repo's `main`).

### Step 4 — Vercel env (dashboard → VPS API)
In the Vercel project, set/confirm:
- `NEXT_PUBLIC_API_BASE_URL = https://textbee.srv1093654.hstgr.cloud/api/v1`
- `NEXT_PUBLIC_SITE_URL = https://textbee-cloud.vercel.app`
Redeploy if changed.

### Step 5 — VPS API env (Coolify) — likely no change
`FRONTEND_URL` is already `https://textbee-cloud.vercel.app` (correct for B). Only change if a new
Vercel domain is chosen. Optionally configure real `MAIL_*` if email (invites/verification) must work.

### Step 6 — Verify end-to-end (fresh, after redeploys)
- `curl https://textbee.srv1093654.hstgr.cloud/api/v1/health` → **200** (proves v2.8.0 live, not 404).
- Load `https://textbee-cloud.vercel.app` → dashboard loads, login/admin/invites work, talks to VPS API (check browser network tab hits the hstgr.cloud API, no CORS error).
- Install the rebuilt APK on a phone → register device against the VPS API → send a test SMS.

## Open Confirmations Needed From Owner
1. Is the **Vercel project linked** to `agentlearningsxm/textbee-v1.1` `main` for auto-deploy? If not,
   connect it or deploy the web manually.
2. Final **Vercel dashboard URL** — keep `textbee-cloud.vercel.app` or use a custom domain? (If custom,
   update Android `WEB_BASE_URL`, API `FRONTEND_URL`, and `NEXT_PUBLIC_SITE_URL` to match.)
3. Confirm **push target = `main`** (Coolify builds `origin/main`; current `main` = 556be74).

## Safety / Rules
- Never `git add .` — scoped staging only. No commit/push/deploy without explicit owner approval.
- `web/public/textbee-selfhosted.apk` is intentionally tracked (served by `/download`).
- Rotate any secrets from old `api/.env.bak` / `web/.env.bak` if they were ever pushed, before/after deploy.
- Preserve custom fork behavior: admin, invites/approval registration, self-host, Firebase fallback,
  branding, Android polling.
- SSH via Windows OpenSSH only (Git Bash ssh key error).

## Reference
- Session repair log: `logs/2026-07/2026-07-04/2026-07-04-web-node_modules-repair.md`
- Memory: `~/.claude/projects/.../memory/my-textbee-hosting-hostinger-vps.md`
