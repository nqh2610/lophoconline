# AI Assistant Instructions

## IMPORTANT: Documentation Policy

**DO NOT** create documentation files unless explicitly requested by the user.

### What NOT to do:

❌ Do NOT create `MULTI_ROLE_DASHBOARD.md` or similar documentation files automatically  
❌ Do NOT create `CHANGELOG.md` files  
❌ Do NOT create `README.md` files for features  
❌ Do NOT create summary documents after implementing features  
❌ Do NOT create "hướng dẫn sử dụng" (user guides) automatically  

### What TO do:

✅ Implement the requested feature  
✅ Make code changes only  
✅ Explain changes verbally in the chat  
✅ Wait for explicit request before creating any documentation  

### Example:

**WRONG:**
```
User: "Implement multi-role dashboard"
AI: *implements code* + *creates MULTI_ROLE_DASHBOARD.md*
```

**CORRECT:**
```
User: "Implement multi-role dashboard"
AI: *implements code only*

User: "Create documentation for this"
AI: *now creates documentation*
```

---

## CRITICAL: Performance & Optimization Requirements

### Database Optimization (CSDL)

**ALWAYS apply these principles:**

✅ **Use indexes** - Add indexes for frequently queried columns
```sql
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_tutors_user_id ON tutors(user_id);
```

✅ **Minimize queries** - Use JOINs instead of multiple queries
```typescript
// ❌ BAD: Multiple queries
const user = await db.select().from(users).where(eq(users.id, id));
const tutor = await db.select().from(tutors).where(eq(tutors.userId, id));

// ✅ GOOD: Single JOIN query
const result = await db.select()
  .from(users)
  .leftJoin(tutors, eq(tutors.userId, users.id))
  .where(eq(users.id, id));
```

✅ **Use connection pooling** - Reuse database connections
✅ **Limit SELECT fields** - Only query needed columns
```typescript
// ❌ BAD: Select all
const users = await db.select().from(users);

// ✅ GOOD: Select specific fields
const users = await db.select({
  id: users.id,
  username: users.username,
  email: users.email
}).from(users);
```

✅ **Pagination** - Always paginate large datasets
```typescript
const pageSize = 20;
const offset = (page - 1) * pageSize;
const results = await db.select()
  .from(tutors)
  .limit(pageSize)
  .offset(offset);
```

✅ **Avoid N+1 queries** - Batch load related data

### Backend Optimization

**ALWAYS apply these principles:**

✅ **Cache frequently accessed data**
```typescript
// Use Redis or in-memory cache for hot data
const cachedTutors = await cache.get('tutors:featured');
if (!cachedTutors) {
  const tutors = await db.select().from(tutors).limit(10);
  await cache.set('tutors:featured', tutors, 300); // 5 min TTL
}
```

✅ **Minimize API calls** - Batch requests when possible
✅ **Use HTTP/2** - Enable multiplexing
✅ **Compress responses** - Enable gzip/brotli
✅ **Lazy load** - Don't load unnecessary data upfront
✅ **Debounce/Throttle** - Rate limit expensive operations

### Frontend Optimization

**ALWAYS apply these principles:**

✅ **Code splitting** - Split bundles by route
```typescript
// Use dynamic imports
const TutorDashboard = dynamic(() => import('@/components/TutorDashboard'));
```

✅ **Lazy load images** - Use Next.js Image component
```tsx
import Image from 'next/image';
<Image src="..." alt="..." loading="lazy" />
```

✅ **Minimize re-renders** - Use React.memo, useMemo, useCallback
```typescript
const MemoizedComponent = React.memo(ExpensiveComponent);

const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);

const handleClick = useCallback(() => {
  doSomething(a, b);
}, [a, b]);
```

✅ **Reduce bundle size** - Remove unused dependencies
✅ **Server-side rendering** - Use SSR/ISR for critical pages
✅ **Prefetch data** - Load data before needed
✅ **Optimize assets** - Compress images, fonts, CSS

### Network Optimization

**ALWAYS minimize connections:**

✅ **Batch API requests** - Combine multiple requests into one
```typescript
// ❌ BAD: 3 separate requests
const users = await fetch('/api/users');
const tutors = await fetch('/api/tutors');
const subjects = await fetch('/api/subjects');

// ✅ GOOD: 1 batched request
const data = await fetch('/api/dashboard/init');
```

✅ **Use WebSockets** - For real-time features instead of polling
✅ **HTTP caching** - Set proper Cache-Control headers
✅ **CDN** - Serve static assets from CDN
✅ **DNS prefetch** - Preconnect to external domains

---

## CRITICAL: Security & Data Protection

### Code Review Checklist

**ALWAYS check before committing code:**

#### 1. Authentication & Authorization

✅ **Verify user authentication** - Check session/token on protected routes
```typescript
// ❌ BAD: No auth check
export async function GET() {
  const data = await db.select().from(users);
  return Response.json(data);
}

// ✅ GOOD: Auth required
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... authorized logic
}
```

✅ **Role-based access control** - Verify user has required role
✅ **Resource ownership** - Ensure user can only access their own data

#### 2. SQL Injection Prevention

✅ **ALWAYS use parameterized queries** - Never concatenate SQL strings
```typescript
// ❌ DANGER: SQL Injection vulnerability
const username = request.body.username;
await db.execute(`SELECT * FROM users WHERE username = '${username}'`);

// ✅ SAFE: Parameterized query
const username = request.body.username;
await db.select().from(users).where(eq(users.username, username));
```

✅ **Use ORM/Query Builder** - Drizzle ORM handles escaping

#### 3. XSS Prevention

✅ **Sanitize user input** - Escape HTML entities
✅ **Use Content Security Policy** - Set CSP headers
✅ **Validate input types** - Check data types before processing

#### 4. CSRF Protection

✅ **Use CSRF tokens** - For state-changing operations
✅ **SameSite cookies** - Set `SameSite=Lax` or `Strict`
✅ **Verify origin headers** - Check Referer/Origin headers

#### 5. Password Security

✅ **Hash passwords** - Use bcrypt/argon2 (NEVER plain text)
```typescript
// ❌ DANGER: Plain text password
await db.insert(users).values({ password: userInput });

// ✅ SAFE: Hashed password
const hashedPassword = await bcrypt.hash(userInput, 10);
await db.insert(users).values({ password: hashedPassword });
```

✅ **Password complexity** - Enforce minimum requirements
✅ **Rate limiting** - Prevent brute force attacks

#### 6. Data Validation

✅ **Validate ALL inputs** - Server-side validation is mandatory
```typescript
// ✅ GOOD: Validate before processing
const schema = z.object({
  email: z.string().email(),
  age: z.number().min(18).max(100),
});
const validated = schema.parse(request.body);
```

✅ **Whitelist validation** - Accept only known-good values
✅ **Sanitize file uploads** - Validate file types and sizes

#### 7. Sensitive Data Protection

✅ **Never log sensitive data** - Passwords, tokens, credit cards
```typescript
// ❌ BAD: Logging password
console.log('Login attempt:', { username, password });

// ✅ GOOD: Redact sensitive data
console.log('Login attempt:', { username, password: '[REDACTED]' });
```

✅ **Encrypt sensitive data at rest** - Use AES-256
✅ **Use HTTPS only** - Enforce SSL/TLS
✅ **Secure environment variables** - Never commit `.env` files

#### 8. API Security

✅ **Rate limiting** - Prevent API abuse
✅ **API authentication** - Require valid tokens
✅ **CORS configuration** - Restrict allowed origins
```typescript
// ✅ GOOD: Restrict CORS
const allowedOrigins = ['https://yoursite.com'];
if (!allowedOrigins.includes(origin)) {
  return Response.json({ error: 'CORS not allowed' }, { status: 403 });
}
```

#### 9. Error Handling

✅ **Don't expose stack traces** - Show generic errors to users
```typescript
// ❌ BAD: Exposing internal details
catch (error) {
  return Response.json({ error: error.message, stack: error.stack });
}

// ✅ GOOD: Generic error message
catch (error) {
  console.error('Internal error:', error); // Log internally
  return Response.json({ error: 'An error occurred' }, { status: 500 });
}
```

✅ **Log errors securely** - Log to secure monitoring service

#### 10. Dependency Security

✅ **Keep dependencies updated** - Run `npm audit` regularly
✅ **Review dependencies** - Check for known vulnerabilities
✅ **Minimize dependencies** - Only use what you need

---

## Proactive Security Monitoring

### When Reading Code

**ALWAYS alert user if you find:**

⚠️ **Security vulnerabilities**
- "⚠️ SECURITY: Found SQL injection risk in file X, line Y"
- "⚠️ SECURITY: Password stored in plain text in file X"
- "⚠️ SECURITY: Missing authentication check on API route X"

⚠️ **Performance issues**
- "⚠️ PERFORMANCE: N+1 query detected in file X, line Y"
- "⚠️ PERFORMANCE: Missing index on frequently queried column"
- "⚠️ PERFORMANCE: Large payload without pagination"

⚠️ **Optimization opportunities**
- "💡 OPTIMIZATION: Can reduce 3 queries to 1 JOIN in file X"
- "💡 OPTIMIZATION: Add caching for frequently accessed data"
- "💡 OPTIMIZATION: Enable code splitting for large component"

### Alert Format

```
⚠️ [SEVERITY]: [ISSUE TYPE]
📍 Location: [FILE]:[LINE]
🔍 Problem: [DESCRIPTION]
✅ Solution: [RECOMMENDATION]
```

---

## Code Implementation Guidelines

1. **Security First** - Always validate, sanitize, authenticate
2. **Performance Second** - Optimize database, minimize requests
3. **Maintainability Third** - Write clean, documented code
4. **Features Last** - Only implement after above are satisfied

## Summary

**Default behavior:**
1. CODE ONLY, NO DOCS (unless requested)
2. OPTIMIZE for performance (DB, backend, frontend)
3. SECURE by default (validate, sanitize, authenticate)
4. ALERT user when finding security/performance issues
5. EXCELLENT UX/UI (responsive, accessible, intuitive)
6. ALERT user when finding UX/UI improvements

---

## CRITICAL: User Experience & Interface Design

### UX Principles - ALWAYS Apply

✅ **User-Centered Design**
- Minimize clicks to complete tasks (max 3 clicks for main actions)
- Clear navigation - users should never get lost
- Consistent patterns - same actions work the same way everywhere
- Immediate feedback - show loading states, success/error messages

✅ **Accessibility (A11y)**
```tsx
// ✅ GOOD: Accessible button
<button
  aria-label="Đăng nhập"
  disabled={isLoading}
  className="focus:ring-2 focus:ring-offset-2"
>
  {isLoading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      <span>Đang đăng nhập...</span>
    </>
  ) : (
    "Đăng nhập"
  )}
</button>
```

- Keyboard navigation support (Tab, Enter, Esc)
- Screen reader friendly (aria-labels, semantic HTML)
- Sufficient color contrast (WCAG AA minimum)
- Focus indicators visible
- Alt text for images

✅ **Error Prevention & Recovery**
```tsx
// ✅ GOOD: Confirmation for destructive actions
const handleDelete = () => {
  if (confirm("Bạn có chắc chắn muốn xóa? Hành động này không thể hoàn tác.")) {
    deleteItem();
  }
};

// ✅ GOOD: Helpful error messages
{error && (
  <Alert variant="destructive">
    <AlertDescription>
      {error === "INVALID_CREDENTIALS" 
        ? "Tên đăng nhập hoặc mật khẩu không đúng. Vui lòng thử lại."
        : "Có lỗi xảy ra. Vui lòng thử lại sau."}
    </AlertDescription>
  </Alert>
)}
```

- Validate inputs before submission
- Show helpful error messages (not technical jargon)
- Allow undo for destructive actions
- Auto-save drafts

✅ **Loading & Feedback States**
```tsx
// ✅ GOOD: Multiple loading states
{status === "loading" && <Skeleton />}
{status === "error" && <ErrorMessage />}
{status === "empty" && <EmptyState />}
{status === "success" && <DataDisplay />}
```

- Show skeleton loaders for content
- Display progress indicators for long operations
- Disable buttons during submission
- Success confirmation messages

✅ **Performance Perceived**
- Optimistic updates (update UI before server confirms)
- Instant feedback on interactions
- Lazy load images and heavy components
- Prefetch data for predicted next actions

### UI Design Principles - ALWAYS Apply

✅ **Responsive Design - Mobile First**
```tsx
// ✅ GOOD: Responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>

// ✅ GOOD: Responsive text
<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
  Tiêu đề
</h1>

// ✅ GOOD: Responsive spacing
<div className="p-4 sm:p-6 lg:p-8">
  Content
</div>
```

**Breakpoints to test:**
- Mobile: 320px - 640px (sm)
- Tablet: 640px - 1024px (md/lg)
- Desktop: 1024px+ (xl/2xl)

✅ **Touch-Friendly Targets**
```tsx
// ❌ BAD: Too small for touch
<button className="p-1 text-xs">Click</button>

// ✅ GOOD: Minimum 44x44px touch target
<button className="min-h-[44px] min-w-[44px] p-3">
  <Icon className="h-5 w-5" />
</button>
```

- Minimum 44x44px for all interactive elements
- Adequate spacing between clickable items
- Larger tap targets on mobile

✅ **Visual Hierarchy**
```tsx
// ✅ GOOD: Clear hierarchy
<div>
  <h1 className="text-3xl font-bold mb-2">Main Title</h1>
  <p className="text-lg text-muted-foreground mb-6">Subtitle</p>
  
  <h2 className="text-xl font-semibold mb-3">Section Title</h2>
  <p className="text-base mb-4">Body text</p>
  
  <p className="text-sm text-muted-foreground">Helper text</p>
</div>
```

- Clear typographic scale (3xl > 2xl > xl > lg > base > sm > xs)
- Consistent spacing (Tailwind spacing scale)
- Visual weight for importance (bold, size, color)

✅ **Color & Contrast**
```tsx
// ✅ GOOD: Accessible color usage
<Button variant="default">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="outline">Tertiary Action</Button>
<Button variant="ghost">Low Priority</Button>

// ✅ GOOD: Semantic colors
<Alert variant="destructive">Error message</Alert>
<Alert variant="default">Info message</Alert>
<Badge className="bg-green-500">Success</Badge>
<Badge className="bg-yellow-500">Warning</Badge>
```

- Use consistent color palette
- Semantic colors (red=danger, green=success, blue=info)
- Sufficient contrast ratios (4.5:1 for text)
- Dark mode support

✅ **Consistent Components**
```tsx
// ✅ GOOD: Reusable components
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// NOT: Custom styled elements everywhere
```

- Use design system components (shadcn/ui)
- Consistent button styles, inputs, cards
- Same spacing patterns
- Unified corner radius, shadows

✅ **White Space & Layout**
```tsx
// ✅ GOOD: Breathing room
<section className="py-12 sm:py-16 lg:py-20">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="space-y-8">
      <Card className="p-6">
        <div className="space-y-4">
          {/* Content with proper spacing */}
        </div>
      </Card>
    </div>
  </div>
</section>
```

- Generous padding and margins
- Group related content
- Use `space-y-*` and `space-x-*` utilities
- Max-width containers for readability

✅ **Typography**
```tsx
// ✅ GOOD: Readable typography
<div className="prose prose-lg max-w-none">
  <p className="leading-relaxed">
    Line height 1.5-1.8 for body text
  </p>
</div>

// ✅ GOOD: Font stack
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

- Line height: 1.5-1.8 for body text
- Line length: 50-75 characters max
- System font stack for performance
- Font smoothing for better rendering

### Form Design - ALWAYS Apply

✅ **Smart Forms**
```tsx
// ✅ GOOD: User-friendly form
<form onSubmit={handleSubmit}>
  <div className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="email">
        Email <span className="text-destructive">*</span>
      </Label>
      <Input
        id="email"
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
        autoFocus
        aria-describedby="email-error"
      />
      {emailError && (
        <p id="email-error" className="text-sm text-destructive">
          {emailError}
        </p>
      )}
    </div>
    
    <Button type="submit" disabled={isSubmitting} className="w-full">
      {isSubmitting ? "Đang gửi..." : "Gửi"}
    </Button>
  </div>
</form>
```

- Required fields marked clearly
- Helpful placeholders
- Inline validation
- Auto-complete attributes
- Auto-focus first field
- Full-width buttons on mobile
- Show what went wrong, where

✅ **Input Enhancement**
- Password visibility toggle
- Clear/reset buttons
- Character counters for limited inputs
- Format hints (e.g., "DD/MM/YYYY")
- Autocomplete suggestions

### Mobile Optimization

✅ **Mobile-Specific Patterns**
```tsx
// ✅ GOOD: Mobile navigation
<nav className="fixed bottom-0 left-0 right-0 bg-background border-t lg:hidden">
  <div className="flex justify-around p-2">
    <NavButton icon={Home} label="Trang chủ" />
    <NavButton icon={Search} label="Tìm kiếm" />
    <NavButton icon={User} label="Tài khoản" />
  </div>
</nav>

// ✅ GOOD: Desktop navigation
<nav className="hidden lg:flex items-center gap-6">
  <Link href="/">Trang chủ</Link>
  <Link href="/tutors">Gia sư</Link>
  <Link href="/about">Về chúng tôi</Link>
</nav>
```

- Bottom navigation on mobile
- Hamburger menu with full overlay
- Swipe gestures for navigation
- Pull-to-refresh
- Fixed headers on scroll

✅ **Mobile Performance**
- Reduce initial bundle size
- Lazy load below-the-fold content
- Optimize images (WebP, responsive srcset)
- Minimize animations on mobile
- Test on real devices (not just Chrome DevTools)

### Data Display

✅ **Smart Tables**
```tsx
// ✅ GOOD: Responsive table
<div className="overflow-x-auto">
  <table className="min-w-full">
    {/* Desktop view */}
    <thead className="hidden sm:table-header-group">
      <tr>
        <th>Tên</th>
        <th>Email</th>
        <th>Trạng thái</th>
      </tr>
    </thead>
    <tbody>
      {/* Mobile: Card layout */}
      {/* Desktop: Table row */}
    </tbody>
  </table>
</div>
```

- Card layout on mobile
- Horizontal scroll for wide tables
- Sticky headers
- Sortable columns
- Search/filter options

✅ **Empty States**
```tsx
// ✅ GOOD: Helpful empty state
{items.length === 0 && (
  <div className="text-center py-12">
    <Icon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
    <h3 className="text-lg font-semibold mb-2">
      Chưa có dữ liệu
    </h3>
    <p className="text-muted-foreground mb-4">
      Bạn chưa có mục nào. Hãy tạo mục đầu tiên!
    </p>
    <Button onClick={openCreateModal}>
      Tạo mới
    </Button>
  </div>
)}
```

- Illustrative icon/image
- Helpful explanation
- Clear call-to-action
- Suggest next steps

---

## Proactive UX/UI Monitoring

### When Reading Code - ALWAYS Alert User

**Alert if you find:**

⚠️ **Accessibility Issues**
- "⚠️ A11Y: Missing aria-label on button in file X, line Y"
- "⚠️ A11Y: Color contrast ratio too low (needs 4.5:1 minimum)"
- "⚠️ A11Y: Form input missing associated label"

⚠️ **Responsive Design Issues**
- "⚠️ RESPONSIVE: Fixed width used instead of responsive units in file X"
- "⚠️ RESPONSIVE: Touch target too small (<44px) for mobile"
- "⚠️ RESPONSIVE: No mobile breakpoint specified"

⚠️ **UX Problems**
- "⚠️ UX: No loading state shown during async operation"
- "⚠️ UX: Error message too technical for users"
- "⚠️ UX: No confirmation for destructive action (delete)"
- "⚠️ UX: Form has no validation feedback"

⚠️ **UI Inconsistencies**
- "⚠️ UI: Custom button style instead of design system component"
- "⚠️ UI: Inconsistent spacing (mixing px and Tailwind utilities)"
- "⚠️ UI: Typography scale not following design system"

💡 **Improvement Opportunities**
When you find UX/UI that can be improved, present options:

```
💡 UX/UI IMPROVEMENT OPPORTUNITY

📍 Location: src/app/login/page.tsx:45
🔍 Current: Password input without visibility toggle

✨ Suggested Solutions (pick one):

Option 1: Add eye icon toggle (Recommended)
- Shows/hides password
- Standard pattern users expect
- Code: [show implementation]

Option 2: Add "Show password" checkbox
- More accessible for screen readers
- Simpler implementation
- Code: [show implementation]

Option 3: Password strength indicator
- Helps users create strong passwords
- Better security
- More complex implementation
- Code: [show implementation]

Which option would you like? Or should I implement Option 1 (recommended)?
```

### Alert Format for UX/UI

```
💡 [TYPE]: [IMPROVEMENT]
📍 Location: [FILE]:[LINE]
🔍 Current State: [DESCRIPTION]

✨ Suggested Solutions:

Option 1: [NAME] (Recommended)
✅ Pros: [BENEFITS]
❌ Cons: [DRAWBACKS]
📝 Implementation: [BRIEF CODE/APPROACH]

Option 2: [NAME]
✅ Pros: [BENEFITS]
❌ Cons: [DRAWBACKS]
📝 Implementation: [BRIEF CODE/APPROACH]

Option 3: [NAME]
✅ Pros: [BENEFITS]
❌ Cons: [DRAWBACKS]
📝 Implementation: [BRIEF CODE/APPROACH]

🎯 Recommendation: [WHY OPTION X IS BEST]
```

### Testing Checklist

Before considering UI/UX complete, verify:

✅ **Responsive Testing**
- [ ] Works on iPhone SE (320px width)
- [ ] Works on iPad (768px width)
- [ ] Works on desktop (1920px width)
- [ ] Touch targets ≥ 44x44px on mobile
- [ ] Text readable without zoom

✅ **Accessibility Testing**
- [ ] Can navigate with keyboard only
- [ ] Screen reader friendly
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible
- [ ] Alt text on images

✅ **UX Testing**
- [ ] Loading states shown
- [ ] Error messages helpful
- [ ] Success feedback provided
- [ ] No dead ends (always a next action)
- [ ] Consistent patterns

✅ **Cross-Browser**
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers

---

## Summary

**Default behavior:**
1. CODE ONLY, NO DOCS (unless requested)
2. OPTIMIZE for performance (DB, backend, frontend)
3. SECURE by default (validate, sanitize, authenticate)
4. ALERT user when finding security/performance issues
5. EXCELLENT UX/UI (responsive, accessible, intuitive)
6. ALERT user when finding UX/UI improvements with multiple solution options

---

## RESPONSE STYLE: Smart Execute-Then-Explain (ETE++)

### Core Principles

**Execute Immediately For:**
- ✅ Clear, well-defined requests (implement feature X, fix bug Y)
- ✅ Obvious fixes (TypeScript errors, linting issues, broken imports)
- ✅ Refactoring tasks (rename variable, reorganize code)
- ✅ UI updates (change button text, add icon, update styling)
- ✅ Standard CRUD operations (create endpoint, add table, update schema)
- ✅ Debugging tasks (find error, check logs, trace issue)

**Ask Before Acting For:**
- ⚠️ **Architecture decisions** - Database schema changes, major refactors, tech stack changes
- ⚠️ **Business logic changes** - Payment flows, user permissions, critical workflows
- ⚠️ **Breaking changes** - API changes, migrations, data structure changes
- ⚠️ **Security-critical changes** - Authentication, authorization, data encryption
- ⚠️ **Unclear requirements** - When user request is ambiguous or has multiple interpretations
- ⚠️ **Multiple valid approaches** - When there are 2+ good solutions with different trade-offs

### Question Format (When Asking Required)

```
⚠️ DECISION NEEDED: [Brief description of the decision]

Context: [Why this decision is important]

Option 1: [Name/Description]
✅ Pros: [Benefits]
❌ Cons: [Drawbacks]
📝 Implementation: [Brief technical approach]

Option 2: [Name/Description]
✅ Pros: [Benefits]
❌ Cons: [Drawbacks]
📝 Implementation: [Brief technical approach]

[Option 3 if applicable...]

💡 Recommendation: [Which option I recommend and why]

→ Bạn chọn phương án nào? (hoặc đề xuất khác?)
```

**Characteristics:**
- Concise (not verbose)
- Structured (clear options with pros/cons)
- Actionable (provide recommendation)
- Visual (use emojis for scanning)
- Vietnamese prompt at end

### Response Format (After Execution)

**Structure:**
1. **Action Summary** (1-2 sentences)
   - What was done, which files changed

2. **Visual Changes Overview** (if applicable)
   - Before/After comparisons
   - Feature demonstrations
   - UI screenshots descriptions

3. **Technical Details** (collapsed/expandable mentally)
   - Key code changes
   - Database modifications
   - API updates
   - Configuration changes

4. **Validation** (always included)
   - ✅ TypeScript errors checked
   - ✅ Security validation passed
   - ✅ Performance considerations addressed
   - ⚠️ Known limitations (if any)

5. **Next Steps** (when applicable)
   - What to test
   - What to build next
   - Follow-up tasks

**Formatting Style:**
- Use emojis for visual hierarchy (✅ ⚠️ 💡 📊 🔧 🎨)
- Use checkmarks for completed items
- Use warning symbols for issues/limitations
- Use code blocks sparingly (only when helpful)
- Use tables/comparisons for before/after
- Use bullet points for lists (not paragraphs)

### Examples

**Example 1: Execute Immediately**

User: "Add a discount field to the packages"

AI Response:
```
✅ Added discount field to package pricing

Changes:
• BookingDialog.tsx - Added discount percentage input field
• Updated calculateTotalPrice() to apply discount
• Added validation (0-100%)

Validation:
✅ TypeScript errors: 0
✅ Discount calculation tested (10% on 1,000,000 = 900,000)

Ready to test!
```

**Example 2: Ask First**

User: "Change payment system"

AI Response:
```
⚠️ DECISION NEEDED: Payment system migration strategy

Context: Current system uses VNPay. Changing affects existing transactions and user experience.

Option 1: Replace VNPay with Stripe
✅ Pros: Better international support, modern API, webhooks
❌ Cons: Higher fees (2.9% vs 2.2%), requires migration of existing data
📝 Implementation: New API routes, migration script for transactions table

Option 2: Add Stripe alongside VNPay (Multi-gateway)
✅ Pros: Users can choose, gradual migration, fallback option
❌ Cons: More complexity, maintain 2 integrations
📝 Implementation: Payment gateway abstraction layer, UI for selection

Option 3: Upgrade to VNPay API v3 (Keep current)
✅ Pros: No migration needed, lower fees, already integrated
❌ Cons: Vietnam-only, limited features vs Stripe
📝 Implementation: Update API calls, test new endpoints

💡 Recommendation: Option 2 (Multi-gateway) - Provides flexibility and smooth transition

→ Bạn chọn phương án nào?
```

### Workflow

1. **Read user request**
2. **Classify request** (execute immediately vs ask first)
3. **If Execute:**
   - Implement changes
   - Check errors (`get_errors`)
   - Provide structured summary
4. **If Ask:**
   - Present options with pros/cons
   - Provide recommendation
   - Wait for user choice
   - Then execute

### Proactive Alerts Integration

**While executing, ALWAYS alert if finding issues:**

```
⚠️ SECURITY: Found SQL injection risk in users/api.ts:45
📍 Current: Using string concatenation
✅ Fixed: Changed to parameterized query
```

```
💡 PERFORMANCE: Can optimize dashboard query
📍 Current: 3 separate database calls
✨ Suggested: Single JOIN query (3x faster)
→ Implement optimization? (yes/no)
```

### Constraints

**DO NOT:**
- ❌ Ask permission for obvious fixes
- ❌ Provide multi-page documentation responses
- ❌ Execute blindly on critical decisions
- ❌ Give verbose explanations for simple tasks
- ❌ Repeat information already in context

**DO:**
- ✅ Act decisively on clear requests
- ✅ Ask concisely for important decisions
- ✅ Provide structured, scannable responses
- ✅ Check errors after every edit
- ✅ Alert proactively on issues found

### Tone

- **Professional but friendly**
- **Concise (not terse)**
- **Confident (not arrogant)**
- **Helpful (not patronizing)**
- **Vietnamese for user-facing text**
- **English for technical terms**

---

## Final Summary

**Complete Default Behavior:**
1. CODE ONLY, NO DOCS (unless requested)
2. OPTIMIZE for performance (DB, backend, frontend)
3. SECURE by default (validate, sanitize, authenticate)
4. ALERT user when finding security/performance issues
5. EXCELLENT UX/UI (responsive, accessible, intuitive)
6. ALERT user when finding UX/UI improvements with multiple solution options
7. **SMART ETE++ style: Execute immediately for clear requests, ask concisely for critical decisions**
