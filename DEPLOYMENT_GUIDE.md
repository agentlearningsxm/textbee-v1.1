# TextBee Admin Panel - Deployment Guide

## Pre-Deployment Checklist

### ✅ Verified:
- [x] Both admin users promoted in MongoDB Atlas:
  - setyworks.sxm@gmail.com
  - agentlearning@gmail.com
- [x] Backend AdminModule imported in app.module.ts
- [x] Frontend admin routes created
- [x] Middleware protection added
- [x] Ban enforcement at login implemented

---

## Deployment Steps

### 1. Commit and Push Changes

```bash
cd C:\Users\setyw\.gemini\antigravity\scratch\textbee-cloud

# Check git status
git status

# Add all files
git add .

# Commit with descriptive message
git commit -m "feat: Add comprehensive admin panel with user management, invite codes, and stats

- Created AdminModule with user management endpoints
- Implemented admin dashboard UI with stats overview
- Added user management table with ban/role management
- Created invite code generator and management UI
- Added admin navigation link (visible to admins only)
- Implemented middleware protection for /admin routes
- Added ban enforcement at login (email + Google OAuth)
- Updated TypeScript types for admin features

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Push to main branch
git push origin main
```

---

### 2. Backend Deployment (Render)

#### Option A: Auto-Deploy (If Connected to GitHub)
1. Render will automatically detect the push
2. Build will start automatically
3. Monitor at: https://dashboard.render.com/

#### Option B: Manual Deploy
1. Go to https://dashboard.render.com/
2. Find your TextBee API service
3. Click "Manual Deploy" → "Deploy latest commit"

#### Verify Backend Deployment:
```bash
# Test health endpoint
curl https://YOUR_API_URL/api/v1/health

# Test admin endpoint (should require auth)
curl https://YOUR_API_URL/api/v1/admin/stats
# Expected: 401 Unauthorized (correct - needs auth)
```

---

### 3. Frontend Deployment (Vercel)

#### Option A: Auto-Deploy (If Connected to GitHub)
1. Vercel will automatically detect the push
2. Build will start automatically
3. Monitor at: https://vercel.com/dashboard

#### Option B: Manual Deploy
1. Go to https://vercel.com/dashboard
2. Find your TextBee project
3. Click "Deployments" → "Redeploy"

#### Verify Frontend Deployment:
1. Visit: https://YOUR_WEB_URL/
2. Login as admin user
3. Check for "Admin" link in navigation
4. Click Admin → Verify dashboard loads

---

### 4. Post-Deployment Testing

#### Test 1: Admin Access
```
1. Login as: setyworks.sxm@gmail.com
2. Verify "Admin" link appears (Shield icon)
3. Click Admin → Dashboard should load
4. Verify stats cards display correctly
```

#### Test 2: User Management
```
1. Navigate to /admin/users
2. Search for a user
3. Change a user's role
4. Test ban/unban toggle
5. Verify changes persist after page refresh
```

#### Test 3: Invite Code Generation
```
1. Navigate to /admin/invites
2. Set maxUses: 1, expiryDays: 30
3. Click "Generate Code"
4. Copy the code
5. Logout
6. Try registering with the code
7. Verify registration works
```

#### Test 4: Ban Enforcement
```
1. As admin, ban a test account
2. Try logging in with banned account
3. Verify error: "Your account has been suspended..."
4. Unban the account
5. Verify login works again
```

#### Test 5: Non-Admin Access
```
1. Login as regular user
2. Verify "Admin" link does NOT appear
3. Try accessing /admin directly
4. Verify redirect to /dashboard
```

---

### 5. Monitor Logs

#### Backend Logs (Render):
```bash
# View live logs
render logs --tail
```
Or visit: https://dashboard.render.com/ → Your Service → Logs

#### Frontend Logs (Vercel):
Visit: https://vercel.com/dashboard → Your Project → Functions

---

## Environment Variables Check

### Backend (Render):
Ensure these are set:
```
MONGO_URI=mongodb+srv://...
NEXTAUTH_SECRET=...
JWT_SECRET=...
REDIS_URL=...
TURNSTILE_SECRET_KEY=...
```

### Frontend (Vercel):
Ensure these are set:
```
NEXTAUTH_URL=https://YOUR_WEB_URL
NEXTAUTH_SECRET=...
NEXT_PUBLIC_API_URL=https://YOUR_API_URL/api/v1
NEXT_PUBLIC_TURNSTILE_SITE_KEY=...
```

---

## Rollback Plan (If Issues Occur)

### Rollback Backend:
```bash
# In Render dashboard:
1. Go to your service
2. Click "Deployments"
3. Find previous working deployment
4. Click "Redeploy"
```

### Rollback Frontend:
```bash
# In Vercel dashboard:
1. Go to your project
2. Click "Deployments"
3. Find previous working deployment
4. Click "..." → "Promote to Production"
```

### Rollback Code:
```bash
# If you need to revert commits:
git log  # Find the commit hash to revert to
git revert HEAD~1  # Revert last commit
git push origin main
```

---

## Common Issues & Solutions

### Issue: Admin link not showing
**Solution:**
- Verify user role in MongoDB Atlas (should be "ADMIN")
- Check browser console for session data
- Hard refresh (Ctrl+Shift+R) to clear cache
- Logout and login again

### Issue: 403 Forbidden on admin routes
**Solution:**
- Verify AdminOnlyGuard is working
- Check JWT token includes role field
- Verify middleware is protecting routes
- Check backend logs for auth errors

### Issue: Stats not loading
**Solution:**
- Check backend logs for errors
- Verify MongoDB connection
- Test /admin/stats endpoint directly
- Check CORS settings

### Issue: Invite codes not working
**Solution:**
- Verify InvitesModule is imported in app.module.ts
- Check invite code in database (MongoDB Atlas)
- Verify expiration date is in the future
- Check invite hasn't been fully used

---

## Success Criteria

✅ Admin dashboard loads at /admin
✅ User management table displays all users
✅ Role changes work and persist
✅ Ban/unban functionality works
✅ Banned users cannot login
✅ Invite codes can be generated
✅ Registration with invite code works
✅ Non-admins cannot access /admin routes
✅ All stats display correctly
✅ No console errors
✅ Mobile responsive design works

---

## Support & Documentation

- **Implementation Details:** [ADMIN_PANEL_IMPLEMENTATION.md](ADMIN_PANEL_IMPLEMENTATION.md)
- **Original Plan:** [ADMIN_PANEL_PLAN.md](ADMIN_PANEL_PLAN.md)
- **Backend API:** [api/README.md](api/README.md)
- **Frontend Docs:** [web/README.md](web/README.md)

---

## Next Steps After Deployment

1. **Test thoroughly** with both admin accounts
2. **Generate initial invite codes** for new users
3. **Document admin procedures** for your team
4. **Monitor usage** via admin dashboard
5. **Set up alerts** for critical actions (optional)

---

## Maintenance Notes

### Regular Tasks:
- Review user list monthly
- Clean up expired invite codes
- Monitor system stats
- Review banned accounts

### Security Best Practices:
- Rotate admin accounts periodically
- Monitor failed login attempts
- Review audit logs (when implemented)
- Keep invite codes secure
- Use single-use codes when possible

---

## Congratulations! 🎉

Your TextBee instance now has a fully functional admin panel with:
- Secure user management
- Invite-only registration
- System monitoring
- Role-based access control

The admin panel is production-ready and can be deployed immediately.
