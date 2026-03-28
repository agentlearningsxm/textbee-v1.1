# TextBee Cloud — Comprehensive Analysis Report

**Date:** 2026-03-28  
**Scope:** Full codebase audit — `api/` (NestJS), `web/` (Next.js), `android/` (Java), infra config  
**Repository:** `D:\Desktop\reynubix\everything textbee\textbee-cloud-src\`  
**Branch:** `main` (5 commits, shallow clone)

---

## Executive Summary

The TextBee SMS gateway is a functional but security-critical application with **102 static analysis issues**, **5 critical admin panel bugs**, **14 auth/permission vulnerabilities**, and **55+ dependency vulnerabilities** in the API alone. The admin panel has specific bugs that prevent invite management from working correctly, and the authentication system has fundamental gaps that undermine ban enforcement.

**Top 3 Root Causes of Admin Panel Bugs:**
1. Frontend/backend API contract mismatches (wrong field names, wrong HTTP methods)
2. Non-atomic database operations (invite code race conditions)
3. Missing session invalidation after role/ban changes

---

## PART 1: ADMIN PANEL BUGS (Priority: CRITICAL)

### BUG-1: "Revoke" Invite Button Actually Deletes It

**Root Cause:** Frontend calls `DELETE /admin/invites/:id` but backend "revoke" endpoint is `POST /admin/invites/:id/revoke`. The delete endpoint permanently removes the record.

| Location | Detail |
|----------|--------|
| `web/lib/api/admin.ts:103-105` | `revokeInvite()` sends `DELETE` method |
| `api/src/invites/invites.controller.ts:64` | Revoke endpoint expects `POST` with `/revoke` suffix |

**Reproduction Steps:**
1. Login as admin → Navigate to `/admin/invites`
2. Click "Revoke" on any invite code
3. Observe: invite record is permanently deleted from DB, not just marked as revoked

**Fix:**
```typescript
// web/lib/api/admin.ts — change revokeInvite:
async revokeInvite(id: string): Promise<void> {
  await httpBrowserClient.post(ENDPOINTS.admin.invites.revoke(id))
}
```
Also add the endpoint to `web/config/api.ts`:
```typescript
invites: {
  revoke: (id: string) => `/admin/invites/${id}/revoke`,
  // ...
}
```

---

### BUG-2: Invite Expiry Setting Is Ignored (Frontend/Backend Mismatch)

**Root Cause:** Frontend sends `expiresAt` (ISO string) but backend DTO expects `expiresInDays` (number). Backend always falls back to 7-day default.

| Location | Detail |
|----------|--------|
| `web/lib/api/admin.ts:88` | Sends `{ maxUses, expiresAt: "2026-..." }` |
| `api/src/invites/dto/create-invite.dto.ts:8` | Expects `expiresInDays?: number` |

**Reproduction Steps:**
1. Login as admin → Navigate to `/admin/invites`
2. Set expiry to 30 days → Generate invite
3. Check MongoDB: `expiresAt` is 7 days from now, not 30

**Fix (Frontend):**
```typescript
// web/lib/api/admin.ts — change createInvite:
async createInvite(data: { maxUses?: number; expiresInDays?: number }): Promise<InviteCode> {
  const response = await httpBrowserClient.post(ENDPOINTS.admin.invites.create, data)
  return response.data.data
}
```
**Fix (Frontend UI):** Change the invite form to send `expiresInDays` instead of computing `expiresAt`.

---

### BUG-3: Invite Code Race Condition (Over-Use)

**Root Cause:** `validateAndConsumeInvite()` reads `currentUses`, compares to `maxUses`, then does `currentUses += 1` and `save()`. Non-atomic read-modify-write allows concurrent registrations to exceed `maxUses`.

| Location | Detail |
|----------|--------|
| `api/src/invites/invites.service.ts:139-156` | Non-atomic `currentUses += 1` |

**Reproduction Steps:**
1. Create invite with `maxUses: 1`
2. Send 10 concurrent `POST /auth/register` requests with the same invite code
3. Observe: Multiple registrations succeed (race window between read and write)

**Fix:**
```typescript
async validateAndConsumeInvite(code: string, userId: string) {
  const invite = await this.inviteModel.findOneAndUpdate(
    {
      code,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
      $expr: { $lt: ['$currentUses', '$maxUses'] },
    },
    {
      $inc: { currentUses: 1 },
      $addToSet: { usedBy: userId },
    },
    { new: true }
  )
  if (!invite) throw new HttpException('Invalid or expired invite code', 400)
  return invite
}
```

---

### BUG-4: Admin Can Demote/Ban/Delete Themselves

**Root Cause:** No self-protection check on any admin user management endpoint.

| Location | Detail |
|----------|--------|
| `api/src/admin/admin.controller.ts:42,50,59,70` | No self-check on role update, ban, unban, or delete |

**Reproduction Steps:**
1. Login as admin
2. Navigate to `/admin/users`
3. Find your own account → Click "Delete"
4. Confirm deletion → Account is deleted, you're now locked out

**Fix:**
```typescript
// api/src/admin/admin.controller.ts — add to each mutating endpoint:
@Patch(':id/role')
async updateUserRole(@Param('id') id: string, @Body() dto: UpdateRoleDto, @Req() req) {
  if (id === req.user._id.toString()) {
    throw new HttpException('Cannot modify your own account', 400)
  }
  return this.adminService.updateUserRole(id, dto.role)
}
```
Apply same check to `banUser`, `unbanUser`, and `deleteUser`.

---

### BUG-5: No Pagination on User List (OOM Risk)

**Root Cause:** `getAllUsers()` fetches ALL users with `find().sort({createdAt: -1})`. Frontend also does client-side filtering on the full dataset.

| Location | Detail |
|----------|--------|
| `api/src/admin/admin.service.ts:18-24` | No pagination |
| `web/app/(app)/admin/users/page.tsx:84` | Client-side filtering on full array |

**Reproduction Steps:**
1. Populate DB with 50,000+ users
2. Navigate to `/admin/users`
3. Observe: API timeout or OOM, page freeze

**Fix (Backend):**
```typescript
async getAllUsers(page = 1, limit = 50) {
  const skip = (page - 1) * limit
  const [users, total] = await Promise.all([
    this.userModel.find().select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
    this.userModel.countDocuments(),
  ])
  return { data: users, total, page, limit }
}
```

---

## PART 2: AUTHENTICATION & AUTHORIZATION VULNERABILITIES

### CRITICAL: Ban Not Enforced on Active Sessions

**Impact:** A banned user retains full API access for up to 60 days (JWT lifetime).

| Location | Detail |
|----------|--------|
| `api/src/auth/guards/auth.guard.ts:65-71` | Validates JWT but never checks `isBanned` |
| `api/src/auth/jwt.strategy.ts:17-24` | Passport strategy skips ban check |

**Fix:**
```typescript
// api/src/auth/guards/auth.guard.ts — after user lookup:
if (user.isBanned) {
  throw new HttpException('Account suspended', 403)
}
```
Add the same check to `jwt.strategy.ts:validate()`.

### CRITICAL: Role Changes Not Reflected in Active Sessions

**Impact:** Demoted admin retains admin privileges until JWT expires.

**Fix:** Implement a `tokenVersion` field on the User schema. Increment on role change. Validate version in AuthGuard.

### HIGH: Google OAuth Token Not Properly Verified

**Location:** `api/src/auth/auth.service.ts:78-79`

Uses deprecated `googleapis.com/tokeninfo` endpoint without verifying the `aud` claim matches the expected Google Client ID.

**Fix:** Use `google-auth-library`:
```typescript
import { OAuth2Client } from 'google-auth-library'
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
const ticket = await client.verifyIdToken({
  idToken,
  audience: process.env.GOOGLE_CLIENT_ID,
})
```

### HIGH: Email Verification Endpoint Missing Auth Guard

**Location:** `api/src/auth/auth.controller.ts:157-163`

Anyone can verify any user's email by knowing their userId and verification code.

**Fix:** Add `@UseGuards(AuthGuard)` and use `req.user.id` instead of body `userId`.

### MEDIUM: API Keys Accepted in Query Strings

**Location:** `api/src/auth/guards/auth.guard.ts:27`

API keys in URLs get logged in access logs, CDN logs, browser history.

**Fix:** Remove `request.query.apiKey` fallback. Accept only `x-api-key` header.

---

## PART 3: SECURITY INFRASTRUCTURE ISSUES

### CRITICAL: Secrets Committed to Git

| File | Exposed Secret |
|------|---------------|
| `api/.env.bak` | Firebase full private key, JWT secret, MongoDB URI with creds |
| `web/.env.bak` | `AUTH_SECRET=super_secret_auth_key_123`, MongoDB URI |

**Immediate Actions:**
1. Rotate Firebase private key in Firebase Console
2. Generate new `JWT_SECRET`: `openssl rand -base64 32`
3. Generate new `AUTH_SECRET`: `openssl rand -base64 32`
4. Change MongoDB password
5. Add `.env.bak` to `.gitignore` (root + api + web)
6. Run `git filter-branch` or BFG to remove from history

### CRITICAL: CORS Wide Open

**Location:** `api/src/main.ts:83`

```typescript
app.enableCors() // allows ALL origins
```

**Fix:**
```typescript
app.enableCors({
  origin: [process.env.FRONTEND_URL || 'https://textbee-cloud.vercel.app'],
  credentials: true,
})
```

### HIGH: No Global ValidationPipe

**Location:** `api/src/main.ts`

All DTO `class-validator` decorators are dead code. No input validation on any endpoint.

**Fix:**
```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}))
```

### HIGH: Swagger Exposed Without Auth

**Location:** `api/src/main.ts:51`

Full API schema discoverable at `/` with `persistAuthorization: true`.

**Fix:** Gate behind `NODE_ENV !== 'production'` or admin auth.

### HIGH: No Security Headers

Missing Helmet on API, no CSP/HSTS/X-Frame-Options on either API or web.

**Fix:** `npm install helmet` + `app.use(helmet())` in `api/src/main.ts`.

---

## PART 4: DEPENDENCY VULNERABILITIES

### API: 55 Vulnerabilities (2 Critical, 27 High)

| Package | Severity | Issue |
|---------|----------|-------|
| `handlebars` | CRITICAL | Prototype pollution (via `@nest-modules/mailer`) |
| `fast-xml-parser` | CRITICAL | XXE injection (via `@nestjs/swagger`) |
| `axios` ^1.13.2 | HIGH | DoS via `__proto__` key |
| `@nestjs/core` ^11.1.9 | HIGH | ReDoS via `path-to-regexp` |
| `multer` | HIGH | File upload vulnerability |
| `@nest-modules/mailer` | HIGH | **Unmaintained, no fix available** |

**Fix:** `npm audit fix` resolves most. `@nest-modules/mailer` needs migration to `@nestjs-modules/mailer`.

### Web: 18 Vulnerabilities (13 High)

| Package | Severity | Issue |
|---------|----------|-------|
| `axios` ^1.8.2 | HIGH | DoS |
| `next` 14.2.26 | HIGH | Multiple high-severity issues |
| `@typescript-eslint/*` ^6.19.0 | HIGH | ReDoS via `minimatch` |

### Android: Outdated Dependencies

Firebase BOM 29.2.1 (current: 33+), Retrofit 2.9.0 (current: 2.11+), release build uses debug keystore, `minifyEnabled false`.

---

## PART 5: SCHEMA DESIGN ISSUES

| Schema | Issue | Impact |
|--------|-------|--------|
| `user.schema.ts:30` | `role` typed as `string` not enum | No DB-level validation |
| `invite.schema.ts` | No TTL index on `expiresAt` | Expired invites accumulate forever |
| `device.schema.ts:14` | No index on `user` field | Full scan on user deletion |
| `sms.schema.ts:28` | No index on `type` field | Full scan for admin stats |
| `api-key.schema.ts` | No index on `user` or `hashedApiKey` | Slow auth lookups |
| `access-log.schema.ts` | No indexes at all | Audit queries will be full scans |
| `device.schema.ts:201` | Compound unique index commented out | Duplicate devices allowed |

---

## PART 6: DEPLOYMENT & CI/CD ISSUES

| Issue | Detail |
|-------|--------|
| Package manager split | CI uses `npm`, Render uses `pnpm` — pick one |
| Android tests disabled | `./gradlew test` commented out in CI |
| Docker workflow stuck | 2 runs from Jan 2026 still `in_progress` |
| `StickyNotificationService.java` | 4 changes in 5 commits — most unstable file |
| `render.yaml` | Missing `JWT_SECRET`, `MONGO_URI`, `FIREBASE_*` env vars |

---

## PART 7: PRIORITIZED FIX PLAN

### Tier 0 — Fix Today (Active Security Risk)

| # | Fix | File(s) | Effort |
|---|-----|---------|--------|
| 1 | Rotate all exposed secrets | Firebase, MongoDB, JWT, AUTH | 30 min |
| 2 | Add `.env.bak` to `.gitignore` | Root, api, web `.gitignore` | 5 min |
| 3 | Restrict CORS | `api/src/main.ts:83` | 5 min |
| 4 | Enable global ValidationPipe | `api/src/main.ts` | 5 min |
| 5 | Fix `revokeInvite` HTTP method | `web/lib/api/admin.ts:103` | 5 min |
| 6 | Fix `createInvite` field mismatch | `web/lib/api/admin.ts:88` | 10 min |
| 7 | Add ban check to AuthGuard | `api/src/auth/guards/auth.guard.ts` | 10 min |

### Tier 1 — Fix This Week

| # | Fix | File(s) | Effort |
|---|-----|---------|--------|
| 8 | Atomic invite consumption | `api/src/invites/invites.service.ts` | 30 min |
| 9 | Admin self-protection guard | `api/src/admin/admin.controller.ts` | 20 min |
| 10 | Add user list pagination | `api/src/admin/admin.service.ts` + frontend | 1 hr |
| 11 | Proper Google OAuth verification | `api/src/auth/auth.service.ts` | 30 min |
| 12 | Add Helmet middleware | `api/src/main.ts` | 10 min |
| 13 | Remove Swagger from production | `api/src/main.ts` | 5 min |
| 14 | Run `npm audit fix` (api + web) | Both `package.json` | 15 min |
| 15 | Remove API key from query string | `api/src/auth/guards/auth.guard.ts` | 5 min |
| 16 | Add missing DB indexes | All schema files | 30 min |
| 17 | Fix email verification auth | `api/src/auth/auth.controller.ts` | 15 min |

### Tier 2 — Fix This Month

| # | Fix | File(s) | Effort |
|---|-----|---------|--------|
| 18 | Implement refresh tokens | Auth module | 4 hrs |
| 19 | Add `tokenVersion` for session invalidation | User schema + AuthGuard | 2 hrs |
| 20 | Migrate `@nest-modules/mailer` | `api/package.json` | 2 hrs |
| 21 | Fix Android release signing | `android/app/build.gradle` | 30 min |
| 22 | Pin Docker images | `docker-compose.yaml` | 10 min |
| 23 | Secure Redis with password | `docker-compose.yaml` | 10 min |
| 24 | Unify package manager (pnpm) | CI workflows + Procfile | 1 hr |
| 25 | Enable TypeScript strict mode | `tsconfig.json` (api + web) | 2 hrs |

---

## Appendix A: Full Issue Count by Category

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Static Code Analysis | 14 | 28 | 35 | 25 | 102 |
| Admin Panel Bugs | 5 | 0 | 7 | 0 | 12 |
| Auth/Permission | 4 | 5 | 4 | 1 | 14 |
| Dependencies | 2 | 40 | 18 | 13 | 73 |
| Schema Design | 0 | 5 | 6 | 0 | 11 |
| CI/CD | 0 | 2 | 3 | 0 | 5 |
| **Total** | **25** | **80** | **73** | **39** | **217** |

## Appendix B: Most Dangerous Single-Line Fixes

1. `api/src/main.ts` — `app.enableCors()` → `app.enableCors({ origin: [process.env.FRONTEND_URL] })`
2. `api/src/main.ts` — Add `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))`
3. `api/src/auth/guards/auth.guard.ts` — Add `if (user.isBanned) throw new HttpException('Suspended', 403)` after user lookup
4. `web/lib/api/admin.ts:103` — Change `httpBrowserClient.delete(...)` to `httpBrowserClient.post(...revoke...)`
5. `api/src/invites/invites.service.ts` — Replace `currentUses += 1; save()` with atomic `findOneAndUpdate($inc)`

---

*Report generated by 5 specialized analysis agents covering static analysis, admin panel review, auth tracing, git history, and security audit.*
