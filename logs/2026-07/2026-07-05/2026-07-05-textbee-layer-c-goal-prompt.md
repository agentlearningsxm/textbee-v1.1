---
type: prompt
project: my_textbee
date: 2026-07-05
status: ready
purpose: "Reusable goal-loop prompt for finishing TextBee v2.8.0 Layer C with subagents, QA, and evaluator gates."
related:
  - "[[2026-07-05-textbee-v280-deploy-handoff]]"
  - "[[baton-my-textbee-v280-deploy-in-progress]]"
tags: [textbee, v2.8.0, deploy, android, layer-c, goal-prompt, handoff]
---

# TextBee Layer C Goal Prompt

Paste this into a fresh goal/session after reading the short handoff prompt.

```text
/goal Finish TextBee v2.8.0 deploy completely. Focus only on my_textbee, not n8n.

Current truth:
- Project: D:\Desktop\ReynubixBrain\10_Projects\Active\my_textbee
- Full handoff: D:\Desktop\ReynubixBrain\10_Projects\Active\my_textbee\logs\2026-07\2026-07-05\2026-07-05-textbee-v280-deploy-handoff.md
- Baton: D:\Desktop\ReynubixBrain\30_System\Context\Batons\my_textbee\2026-07-04\baton-my-textbee-v280-deploy-in-progress.md
- Security memory: my-textbee-public-repo-secret-leak.md
- API + web are already live and verified.
- 3 of 4 layers green:
  - Layer A API PASS: VPS API /api/v1/health = 200, commit c6acb69 deployed.
  - Layer B web PASS: Vercel dashboard live, calls VPS API, CORS OK, login fixed.
  - Layer D appsec/env PASS except Firebase key rotation deferred by owner.
  - Layer C phone SMS FAIL: rebuilt self-host APK crashes on launch with Android generic "app has a bug."

Main objective:
Close Layer C fully:
1. Get the Android crash stack trace.
2. Root-cause the launch crash.
3. Fix the self-hosted Android APK.
4. Rebuild APK.
5. Copy APK to web/public/textbee-selfhosted.apk.
6. Sync download page byte size if changed.
7. Commit + push safely.
8. Verify Vercel serves the new APK.
9. Install on phone or emulator.
10. Register device.
11. Send 1 real test SMS.
12. Verify pending -> sent on VPS/API logs or database.
13. Update handoff/baton/logs with evidence.

Hard orchestration rules:
- Main agent is controller only.
- Use subagents for all implementation, diagnosis, QA, evaluation, and final review.
- Do not directly edit files in main thread except if writing final session logs/handoff after all agents finish.
- For every task, run this loop:
  1. Worker subagent does the task.
  2. QA subagent verifies with commands/evidence.
  3. Evaluator subagent scores 0-100 and lists risks/gaps.
  4. If QA fails or evaluator score < 90, dispatch fix subagent, then rerun QA + evaluator.
- Do not mark a task complete from worker report alone.
- Search official docs or repo source if root cause is unclear. Prefer Android, Firebase Messaging, Gradle, Google Services plugin, and TextBee upstream sources.
- No guess-fixes. Get trace first unless impossible.
- If emulator/device access blocks exact trace, add temporary on-screen crash capture/debug logging through a worker subagent, rebuild, and use owner screenshot/log as evidence.
- Do not rotate Firebase key unless owner explicitly approves. Mention it as deferred risk.
- Do not make repo private yet. It can break Coolify anonymous clone.
- Never commit secrets, .env.bak, debug keystore, logs with tokens, node_modules, dist, .next, or build junk.
- Use scoped git staging only. Never git add .
- Verify branch/remote before committing.
- Before success claim, run fresh verification.

Context-engineering guardrails:
- If subagent tools are not available in the fresh session, stop and report that the required execution mode is unavailable. Do not silently switch to inline execution.
- API and web are already green. Re-verify them, but do not redeploy API/web unless verification proves a regression and owner approves the fix.
- Keep repository boundaries clean:
  - Public TextBee repo work happens under D:\Desktop\ReynubixBrain\10_Projects\Active\my_textbee.
  - Vault memory/log updates happen in the ReynubixBrain vault and must be committed separately from public TextBee code changes.
  - If branch is not main, or remote is not agentlearningsxm/textbee-v1.1, stop before committing or pushing.
- Physical phone/SIM may be required for the final real SMS. If emulator proves app launch but real SMS still needs owner phone, finish all machine-side work, write exact owner steps, and do not claim Layer C complete until pending -> sent is proven.
- Emulator setup may require Android SDK licenses, Hyper-V/virtualization, disk space, or long downloads. If emulator is blocked, switch to the on-screen crash capture path instead of stalling.
- Any temporary crash handler must be debug-only or removed before final APK unless evaluator explicitly approves it as safe.

Subagent output contract:
- Worker final response must include: STATUS, files changed, commands run, evidence, risks, and next required action.
- QA final response must include: PASS/FAIL, independent commands run, evidence, diff/status check, and exact failed requirement if any.
- Evaluator final response must include: score 0-100, Critical/Important/Minor issues, pass/fail against threshold, and whether the controller may proceed.
- Controller may proceed only when QA = PASS and evaluator score >= 90 with no Critical or Important unresolved issues.

Completion gates:
- Layer C is complete only when all are true:
  1. APK launches without crash on emulator or owner phone.
  2. Device registration succeeds against the VPS API.
  3. One real SMS is created and observed pending -> sent through VPS/API logs or database evidence.
  4. New APK is served from https://textbee-cloud.vercel.app/textbee-selfhosted.apk with verified byte size.
  5. No secrets or forbidden artifacts are introduced into the public repo.
- Goal is complete only when Layer A, B, C, and D are all freshly verified in the final full-system verification.

Required first reads:
1. D:\Desktop\ReynubixBrain\BRAIN.md
2. D:\Desktop\ReynubixBrain\AGENTS.md
3. D:\Desktop\ReynubixBrain\30_System\Agents\state\hq-status.js
4. D:\Desktop\ReynubixBrain\02_Memory\LESSONS.md
5. D:\Desktop\ReynubixBrain\30_System\KEYWORD-MAP.md
6. D:\Desktop\ReynubixBrain\10_Projects\Active\my_textbee\logs\2026-07\2026-07-05\2026-07-05-textbee-v280-deploy-handoff.md
7. D:\Desktop\ReynubixBrain\30_System\Context\Batons\my_textbee\2026-07-04\baton-my-textbee-v280-deploy-in-progress.md

Execution plan:

Task 1: Recon current TextBee state
- Worker:
  - Verify current git branch, remote, HEAD.
  - Verify working tree status.
  - Verify API health still 200.
  - Verify web URL still loads and APK URL still returns 200.
  - Verify Android build environment:
    - JAVA_HOME = C:\Tools\jdk-17
    - ANDROID_HOME = C:\Android\Sdk
    - sdkmanager exists at C:\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat
  - Verify current APK path and size:
    - android\app\build\outputs\apk\selfhosted\debug\app-selfhosted-debug.apk
    - web\public\textbee-selfhosted.apk
  - No changes.
- QA:
  - Independently rerun the key read-only checks.
  - Confirm no files changed.
- Evaluator:
  - Score completeness. Must be >= 90.

Task 2: Get crash evidence
- Worker:
  - First try to get a real stack trace.
  - If emulator missing, install Android emulator/system image on C: only, not D:
    - sdkmanager "emulator" "platform-tools" "platforms;android-34" "system-images;android-34;google_apis;x86_64"
    - create AVD with avdmanager
    - boot emulator
    - install APK
    - run adb logcat while launching
  - If emulator install/boot fails or is too slow, add temporary debug crash handler that shows/writes uncaught exception on screen/log, rebuild APK, and prepare owner install instructions.
  - Capture exact FATAL EXCEPTION or crash screen evidence.
- QA:
  - Verify the trace is real, current, and from launching the selfhosted APK.
  - Reject vague Android generic crash messages as insufficient.
- Evaluator:
  - Score trace quality. Must be >= 90 before fixing.

Task 3: Root cause analysis
- Worker:
  - Analyze stack trace against source.
  - Inspect likely areas:
    - android/app/src/selfhosted/google-services.json
    - android/app/build.gradle
    - SplashActivity
    - OnboardingActivity
    - OnboardingViewModel.kt around FirebaseMessaging.getInstance().token
    - MainActivity.java FirebaseMessaging usage
    - HeartbeatHelper.kt
    - BootCompletedReceiver.kt
    - app startup / Compose resources / R.drawable.ic_app_logo
  - If Firebase placeholder config is involved, use official Firebase/Google Services docs to confirm correct behavior.
  - Produce exact root cause, affected files, and minimal fix plan.
  - No code edits unless Task 2 needed temporary crash handler.
- QA:
  - Verify root cause is supported by stack trace and source lines.
- Evaluator:
  - Score evidence strength. Must be >= 90.

Task 4: Fix crash
- Worker:
  - Apply the smallest durable fix.
  - Preferred direction if trace confirms Firebase placeholder crash:
    - Make selfhosted flavor safe without real Firebase config.
    - Disable or guard Firebase Messaging token calls when Firebase app/config is absent or placeholder.
    - App must still launch, onboard, register device, poll/send SMS.
    - Do not require a real Firebase project for selfhosted debug APK.
  - Remove temporary crash handler if added, unless it is safe and intended for debug only.
  - Add tests or static checks where practical.
- QA:
  - Inspect diff for scope, secrets, and whether temporary debug code leaked into release path.
  - Run Android build.
  - Verify APK generated.
- Evaluator:
  - Score fix quality. Must be >= 90.

Task 5: Rebuild and publish APK artifact
- Worker:
  - Set:
    - JAVA_HOME=C:\Tools\jdk-17
    - ANDROID_HOME=C:\Android\Sdk
  - Run from android:
    - .\gradlew.bat :app:assembleSelfhostedDebug --no-daemon
  - Copy output APK to:
    - web\public\textbee-selfhosted.apk
  - Update download page byte-size constant if changed.
  - Verify BuildConfig:
    - API_BASE_URL=https://textbee.srv1093654.hstgr.cloud/api/v1/
    - WEB_BASE_URL=https://textbee-cloud.vercel.app
- QA:
  - Recompute APK size and SHA256.
  - Confirm web/public APK is byte-identical to built APK.
  - Confirm no secret/artifact junk staged.
- Evaluator:
  - Score artifact readiness. Must be >= 90.

Task 6: Commit + push safely
- Worker:
  - Verify branch and remote.
  - Show git status.
  - Stage only intended files.
  - Run build/test commands needed for confidence.
  - Commit with scoped message.
  - Push to origin/main only if correct.
- QA:
  - Verify commit contains only intended files.
  - Verify pushed HEAD equals local HEAD.
  - Verify public repo tree has no .env.bak, debug keystore, tokens, node_modules, dist, .next.
- Evaluator:
  - Score deploy hygiene. Must be >= 90.

Task 7: Verify web serves new APK
- Worker:
  - Wait for Vercel deployment if needed.
  - Verify:
    - https://textbee-cloud.vercel.app loads.
    - https://textbee-cloud.vercel.app/textbee-selfhosted.apk returns 200.
    - APK byte size matches web/public artifact.
- QA:
  - Independently curl the APK URL.
  - Verify byte size and optionally SHA if downloaded.
- Evaluator:
  - Score deploy verification. Must be >= 90.

Task 8: Install, launch, register device, send SMS
- Worker:
  - If emulator can validate launch, install and launch there first.
  - For real SMS, coordinate with owner physical phone if needed.
  - Owner flow:
    - uninstall old TextBee selfhosted app
    - install new APK from Vercel URL
    - launch app
    - register device against VPS API
    - send one test SMS
  - Capture device ID and message/test details without exposing secrets.
- QA:
  - Verify app no longer crashes.
  - Verify registration happened on VPS/API/MongoDB.
  - Verify SMS lifecycle pending -> sent.
- Evaluator:
  - Score Layer C closure. Must be >= 90.

Task 9: Final full-system verification
- Worker:
  - Recheck all layers:
    - A API health 200 and running commit is current
    - B web live and calls VPS API, CORS OK
    - C app launch/register/SMS pending->sent PASS
    - D no new secrets committed; env still correct; Firebase key rotation still explicitly deferred
  - Gather command evidence.
- QA:
  - Independently verify every layer.
- Evaluator:
  - Final score. Complete only if all layers pass and score >= 90.

Task 10: Session closeout
- Worker:
  - Update:
    - my_textbee handoff/log
    - my_textbee baton
    - relevant project README/activity row if required
    - hq-status.js if required
  - Run graphify update D:\Desktop\ReynubixBrain if session-end protocol applies.
  - Commit vault updates separately from public TextBee repo changes.
- QA:
  - Verify logs/baton match actual evidence and no secrets leaked.
- Evaluator:
  - Score handoff quality. Must be >= 90.

Final answer format:
- Layer status A/B/C/D
- Root cause found
- Files changed
- Commands/tests run
- APK URL and byte size
- SMS evidence pending -> sent
- QA/evaluator scores per task
- Deferred owner-only items:
  - rotate leaked Firebase key
  - decide repo private after Coolify deploy key
  - SMTP/email config if invites must work
```
