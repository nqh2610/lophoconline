# Design Guidelines for LopHoc.Online

## Design Approach
**Reference-Based with Educational Focus**: Drawing inspiration from leading educational platforms (Udemy, Coursera, Preply) while incorporating Vietnamese market preferences. The design emphasizes trust, professionalism, and clarity - essential for an educational marketplace connecting tutors and students.

## Core Design Elements

### A. Color Palette

**Primary Brand Colors (Dark Mode):**
- Primary Blue: 210 85% 45% (trust, education, professionalism)
- Surface Dark: 220 15% 12% (main background)
- Surface Light: 220 15% 18% (cards, elevated surfaces)

**Primary Brand Colors (Light Mode):**
- Primary Blue: 210 85% 50%
- Surface Light: 0 0% 98% (main background)
- Surface White: 0 0% 100% (cards)

**Accent & Status Colors:**
- Success Green: 142 70% 45% (verified tutors, completed lessons)
- Warning Orange: 35 85% 55% (pending reviews, trial lessons)
- Error Red: 0 70% 50% (cancellations, errors)
- Gold/Achievement: 45 90% 55% (badges, achievements - use sparingly)

**Semantic Colors:**
- Text Primary Dark: 220 15% 95%
- Text Secondary Dark: 220 10% 70%
- Text Primary Light: 220 20% 15%
- Border Subtle: 220 15% 25% (dark) / 220 15% 88% (light)

### B. Typography

**Font Families:**
- Primary: 'Inter' (Google Fonts) - clean, professional, excellent Vietnamese diacritics support
- Headings: 'Inter' with weight variations (600-700)
- Body: 'Inter' (400-500)

**Scale:**
- Hero/Landing: text-5xl to text-6xl (bold)
- Section Headers: text-3xl to text-4xl (semibold)
- Card Titles: text-xl (medium)
- Body Text: text-base (regular)
- Captions/Meta: text-sm (regular)

### C. Layout System

**Spacing Primitives:**
Core spacing units: 2, 4, 6, 8, 12, 16, 20 (Tailwind units)
- Tight spacing: gap-2, p-2 (badges, chips)
- Standard spacing: gap-4, p-4 (cards internal)
- Section spacing: py-12 to py-20 (between major sections)
- Container max-width: max-w-7xl

**Grid Systems:**
- Tutor cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Dashboard stats: grid-cols-2 lg:grid-cols-4
- Profile sections: 2-column layout (lg:grid-cols-2)

### D. Component Library

**Navigation:**
- Top navbar: Sticky with logo, search bar, user menu, notification bell
- Role-specific sidebar for dashboards (collapsible on mobile)
- Breadcrumbs for deep navigation

**Cards:**
- Tutor Profile Cards: Image/video thumbnail, name, subjects, rating stars, verified badge, price, "Xem chi tiết" button
- Lesson Cards: Date/time, subject, tutor info, status badge, action button
- Achievement Cards: Icon, title, description, earned date

**Forms & Inputs:**
- Search bar with autocomplete dropdown
- Filter panels with checkboxes, range sliders (price), time selection
- Profile forms with image upload, video upload, rich text editor
- Dark mode inputs with proper contrast (bg-gray-800, border-gray-600)

**Data Display:**
- Rating system: 5-star display with count (★★★★☆ 4.5/5 (128 đánh giá))
- Statistics cards: Large number, label, trend indicator
- Timeline/History: Vertical timeline with icons and dates
- Tables for transaction history with sortable columns

**Modals & Overlays:**
- Booking modal: Calendar picker, time slots, lesson details
- Payment modal: QR code display, bank transfer info, confirmation
- Review modal: Star rating, text area, photo upload
- Video preview lightbox for tutor introduction videos

**Special Components:**
- Verified Badge: Checkmark icon in circle, "Đã xác thực" label
- Trust Index Display: Progress bar with percentage, tier label
- Video Profile Player: Custom controls, 1-minute limit indicator
- Jitsi Meeting Room: Embedded with branded header
- VietQR Display: Large QR code, bank details, auto-copy button, countdown timer

**Status Indicators:**
- Online/Offline: Green/gray dot next to avatar
- Lesson Status: Colored badges (Đang chờ/Đã xác nhận/Hoàn thành/Đã hủy)
- Payment Status: Icons with text (Chờ thanh toán/Đã thanh toán/Hoàn tiền)

### E. Animations
- Minimal, purposeful animations only
- Smooth transitions: transition-all duration-200
- Hover states: scale-105 for cards, opacity changes for buttons
- Loading states: Subtle pulse animation for skeletons
- NO scroll-triggered animations, NO excessive motion

## Page-Specific Designs

**Landing Page (Marketing):**
- Hero: Large inspiring image of student studying with tutor (or video), bold headline "Kết nối với gia sư chất lượng", search bar, "Tìm gia sư" CTA
- Trust Section: 3-column stats (Số gia sư/Học viên/Buổi học)
- Featured Tutors: Grid of 6 top-rated tutors
- How It Works: 3-step visual process for students and tutors
- Testimonials: Cards with student photos, quotes, ratings
- CTA Section: Gradient background, "Bắt đầu học ngay hôm nay" button

**Tutor Profile:**
- 2-column layout: Left (video player, stats), Right (details)
- Video introduction (prominent, autoplay muted on scroll into view)
- Experience timeline with bullet points
- Qualifications grid with certificate images
- Achievements/badges horizontal scroll
- Schedule calendar with available slots
- Reviews section with filtering and pagination

**Dashboards:**
- Sidebar navigation with icons and labels
- Top stats row (4 cards with key metrics)
- Main content area with tabbed sections or vertical sections
- Chart visualizations using subtle gradients
- Action buttons always visible (Tạo lịch dạy, Đặt học, etc.)

**Booking Flow:**
- Step indicator at top (1. Chọn thời gian → 2. Xác nhận → 3. Thanh toán)
- Calendar view with disabled/available states clearly differentiated
- Summary sidebar showing selected tutor, time, price
- Payment screen with large QR code, instructions, confirmation button

## Images
- Hero Image: Bright, professional photo of Vietnamese student engaged in online learning with laptop, natural lighting
- Tutor Cards: Professional headshots or casual teaching photos (square ratio)
- Success Stories: Real student/parent testimonials with photos
- How It Works: Simple illustrations or icons for each step
- Trust Badges: Verified checkmark icons, award icons
- NO stock photos that look overly staged; prefer authentic Vietnamese educational settings