# Changelog - LopHoc.Online

## [2.0.1] - 2025-10-19 - Security Fix

### Fixed
- **Middleware Redirect Issue**: Fixed unauthorized access showing NextAuth callback URL
  - **Before**: `/admin` (not logged in) → `/?callbackUrl=http%3A%2F%2Flocalhost%3A3000%2Fadmin`
  - **After**: `/admin` (not logged in) → `/` (clean redirect)
  - Changed from `withAuth` to custom middleware using `getToken`
  - No information leakage về protected routes

### Security Improvements
- ✅ Clean redirect without exposing callback URL
- ✅ Prevent route enumeration
- ✅ Better user experience (no confusing URLs)

---

## [2.0.0] - 2025-10-19 - Major Release

### Added - Authentication & Authorization
- ✅ NextAuth JWT-based authentication
- ✅ Bcrypt password hashing (10 rounds)
- ✅ Role-based access control (admin, student, tutor)
- ✅ Middleware protection for routes
- ✅ Session management (30 days)
- ✅ Login/Logout functionality
- ✅ Account locking (isActive flag)

### Added - Admin Features
- ✅ Complete User Management System (`/admin/users`)
  - Create, Read, Update, Delete users
  - Search and filter by role/status
  - Lock/Unlock accounts
  - Pagination (10 items per page)
  - Optimized batch queries (no N+1)
- ✅ Admin Dashboard with statistics
- ✅ Admin Navigation component
- ✅ Admin Layout with security check

### Added - Student Features
- ✅ Student Dashboard (`/student`)
- ✅ Student Navigation menu
- ✅ Student Layout with security check
- ✅ Quick links to all student features

### Added - Tutor Features
- ✅ Tutor Dashboard (`/tutor`)
- ✅ Tutor Navigation menu
- ✅ Tutor Layout with security check
- ✅ Quick links to all tutor features

### Added - API Endpoints
- ✅ `GET /api/admin/users` - List users (pagination, search, filter)
- ✅ `POST /api/admin/users` - Create user
- ✅ `GET /api/admin/users/[id]` - Get user detail
- ✅ `PUT /api/admin/users/[id]` - Update user
- ✅ `DELETE /api/admin/users/[id]` - Delete user
- ✅ `PATCH /api/admin/users/[id]/status` - Toggle user status

### Added - Components
- ✅ AdminNav.tsx - Admin navigation
- ✅ Updated Navbar.tsx - NextAuth integration
- ✅ Updated LoginDialog.tsx - NextAuth login

### Added - Documentation
- ✅ LOGIN_GUIDE.md - Login instructions
- ✅ SECURITY_GUIDE.md - Security documentation
- ✅ SYSTEM_READY.md - System overview
- ✅ CHANGELOG.md - This file

### Changed - Security
- ✅ Updated auth.ts - Added isActive check
- ✅ Updated Navbar - Use NextAuth session
- ✅ Updated LoginDialog - Use NextAuth signIn

### Changed - Performance
- ✅ Optimized admin/users API - Batch fetching
- ✅ Reduced N+1 queries (from ~10 to 3 queries)
- ✅ Use inArray for bulk operations
- ✅ Connection pooling (15 connections)

### Fixed - Type Errors
- ✅ Fixed session.user.id type mismatches (string → number)
- ✅ Fixed notification type error
- ✅ Fixed tutor creation missing required fields

### Test Accounts Created
- ✅ admin/123456 (Admin role)
- ✅ student1/123456 (Student role)
- ✅ tutor1/123456 (Tutor role, verified)

---

## [1.0.0] - Initial Release

### Features
- Basic user registration
- Tutor profiles
- Student profiles
- Subject catalog
- Time slot management
- Basic dashboard

---

## Notes

### Breaking Changes in 2.0.0
- Authentication system changed from localStorage to NextAuth
- All routes now require authentication
- Role-based access control enforced

### Migration Guide (if upgrading from 1.0.0)
1. Run `node setup-test-accounts.js` to create test accounts
2. Clear browser cache and cookies
3. Login with new credentials
4. All existing sessions will be invalidated

### Known Issues
- Social login (Google, Facebook) - UI only, not implemented
- Email verification - Not implemented
- Password reset - UI only, not implemented
- Rate limiting - Not implemented

### Next Release (2.1.0) - Planned
- [ ] Email verification
- [ ] Password reset functionality
- [ ] Rate limiting
- [ ] File upload for avatars
- [ ] Email notifications
