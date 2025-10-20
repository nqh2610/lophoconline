# Security Guide - LopHoc.Online

## 🔒 Authentication & Authorization

### 1. NextAuth Implementation

**File**: `src/lib/auth.ts`

```typescript
// JWT-based authentication với bcrypt password hashing
- Provider: CredentialsProvider (username + password)
- Session Strategy: JWT
- Max Age: 30 days
- Password Hashing: bcrypt (10 rounds)
```

**Security Features**:
- ✅ Password không lưu plain text
- ✅ Session được encrypt trong JWT
- ✅ Check isActive trước khi login
- ✅ Automatic session refresh
- ✅ Secure cookie với httpOnly flag

### 2. Middleware Protection

**File**: `src/middleware.ts`

```typescript
// Role-based access control using getToken from next-auth/jwt
export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  // Not authenticated → redirect to "/"
  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Check role-based access
  // ...
}

export const config = {
  matcher: ["/admin/:path*", "/tutor/:path*", "/student/:path*"],
};
```

**Protection Rules**:
- Not authenticated → Redirect to `/` (no callbackUrl leak)
- `/admin/*` → Chỉ role='admin', else redirect to `/`
- `/tutor/*` → Chỉ role='tutor', else redirect to `/`
- `/student/*` → Chỉ role='student', else redirect to `/`
- All unauthorized access → Clean redirect to home page

### 3. API Route Protection

**Pattern**: Tất cả admin API routes đều check role

```typescript
const session = await getServerSession(authOptions);

if (!session?.user || session.user.role !== 'admin') {
  return NextResponse.json(
    { error: 'Unauthorized - Admin access required' },
    { status: 403 }
  );
}
```

**Protected Routes**:
- ✅ `/api/admin/users/*`
- ✅ `/api/admin/tutors/*`
- ✅ `/api/admin/students/*`
- ✅ `/api/admin/transactions/*`
- ✅ `/api/admin/financial/*`

---

## 🛡️ Data Security

### 1. Password Security

**Hashing**:
```typescript
// Storage: src/lib/storage.ts
const hashedPassword = await bcrypt.hash(plainPassword, 10);
```

**Verification**:
```typescript
const isValid = await bcrypt.compare(plainPassword, hashedPassword);
```

**Never**:
- ❌ Return password in API responses
- ❌ Log passwords
- ❌ Store plain text passwords
- ❌ Send passwords in URLs

### 2. SQL Injection Prevention

**Drizzle ORM** tự động parameterize queries:

```typescript
// ✅ SAFE - Parameterized
await db.select()
  .from(users)
  .where(eq(users.username, username));

// ❌ DANGEROUS - Raw SQL
await db.execute(`SELECT * FROM users WHERE username = '${username}'`);
```

**Always**:
- ✅ Use Drizzle ORM methods
- ✅ Use prepared statements
- ✅ Validate input data
- ✅ Use Zod schemas for validation

### 3. XSS Prevention

**React** tự động escape output:
- ✅ Automatic escaping trong JSX
- ✅ Use `dangerouslySetInnerHTML` cẩn thận
- ✅ Sanitize user input before rendering

---

## 🔐 Input Validation

### 1. Zod Schemas

**Example**: User creation

```typescript
const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'tutor', 'student']),
  phone: z.string().optional(),
});
```

### 2. Validation Points

**Frontend**:
- Form validation (React Hook Form + Zod)
- Input sanitization
- Client-side checks

**Backend**:
- API route validation
- Database constraints
- Business logic validation

---

## 🚫 Security Best Practices Implemented

### ✅ Authentication
- [x] JWT-based sessions
- [x] Bcrypt password hashing (10 rounds)
- [x] isActive check before login
- [x] Session expiration (30 days)
- [x] Secure cookies (httpOnly, secure in production)

### ✅ Authorization
- [x] Role-based access control (RBAC)
- [x] Middleware protection for routes
- [x] API route authentication
- [x] Per-endpoint authorization checks
- [x] Prevent CSRF with SameSite cookies

### ✅ Data Protection
- [x] No password in API responses
- [x] SQL injection prevention (ORM)
- [x] XSS prevention (React escaping)
- [x] Input validation (Zod schemas)
- [x] Parameterized queries only

### ✅ User Management
- [x] Account locking (isActive flag)
- [x] Cannot delete own admin account
- [x] Cannot deactivate own account
- [x] Audit logging (WHO did WHAT WHEN)
- [x] Email/username uniqueness check

### ✅ Query Optimization
- [x] Batch fetching (reduce N+1 queries)
- [x] Use inArray for bulk operations
- [x] Pagination for large datasets
- [x] Index on foreign keys
- [x] Connection pooling (15 connections)

---

## ⚠️ Security Checklist for Production

### Before Deployment:

#### 1. Environment Variables
```bash
# ✅ Must set trong .env
NEXTAUTH_SECRET=<64-character-random-string>
NEXTAUTH_URL=https://yourdomain.com
DATABASE_URL=mysql://user:pass@host:3306/db
NODE_ENV=production
```

#### 2. Password Policy
- [ ] Enforce minimum length (8+ characters)
- [ ] Require complexity (uppercase, lowercase, numbers, symbols)
- [ ] Implement rate limiting for login attempts
- [ ] Add CAPTCHA after failed attempts

#### 3. HTTPS/SSL
- [ ] Enable HTTPS for all routes
- [ ] Set secure flag on cookies
- [ ] Use HSTS headers
- [ ] Implement CSP headers

#### 4. Rate Limiting
```typescript
// TODO: Implement với express-rate-limit hoặc upstash
// Limit: 100 requests/15 minutes per IP
```

#### 5. Logging & Monitoring
- [ ] Log all authentication attempts
- [ ] Log all admin actions
- [ ] Monitor failed login attempts
- [ ] Set up alerts for suspicious activity
- [ ] Use audit_logs table

#### 6. Database
- [ ] Change default MySQL root password
- [ ] Create separate DB user với limited permissions
- [ ] Enable slow query log
- [ ] Regular backups
- [ ] Encrypt backups

#### 7. Dependencies
```bash
# Check for vulnerabilities
npm audit
npm audit fix

# Keep dependencies updated
npm outdated
npm update
```

---

## 🔍 Security Testing

### 1. Test Authentication
```bash
# Test invalid credentials
curl -X POST http://localhost:3000/api/auth/signin \
  -d '{"username":"admin","password":"wrong"}' \
  -H "Content-Type: application/json"

# Expected: 401 Unauthorized
```

### 2. Test Authorization
```bash
# Try access admin route as student
# Expected: Redirect to / or 403 Forbidden
```

### 3. Test SQL Injection
```bash
# Try malicious input
curl "http://localhost:3000/api/admin/users?search=' OR '1'='1"

# Expected: Safely escaped, returns empty or error
```

### 4. Test XSS
```typescript
// Try inject <script> tag trong form
username: "<script>alert('XSS')</script>"

// Expected: Escaped as text, not executed
```

---

## 📝 Security Audit Log

**Table**: `audit_logs`

```sql
CREATE TABLE audit_logs (
  id BIGINT UNSIGNED PRIMARY KEY,
  user_id INT,          -- Who did it
  action VARCHAR(100),  -- What action (create, update, delete)
  entity_type VARCHAR(50), -- Table name (users, tutors, etc)
  entity_id INT,        -- Record ID
  changes TEXT,         -- JSON of changes
  ip_address VARCHAR(45), -- IP address
  user_agent TEXT,      -- Browser info
  created_at TIMESTAMP
);
```

**Usage**:
```typescript
await db.insert(auditLogs).values({
  userId: session.user.id,
  action: 'delete_user',
  entityType: 'users',
  entityId: deletedUserId,
  changes: JSON.stringify({ before: user }),
  ipAddress: request.headers.get('x-forwarded-for'),
  userAgent: request.headers.get('user-agent'),
});
```

---

## 🚨 Incident Response

### If Security Breach Detected:

1. **Immediate Actions**:
   - Change all admin passwords
   - Revoke all active sessions
   - Check audit logs for suspicious activity
   - Block suspicious IPs

2. **Investigation**:
   - Review server logs
   - Check database for unauthorized changes
   - Identify attack vector
   - Document timeline

3. **Recovery**:
   - Restore from backup if needed
   - Patch vulnerability
   - Update security measures
   - Notify affected users

4. **Prevention**:
   - Update dependencies
   - Add additional monitoring
   - Implement new security controls
   - Train team on security

---

## 📚 References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NextAuth.js Security](https://next-auth.js.org/security)
- [Drizzle ORM Security](https://orm.drizzle.team/docs/overview)
- [bcrypt Best Practices](https://github.com/kelektiv/node.bcrypt.js#security-issues-and-concerns)

---

## ✅ Current Security Status

**Last Updated**: 2025-10-19

| Category | Status | Notes |
|----------|--------|-------|
| Authentication | ✅ Secure | JWT + bcrypt |
| Authorization | ✅ Secure | Role-based + middleware |
| SQL Injection | ✅ Protected | Drizzle ORM |
| XSS | ✅ Protected | React auto-escape |
| CSRF | ✅ Protected | SameSite cookies |
| Password Security | ✅ Secure | bcrypt 10 rounds |
| Session Management | ✅ Secure | JWT 30-day expiry |
| API Protection | ✅ Secure | Auth checks on all routes |
| Input Validation | ✅ Implemented | Zod schemas |
| Query Optimization | ✅ Optimized | Batch queries, no N+1 |

**Overall**: System is secure for development and testing. Follow production checklist before deployment.
