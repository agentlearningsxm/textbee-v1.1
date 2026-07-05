---
type: goal-plan
project: my_textbee
date: 2026-07-04
status: ready
decision: "B - frontend on Vercel, everything else on Hostinger VPS"
tags: [textbee, v2.8.0, deploy, goal, verification, hostinger, vercel]
related: ["[[2026-07-04-plan-hostinger-vercel-deploy]]", "[[baton-my-textbee-v280-deploy-plan]]"]
---

# Goal + Multi-Layer Verification Harness — TextBee v2.8.0 Deploy (Option B)

## The `/goal` (paste into the deploy session)

> Note: /goal caps at 4000 chars; this compact version fits. Full phase plan is below.

```
/goal Deploy TextBee v2.8.0, Option B: web on Vercel, API+MongoDB on Hostinger VPS/Coolify. Detailed steps in logs/2026-07/2026-07-04/2026-07-04-goal-and-verification-harness.md. Keep going until 4 verification layers pass: (A) VPS /api/v1/health returns 200 AND deployed image != 556be74; (B) Vercel dashboard loads, its calls hit textbee.srv1093654.hstgr.cloud, no CORS error; (C) rebuilt selfhosted APK registers a device and sends 1 test SMS via the VPS API; (D) no secret/artifact in the commit, env vars correct on both sides. Stop ONLY for an owner-approval gate (commit/push/deploy/live-SMS) or a hard blocker needing the owner (DNS, Vercel/Coolify access, secret rotation). Never git add . Scoped staging only. No "done" without command/log evidence.
```

## Supporting plan (what "green" means)

### Phase 0 — Pre-flight (local, no approval)
- Rebuild selfhosted APK with `WEB_BASE_URL = textbee-cloud.vercel.app`; copy to `web/public/textbee-selfhosted.apk`; sync `SELFHOSTED_APK_SIZE_BYTES`.
- Re-run local suite fresh: web build, API `nest build`, health jest, `docker compose config`, Android APK.
- Verify (3 independent): build exit codes = 0; artifacts exist (`.next`, `dist/main.js`, `app-selfhosted-debug.apk`); `git status` clean, no node_modules/dist/.next/.env staged.

### Phase 1 — APPROVAL GATE #1 (owner)
- Confirm: Vercel project linked to `main` for auto-deploy? Final Vercel domain? Push target = `main`?
- Owner: "go".

### Phase 2 — Commit (local, gated)
- Scoped `git add <explicit files>` (NEVER `git add .`), then commit.
- Verify: `git diff --cached --stat` reviewed; scan staged for `.env`, `*.bak`, keystore, `node_modules`, `dist`, `.next` -> none; conflict/whitespace clean.

### Phase 3 — Push -> auto-deploy (production, gated)
- Merge branch into `main`, `git push origin main`.
- Coolify rebuilds API; Vercel rebuilds web.
- Verify: Coolify deploy status = success (via SSH); Vercel deploy = Ready.

### Phase 4 — MULTI-LAYER VERIFICATION (run as parallel subagents; adversarial: try to DISPROVE "it works")
| Layer | Check | Pass = |
|---|---|---|
| A - API | `curl .../api/v1/health`; compare running image tag vs merged commit | 200 AND tag != 556be74 |
| B - Web | `curl` Vercel URL; load login/admin/invites; inspect API calls + CORS | 200, calls hit hstgr.cloud, no CORS |
| C - Phone | Install APK; register device; send 1 test SMS; check VPS logs show polling | SMS Pending -> Sent |
| D - AppSec | No secrets in commit; env correct on VPS + Vercel; stale onrender/old URLs gone | clean |

### Phase 5 — Rollback (if any layer fails)
- Coolify: redeploy previous image. Vercel: rollback to prior deployment. Git: revert commit.
- Log the exact command + error before any retry (research-first, no guessing).

### Phase 6 — Close
- Update baton + log with deploy evidence; `graphify update D:\Desktop\ReynubixBrain`; flag residuals.

## Known residuals to decide
- Email off: VPS API `MAIL_HOST=PLACEHOLDER` -> invite/verification emails won't send. Configure real SMTP if invites must email.
- Secrets: rotate old `api/.env.bak` / `web/.env.bak` creds if ever pushed.
- Custom domain: if not `textbee-cloud.vercel.app`, update Android `WEB_BASE_URL` + API `FRONTEND_URL` + Vercel `NEXT_PUBLIC_SITE_URL` and rebuild APK.

## Fixed facts (from verification session)
- VPS API base: `https://textbee.srv1093654.hstgr.cloud/api/v1/` (Coolify app textbee-api, port 3003).
- Coolify builds `origin/main` of `github.com/agentlearningsxm/textbee-v1.1`; deployed commit currently 556be74 (pre-merge).
- SSH: Windows OpenSSH only -> `& "C:\Windows\System32\OpenSSH\ssh.exe" hostinger-vps '<cmd>'`.
