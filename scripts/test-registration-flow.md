# Test Registration Flow - Manual Test Checklist

## 🧪 Test Case 1: New User Registration & Tutor Registration

### Prerequisites
- Browser with clean session (incognito/private mode)
- Server running on localhost:3000
- Database accessible

### Steps:

#### 1. **User Signup**
- [ ] Go to http://localhost:3000/signup
- [ ] Fill form with new credentials:
  - Username: `test_tutor_new`
  - Email: `testtutor@example.com`
  - Password: `Test@123`
- [ ] Click "Đăng ký"
- [ ] ✅ **Expected**: Redirect to login page with success message

#### 2. **User Login**
- [ ] Login with credentials above
- [ ] ✅ **Expected**: Login successful, redirect to homepage
- [ ] ✅ **Check Navbar**:
  - "Trở thành gia sư" button IS visible
  - User menu shows username
  - NO dashboard links (user has no roles yet)

#### 3. **Click "Trở thành gia sư"**
- [ ] Click "Trở thành gia sư" button in Navbar
- [ ] ✅ **Expected**: Navigate to `/tutor-registration`
- [ ] ✅ **Check**: Registration form displays (NOT redirected)

#### 4. **Fill Tutor Registration Form**
- [ ] Fill all required fields (5 steps)
- [ ] Submit form
- [ ] ✅ **Expected**:
  - Toast: "Đăng ký thành công! 🎉"
  - Console log: "Refreshing session to update roles..."
  - Console log: "Session refreshed successfully"
  - Console log: "Redirecting to dashboard..."
  - After 1.5s: Page redirects to `/tutor/dashboard`

#### 5. **Check Dashboard**
- [ ] After redirect to `/tutor/dashboard`
- [ ] ✅ **Check**:
  - Yellow banner: "Hồ sơ của bạn đang chờ duyệt"
  - Dashboard content loads
  - Navbar shows "Dashboard gia sư" link in menu
  - "Trở thành gia sư" button is HIDDEN

#### 6. **Try to Access Registration Again**
- [ ] Try to navigate to `/tutor-registration` (via URL bar)
- [ ] ✅ **Expected**:
  - Toast: "Bạn đã có hồ sơ gia sư"
  - After 1.5s: Redirect to `/tutor/edit-profile`
  - "Trở thành gia sư" button still HIDDEN

---

## 🧪 Test Case 2: Existing Tutor Login

### Prerequisites
- User with tutor role already in database (e.g., `tutor_hung`)

### Steps:

#### 1. **Login as Existing Tutor**
- [ ] Logout current user
- [ ] Login as `tutor_hung` / password
- [ ] ✅ **Expected**: Login successful

#### 2. **Check Navbar**
- [ ] ✅ **Check**:
  - "Trở thành gia sư" button is HIDDEN
  - User menu has "Dashboard gia sư" link
  - Click menu → See "Dashboard gia sư" item

#### 3. **Access Dashboard**
- [ ] Click "Dashboard gia sư"
- [ ] ✅ **Expected**: Navigate to `/tutor/dashboard`
- [ ] ✅ **Check**:
  - If pending: Yellow banner visible
  - If approved: No banner
  - Dashboard loads correctly

#### 4. **Try Registration Page**
- [ ] Navigate to `/tutor-registration`
- [ ] ✅ **Expected**:
  - Immediately shows toast: "Bạn đã có hồ sơ gia sư"
  - Redirects to `/tutor/edit-profile`

---

## 🧪 Test Case 3: User with Multiple Roles

### Prerequisites
- Create user with both tutor and student roles:
  ```sql
  UPDATE users SET role = '["tutor", "student"]' WHERE username = 'student';
  ```

### Steps:

#### 1. **Login as Multi-Role User**
- [ ] Login as user with multiple roles
- [ ] ✅ **Check Navbar**:
  - "Trở thành gia sư" is HIDDEN
  - User menu shows BOTH:
    - "Dashboard gia sư"
    - "Dashboard học viên"

#### 2. **Access Both Dashboards**
- [ ] Click "Dashboard gia sư" → Should work
- [ ] Go back, click "Dashboard học viên" → Should work
- [ ] ✅ **Expected**: Both dashboards accessible

---

## 🧪 Test Case 4: Security Tests

### Test 4a: Unauthenticated Access
- [ ] Logout
- [ ] Try to access `/tutor-registration`
- [ ] ✅ **Expected**: Redirect to `/login?redirectTo=%2Ftutor-registration`

### Test 4b: Unauthenticated Dashboard Access
- [ ] Try to access `/tutor/dashboard`
- [ ] ✅ **Expected**: Redirect to `/login?redirectTo=...`

### Test 4c: Public API Check
- [ ] Open: http://localhost:3000/api/tutors?limit=100
- [ ] ✅ **Check**: All tutors have `"approvalStatus": "approved"`
- [ ] ✅ **Check**: No pending/rejected tutors visible

---

## ❌ Common Issues to Watch For

### Issue 1: "Trở thành gia sư" still visible after registration
**Cause**: Session not refreshed
**Fix**: Check console logs for session refresh errors

### Issue 2: Redirect loop at tutor-registration
**Cause**: Session roles don't match database
**Fix**: Clear browser cache, logout/login again

### Issue 3: Yellow banner not showing
**Cause**: Tutor profile fetch failed or wrong approval_status
**Fix**: Check console logs, verify database data

### Issue 4: Form flashes then redirects
**Cause**: Middleware blocking before session refresh
**Fix**: This should be fixed with window.location.href

---

## 📊 Database Verification

After completing tests, verify database state:

```sql
-- Check user roles
SELECT id, username, role FROM users WHERE username LIKE 'test_%';

-- Check tutor profiles
SELECT t.id, u.username, t.approval_status, t.is_active
FROM tutors t
JOIN users u ON u.id = t.user_id
WHERE u.username LIKE 'test_%';

-- Verify role consistency
SELECT u.id, u.username, u.role, t.id as tutor_id
FROM users u
LEFT JOIN tutors t ON t.user_id = u.id
WHERE u.username LIKE 'test_%';
```

Expected results:
- User has `role = '["tutor"]'`
- Tutor has `approval_status = 'pending'`
- Tutor has `is_active = 0` or `1` (depends on your logic)
