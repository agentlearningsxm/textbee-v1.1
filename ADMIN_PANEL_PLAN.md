# Admin Panel Implementation Plan for TextBee

## Executive Summary

Your TextBee instance currently has **partial admin infrastructure** but **no admin gating or management UI**. This means anyone can register and access the full dashboard, which is a security concern for self-hosted deployments.

**Good News:** Your codebase already has foundational admin features (role system, admin checks in guards), so we're not starting from scratch.

**Security Gap:** The original TextBee (vernu/textbee) has NO admin panel - this is functionality you'll need to build.

---

## Current State Analysis

### ✅ What Exists
- User role system: `ADMIN` and `REGULAR` roles ([user-roles.enum.ts:1-5](C:\Users\setyw\.gemini\antigravity\scratch\textbee-cloud\api\src\users\user-roles.enum.ts#L1-L5))
- Role field in User schema (defaults to `REGULAR`)
- Admin override in authorization guards (API keys, devices)
- `isBanned` field in User schema (only checked in billing, not enforced at login)
- JWT authentication with 60-day expiration
- Cloudflare Turnstile bot protection

### ❌ What's Missing
- **No admin-only routes or controllers**
- **No admin dashboard UI**
- **No user management endpoints** (ban, promote, demote, view users)
- **No registration gating** (anyone can register and access dashboard)
- **No login blocking for banned users**
- **No admin role assignment workflow**
- **No audit logging for admin actions**

---

## Security Concerns Addressed

### Your Concern: "People can take URL and just sign in to use my app"

**Current Reality:**
1. Anyone can visit `https://YOUR_WEB_URL`
2. Click "Register"
3. Create account (with bot protection)
4. Get immediate dashboard access with full SMS gateway functionality

**Risk Level: HIGH** for self-hosted private instances

---

## Proposed Solution: Multi-Layer Admin System

I'm proposing a **comprehensive 3-tier admin system**:

### Tier 1: Registration Gating (Prevents unauthorized signups)
### Tier 2: Admin Management Panel (User administration)
### Tier 3: Enhanced Security (Ban enforcement, audit logging)

---

## Implementation Plan

### Phase 1: Registration Gating System

**Goal:** Prevent unauthorized users from registering

**Approach Options:**
1. **Invite-Only System** (Recommended for self-hosted)
   - Admin generates invite codes
   - Registration requires valid invite code
   - Invite codes are single-use or multi-use with expiration

2. **Admin Approval System**
   - Users can register but account is "pending"
   - Admin must approve before user can access dashboard
   - Email notification to admin on new registration

3. **Whitelist Email Domains**
   - Only emails from approved domains can register
   - Configurable via environment variable

**Recommendation:** Start with **Invite-Only System** (most secure for self-hosted)

**Files to Create:**
- `api/src/invites/invites.module.ts`
- `api/src/invites/invites.service.ts`
- `api/src/invites/invites.controller.ts`
- `api/src/invites/schemas/invite.schema.ts`
- `api/src/invites/dto/invite.dto.ts`

**Files to Modify:**
- `api/src/auth/auth.service.ts` - Add invite code validation to registration
- `web/app/(app)/(auth)/(components)/register-form.tsx` - Add invite code field
- `web/app/(app)/(auth)/register/page.tsx` - Update UI for invite requirement

**Database Schema:**
```typescript
InviteCode {
  _id: ObjectId
  code: string (unique, indexed)
  createdBy: User (admin who created it)
  usedBy: User | null (who used it)
  maxUses: number (default: 1)
  currentUses: number (default: 0)
  expiresAt: Date
  createdAt: Date
  usedAt: Date | null
}
```

---

### Phase 2: Admin Management Panel (Backend)

**Goal:** Create admin-only API endpoints for user management

**Files to Create:**
- `api/src/admin/admin.module.ts`
- `api/src/admin/admin.controller.ts`
- `api/src/admin/admin.service.ts`
- `api/src/admin/dto/admin.dto.ts`
- `api/src/admin/guards/admin-only.guard.ts`

**Admin Endpoints to Create:**

```typescript
// User Management
GET    /admin/users                    // List all users (paginated)
GET    /admin/users/:id                // Get user details
PATCH  /admin/users/:id/role           // Change user role (ADMIN/REGULAR)
PATCH  /admin/users/:id/ban            // Ban/unban user
DELETE /admin/users/:id                // Delete user account

// Invite Management
POST   /admin/invites                  // Generate invite code
GET    /admin/invites                  // List invite codes
DELETE /admin/invites/:id              // Revoke invite code

// System Statistics
GET    /admin/stats                    // System-wide stats (total users, SMS, devices)

// Device Management (cross-user)
GET    /admin/devices                  // List all devices across all users
GET    /admin/devices/:id              // Get device details
DELETE /admin/devices/:id              // Delete any device

// SMS Audit
GET    /admin/sms                      // View all SMS activity (paginated)
GET    /admin/sms/stats                // SMS statistics by user
```

**Files to Modify:**
- `api/src/auth/auth.service.ts` - Add admin check to login (block banned users)
- `api/src/billing/billing.service.ts` - Already checks `isBanned`, ensure it's consistent

**Admin-Only Guard:**
```typescript
// api/src/admin/guards/admin-only.guard.ts
@Injectable()
export class AdminOnlyGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()

    if (request.user?.role === UserRole.ADMIN) {
      return true
    }

    throw new HttpException(
      { error: 'Admin access required' },
      HttpStatus.FORBIDDEN
    )
  }
}
```

---

### Phase 3: Admin Dashboard UI (Frontend)

**Goal:** Create admin-only web interface

**Files to Create:**
- `web/app/(app)/admin/layout.tsx` - Admin section layout
- `web/app/(app)/admin/page.tsx` - Admin dashboard overview
- `web/app/(app)/admin/users/page.tsx` - User management table
- `web/app/(app)/admin/users/[id]/page.tsx` - User detail page
- `web/app/(app)/admin/invites/page.tsx` - Invite code management
- `web/app/(app)/admin/devices/page.tsx` - Cross-user device view
- `web/app/(app)/admin/sms/page.tsx` - SMS audit log
- `web/app/(app)/admin/stats/page.tsx` - System statistics
- `web/app/(app)/admin/(components)/user-table.tsx`
- `web/app/(app)/admin/(components)/invite-generator.tsx`
- `web/app/(app)/admin/(components)/ban-user-dialog.tsx`
- `web/lib/api/admin.ts` - Admin API client functions

**Files to Modify:**
- `web/app/(app)/dashboard/layout.tsx` - Add "Admin" nav item (only visible to admins)
- `web/middleware.ts` - Add admin route protection

**UI Features:**
1. **Users Table**
   - Columns: Email, Name, Role, Registered Date, Last Login, SMS Sent, Devices, Status
   - Actions: View Details, Change Role, Ban/Unban, Delete
   - Search/filter by email, role, status

2. **User Detail Page**
   - Profile information
   - Device list
   - SMS activity graph
   - API keys
   - Action buttons (promote, ban, delete)

3. **Invite Code Manager**
   - Generate new invite codes
   - Set expiration and max uses
   - View active/expired/used invites
   - Revoke unused invites

4. **System Stats Dashboard**
   - Total users (active, banned, admins)
   - Total devices registered
   - SMS statistics (sent, received, failed)
   - API key count
   - Recent activity timeline

---

### Phase 4: Enhanced Security Features

**Goal:** Strengthen security and add audit logging

**Files to Create:**
- `api/src/audit/audit.module.ts`
- `api/src/audit/audit.service.ts`
- `api/src/audit/schemas/audit-log.schema.ts`

**Files to Modify:**
- `api/src/auth/auth.service.ts` - Block banned users at login
- `api/src/admin/admin.service.ts` - Log all admin actions

**Audit Log Schema:**
```typescript
AuditLog {
  _id: ObjectId
  performedBy: User (admin)
  action: string (e.g., "USER_BANNED", "ROLE_CHANGED", "INVITE_GENERATED")
  targetUser: User | null
  targetResource: string | null (device ID, SMS ID, etc.)
  metadata: Object (action-specific data)
  ipAddress: string
  userAgent: string
  timestamp: Date
}
```

**Ban Enforcement at Login:**
```typescript
// In auth.service.ts login method
const user = await this.usersService.findOne({ email })

if (user.isBanned) {
  throw new HttpException(
    { error: 'Your account has been suspended. Contact support for assistance.' },
    HttpStatus.FORBIDDEN
  )
}
```

**Admin Action Logging:**
Every admin action should create an audit log entry:
```typescript
await this.auditService.log({
  performedBy: adminUser._id,
  action: 'USER_BANNED',
  targetUser: bannedUser._id,
  metadata: { reason: 'Spam activity detected' },
  ipAddress: request.ip,
  userAgent: request.headers['user-agent']
})
```

---

### Phase 5: Environment Configuration

**Files to Modify:**
- `api/.env`
- `web/.env.local`
- Documentation

**New Environment Variables:**

```bash
# Backend (api/.env)
REGISTRATION_MODE=invite_only  # Options: open, invite_only, approval_required
ADMIN_EMAIL=your.email@example.com  # First user with this email becomes admin
ALLOWED_DOMAINS=example.com,company.com  # Optional: domain whitelist

# Frontend (web/.env.local)
NEXT_PUBLIC_REGISTRATION_MODE=invite_only
```

**Automatic Admin Setup:**
On first deployment, the first user who registers with `ADMIN_EMAIL` automatically gets `ADMIN` role.

---

## Critical Files Reference

### Backend Files (API)
| Purpose | File Path |
|---------|-----------|
| User Schema | `api/src/users/schemas/user.schema.ts` |
| User Roles Enum | `api/src/users/user-roles.enum.ts` |
| Users Service | `api/src/users/users.service.ts` |
| Auth Controller | `api/src/auth/auth.controller.ts` |
| Auth Service | `api/src/auth/auth.service.ts` |
| Auth Guard | `api/src/auth/guards/auth.guard.ts` |
| Billing Service | `api/src/billing/billing.service.ts` |
| Gateway Controller | `api/src/gateway/gateway.controller.ts` |
| Gateway Service | `api/src/gateway/gateway.service.ts` |
| Device Schema | `api/src/gateway/schemas/device.schema.ts` |
| SMS Schema | `api/src/gateway/schemas/sms.schema.ts` |

### Frontend Files (Web)
| Purpose | File Path |
|---------|-----------|
| Auth Config | `web/lib/auth.ts` |
| Middleware | `web/middleware.ts` |
| Register Form | `web/app/(app)/(auth)/(components)/register-form.tsx` |
| Login Form | `web/app/(app)/(auth)/(components)/login-form.tsx` |
| Dashboard Layout | `web/app/(app)/dashboard/layout.tsx` |
| Dashboard Page | `web/app/(app)/dashboard/page.tsx` |

---

## Deployment Strategy

### Step 1: Backend Implementation
1. Create admin module with endpoints
2. Create invite system
3. Add admin guard
4. Modify registration to require invite
5. Add ban enforcement at login
6. Add audit logging

### Step 2: Database Migration
```typescript
// Run this script to promote your account to admin
db.users.updateOne(
  { email: "your.email@example.com" },
  { $set: { role: "ADMIN" } }
)
```

### Step 3: Frontend Implementation
1. Create admin dashboard pages
2. Add admin navigation
3. Update registration form with invite field
4. Add admin-only route protection

### Step 4: Testing
1. Test registration with/without invite code
2. Test admin endpoints with admin user
3. Test admin endpoints with regular user (should fail)
4. Test banned user login (should be blocked)
5. Test admin UI accessibility

### Step 5: Production Deployment
1. Set `REGISTRATION_MODE=invite_only` in Render environment
2. Set `ADMIN_EMAIL` in Render environment
3. Deploy backend to Render
4. Deploy frontend to Vercel
5. Manually promote your account to admin (MongoDB Atlas)
6. Generate first invite code via admin panel

---

## Security Considerations

### ⚠️ Important Security Notes

1. **First Admin Setup:**
   - Either manually set role in database OR use `ADMIN_EMAIL` env var
   - Do this BEFORE opening registration

2. **Invite Code Security:**
   - Codes should be cryptographically random (use `crypto.randomBytes(16).toString('hex')`)
   - Single-use codes are more secure than multi-use
   - Set reasonable expiration times (7-30 days)

3. **Ban Enforcement Points:**
   - Login (prevent access entirely)
   - API requests (billing.service already does this)
   - Dashboard middleware (redirect banned users)

4. **Admin Audit Trail:**
   - Log ALL admin actions
   - Include IP address and timestamp
   - Cannot be deleted by admins (immutable log)

5. **Rate Limiting:**
   - Consider adding rate limiting to admin endpoints
   - Already exists for password reset (5 per 24 hours)

---

## Alternative Approaches Considered

### Option A: Open Registration + Manual Approval (Not Recommended)
- Users can register but account is "pending approval"
- Admin must manually approve each user
- **Downside:** Creates admin workload, users wait for access

### Option B: Email Domain Whitelist (Good for Organizations)
- Only emails from approved domains can register
- Configured via environment variable
- **Downside:** Not flexible for mixed-domain teams

### Option C: IP Whitelist (Not Recommended)
- Only requests from approved IPs can register
- **Downside:** Doesn't work for dynamic IPs, VPNs, mobile users

**Selected Approach: Invite-Only System**
- Most secure for self-hosted instances
- Low admin overhead (generate codes as needed)
- Flexible (can generate multi-use codes for teams)
- No waiting period for users (instant access with valid code)

---

## Implementation Order

### Phase 1 (Most Critical - Registration Security)
1. Create invite system (backend)
2. Add invite validation to registration
3. Update registration form to require invite
4. Test registration flow

### Phase 2 (Admin Management)
1. Create admin module with user management endpoints
2. Create admin-only guard
3. Test admin endpoints

### Phase 3 (Admin UI)
1. Create admin dashboard pages
2. Add user management table
3. Add invite code generator
4. Test admin UI

### Phase 4 (Enhanced Security)
1. Add ban enforcement at login
2. Create audit logging system
3. Log all admin actions

### Phase 5 (Polish)
1. Add system statistics dashboard
2. Add SMS audit viewer
3. Add documentation for admins

---

## Verification & Testing Plan

### Backend Testing
```bash
# Test admin endpoint access (should succeed for admin)
curl -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  https://YOUR_API_URL/api/v1/admin/users

# Test admin endpoint access (should fail for regular user)
curl -H "Authorization: Bearer REGULAR_JWT_TOKEN" \
  https://YOUR_API_URL/api/v1/admin/users

# Test registration without invite (should fail)
curl -X POST https://YOUR_API_URL/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test1234"}'

# Test registration with invalid invite (should fail)
curl -X POST https://YOUR_API_URL/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test1234","inviteCode":"invalid"}'

# Test registration with valid invite (should succeed)
curl -X POST https://YOUR_API_URL/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test1234","inviteCode":"VALID_CODE"}'

# Test banned user login (should fail)
curl -X POST https://YOUR_API_URL/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"banned@example.com","password":"password"}'
```

### Frontend Testing
1. Visit `https://YOUR_WEB_URL/register`
   - Should show invite code field
   - Should reject registration without invite
   - Should accept registration with valid invite

2. Login as admin user
   - Should see "Admin" link in navigation
   - Should be able to access `/admin` routes

3. Login as regular user
   - Should NOT see "Admin" link
   - Should get 403 error when accessing `/admin` routes

4. Test ban flow
   - Admin bans user via admin panel
   - Banned user tries to login (should be blocked)
   - Banned user already logged in (should be logged out on next request)

### Database Verification
```javascript
// Check invite code was created
db.invitecodes.findOne({ code: "GENERATED_CODE" })

// Check user has correct role
db.users.findOne({ email: "admin@example.com" })
// Should have role: "ADMIN"

// Check audit logs are being created
db.auditlogs.find({ performedBy: ADMIN_USER_ID }).sort({ timestamp: -1 })
```

---

## Rollback Plan

If issues occur during deployment:

1. **Emergency: Disable Registration Gating**
   - Set `REGISTRATION_MODE=open` in Render environment
   - Redeploy API
   - Removes invite requirement temporarily

2. **Rollback Backend Changes**
   ```bash
   cd ~/.gemini/antigravity/scratch/textbee-cloud
   git revert HEAD~N  # N = number of commits to revert
   git push
   ```

3. **Rollback Frontend Changes**
   - Vercel auto-deploys from main branch
   - Can rollback to previous deployment in Vercel dashboard
   - Or git revert + push

---

## Post-Implementation Tasks

### Documentation to Create
1. Admin user guide
   - How to generate invite codes
   - How to manage users
   - How to ban/unban users
   - How to view audit logs

2. User registration guide
   - How to obtain an invite code
   - How to register with invite code
   - What to do if account is banned

### Environment Setup Checklist
- [ ] Set `REGISTRATION_MODE` in Render
- [ ] Set `ADMIN_EMAIL` in Render
- [ ] Promote first admin user in MongoDB
- [ ] Generate initial invite codes
- [ ] Test registration flow end-to-end
- [ ] Test admin panel access
- [ ] Test ban enforcement

---

## Estimated Implementation Time

| Phase | Backend | Frontend | Testing | Total |
|-------|---------|----------|---------|-------|
| Phase 1: Registration Gating | 3-4 hours | 1-2 hours | 1 hour | 5-7 hours |
| Phase 2: Admin Backend | 4-5 hours | - | 1 hour | 5-6 hours |
| Phase 3: Admin UI | - | 5-6 hours | 1 hour | 6-7 hours |
| Phase 4: Enhanced Security | 2-3 hours | 1 hour | 1 hour | 4-5 hours |
| Phase 5: Polish | 1 hour | 2-3 hours | 1 hour | 4-5 hours |
| **Total** | **10-13 hours** | **9-12 hours** | **5 hours** | **24-30 hours** |

---

## Summary

This plan provides a **comprehensive, production-ready admin system** for your self-hosted TextBee instance. The invite-only registration system immediately addresses your security concern about unauthorized access, while the admin panel gives you full control over user management.

The implementation is modular - you can deploy Phase 1 (registration gating) immediately for security, then add admin features progressively.

All changes are backward-compatible with the original TextBee architecture and leverage existing role infrastructure already in your codebase.
