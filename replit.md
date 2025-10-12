# LopHoc.Online - Vietnamese Tutoring Platform

## Overview

LopHoc.Online is an online tutoring marketplace platform connecting tutors with students in Vietnam. The platform features tutor discovery with filtering, lesson scheduling, payment processing via QR codes, and a comprehensive review system. The application is built with a modern React frontend and Express backend, designed specifically for the Vietnamese education market with full Vietnamese language support.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 18 with TypeScript for type safety
- Vite as the build tool and dev server
- Wouter for client-side routing (lightweight alternative to React Router)
- React Query (@tanstack/react-query) for server state management

**UI Component System:**
- Shadcn/ui component library with Radix UI primitives
- Tailwind CSS for styling with custom design tokens
- Class Variance Authority (CVA) for component variant management
- Custom theme system supporting light/dark modes
- Toast notification system (enhanced October 12, 2025):
  - Radix UI Toast primitives with custom auto-dismiss logic
  - Configurable duration support (default 5 seconds)
  - Data-testid attributes for automated testing
  - Success, error, and destructive variants
  - Bottom-right positioning with animations

**Design System:**
- Custom color palette optimized for educational platforms
- Vietnamese-focused typography using Inter font family
- Logo: Enhanced graduation cap icon with larger mortarboard (opacity 1.0) and thicker tassel (2.5px) in upper portion; "10 điểm" text in lower portion for maximum visibility (redesigned October 11, 2025)
- Comprehensive component library including cards, modals, forms, and data display components
- Mobile-responsive design with breakpoint utilities

**State Management:**
- React Query for async/server state
- React Context for theme management
- Local component state with hooks

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript
- Custom route registration system
- In-memory storage interface (MemStorage) with abstraction for future database integration
- Session management prepared with connect-pg-simple

**API Design:**
- RESTful API structure with `/api` prefix
- Request/response logging middleware
- Error handling middleware
- JSON request/response format

**Development Tools:**
- Hot module replacement (HMR) via Vite in development
- Runtime error overlay for development
- Replit-specific plugins for cloud development environment

### Data Layer

**Database:**
- Drizzle ORM for type-safe database operations
- PostgreSQL as the database (Neon serverless)
- Schema-first approach with Drizzle-Zod for runtime validation
- Migration system via drizzle-kit

**Data Models:**
- User authentication schema (username/password)
- Prepared for expansion to include tutors, lessons, reviews, and payments
- Type inference from schema to ensure type safety across the stack

**Storage Abstraction:**
- IStorage interface defining CRUD operations
- MemStorage implementation for development
- Designed for easy swap to database-backed storage

### Key Features Architecture

**Authentication System:**
- LoginDialog component with three authentication methods:
  - Google OAuth login
  - Facebook OAuth login
  - JWT email/password authentication
- Toggle between login and register modes
- Form validation with react-hook-form and zod
- Integrated into Navbar with login button trigger
- ForgotPasswordDialog for password reset:
  - Email input for reset link
  - Success state with auto-close after 3 seconds
  - Toast notification confirmation
  - Triggered from LoginDialog "Quên mật khẩu?" link
- User schema with hashed passwords prepared for backend integration

**Notification System:**
- NotificationDropdown component in Navbar (added October 11, 2025)
- Real-time notification display with dropdown menu
- Three notification types: lesson, payment, system
- Visual indicators:
  - Badge showing unread count
  - Blue dot for unread notifications
  - Accent background for unread items
- Interactive features:
  - "Đánh dấu đã đọc" button to mark all notifications as read
  - "Xem tất cả thông báo" button to navigate to full notification page
  - ScrollArea for long notification lists (400px max height)
- State management with useState for local notification updates
- Toast notifications for user feedback
- Mock data structure with 3 sample notifications (2 unread, 1 read)

**Tutor Discovery:**
- Dedicated /tutors page for searching and filtering tutors (added October 2025)
- Home page displays 8 featured tutors in 2-row grid layout (4 tutors per row on desktop)
- Filter panel with subject, grade level, and price range filters (located on /tutors page)
- Sorting functionality with Select dropdown (added October 11, 2025):
  - Sort by price: ascending (low to high) or descending (high to low)
  - Sort by rating: high to low
  - Sort by experience: most experienced first (extracts years from experience strings)
  - Sort by review count: most reviewed first
  - Memoized sorting logic for performance optimization
- Enhanced TutorCard component with improved visual hierarchy (updated October 11, 2025):
  - Larger avatar (80px) with primary border for prominence
  - Three-section layout: Header (avatar, name, badges) → Info (subjects, schedule) → Footer (price, CTA)
  - Visual dividers and colored indicators for better section separation
  - Responsive badge wrapping with flex-wrap prevents overflow on mobile
  - Video badge has shrink-0 to prevent compression
  - Full tutor names displayed without truncation
  - Optimized typography: text-xl/text-2xl for price (reduced from text-2xl/text-3xl)
  - Equal-height cards (434px) with consistent spacing (24px gaps)
- Full tutor list of 8 tutors with expanded subjects (Math, Physics, Chemistry, English, IELTS, History, Geography, Computer Science, SAT, TOEFL)
- Mock data structure supporting real-time tutor information

**Tutor Registration:**
- TutorRegistrationForm component for prospective tutors (added October 11, 2025, enhanced October 12, 2025)
- Dedicated /tutor-registration route and page
- Navigation via "Trở thành gia sư" button in Navbar
- Multi-section registration form with comprehensive validation:
  - Personal information: Full name, email, phone number
  - **Profile photo upload** (required, added October 12): 
    - File upload with image preview (80x80 circular)
    - Remove button to clear selection
    - Validated before form submission with error toast
  - Education background: Degree level, university, major, graduation year
  - **Certificates/Credentials upload** (optional, added October 12):
    - Multiple file support (images and PDFs)
    - Individual file list with remove buttons
    - Accepts multiple simultaneous uploads
  - Teaching experience: Years of experience, current occupation
  - Subjects and grades: Multiple selection for subjects taught and grade levels
  - Teaching profile:
    - Bio (50-1000 chars)
    - **Notable achievements** (optional, added October 12): Separate textarea for awards and accomplishments
    - Teaching methodology description (20+ chars)
  - Availability: Day selection and time slot preferences
  - Hourly rate: Pricing in VNĐ
- Form validation using Zod schema with react-hook-form
- Profile photo validation in onSubmit handler
- File state management with reset on successful submission
- Controlled Select components with proper value binding
- Interactive UI with card-based layout for each section
- Success feedback with toast notification (10-second duration) and form reset
- Error toasts for validation failures (missing photo, server errors)
- Comprehensive test coverage with data-testid attributes
- Ready for backend integration with API endpoints and file uploads

**Complete Tutor Flow System:**
- 8-stage tutor journey from registration to reputation building (added October 12, 2025)
- Centralized progress tracking with completion percentage across all stages
- Routing optimized: specific /tutor/* routes placed before wildcard /tutor/:id to prevent conflicts

Stage 1: Dashboard (/tutor/dashboard)
- Main hub displaying progress tracker and flow overview
- 8 step cards showing registration, verification, profile, schedule, trial, teaching, feedback, reputation
- Visual status indicators: completed (green checkmark), current (blue badge), pending (gray)
- Quick action cards for profile editing, schedule management, and earnings overview
- Navigation buttons to advance through each stage

Stage 2: Verification (/tutor/verification)
- OCR document verification with ID card upload (front and back)
- Video selfie verification for identity confirmation
- File upload interface with visual feedback
- Validation ensures all required documents uploaded before proceeding
- Success redirects to profile setup

Stage 3: Profile Setup (/tutor/profile-setup)
- Profile photo upload for tutor avatar
- Video introduction upload (1-3 minutes) for student preview
- Optional teaching certificates upload
- Form fields: display name, tagline, bio, achievements, teaching style
- Zod validation with character limits and required field checks
- Success redirects to schedule setup

Stage 4: Schedule Setup (/tutor/schedule-setup)
- Interactive schedule grid: days of week × time slots (morning/afternoon/evening)
- Click-to-toggle slot selection with visual feedback
- Selected slot counter and progress tracking
- Minimum 3 slots required for validation
- Success redirects to trial requests

Stage 5: Trial Requests (/tutor/trial-requests)
- Display pending trial lesson requests from students
- Stats cards: pending count, accepted count, rejected count
- Request cards show student info, subject, preferred time, message
- Accept/reject actions with instant feedback
- "Bắt đầu dạy" button after accepting to start teaching

Stage 6: Online Teaching (/tutor/teaching)
- Video call interface placeholder (prepared for Jitsi/Zoom integration)
- Ongoing lesson display with student information
- Video controls: toggle microphone, toggle video, end call
- Sidebar with upcoming lessons list
- Teaching tools section: whiteboard, materials, notes (placeholders)
- Chat interface for student communication

Stage 7: Feedback & Reviews (/tutor/feedback)
- Rating overview: average rating, positive percentage, growth metrics
- Rating distribution chart (5-star to 1-star with counts)
- Review tabs: All, Positive (4-5 stars), Negative (<4 stars)
- Review cards with student avatar, rating stars, subject badge, comment, date
- Mock data with 3 sample reviews for development

Stage 8: Reputation & Stats (/tutor/reputation)
- Key statistics: total students taught, total hours, average rating, total earnings
- Performance metrics with progress bars: completion rate, success rate, repeat students
- Achievement system: 5 achievements with unlock status and progress tracking
- Achievements: First Student, 10 Students Milestone, 5-Star Rating, 100 Hours, Top Tutor
- Call-to-action button to view new trial requests

Technical Implementation:
- All pages use consistent layout with progress tracker in header
- Mock data structures prepared for backend integration
- File upload handling with validation and preview
- Form validation using Zod schemas
- Toast notifications for user feedback
- Responsive design with mobile support
- End-to-end tested with playwright verification
- Note: Some data-testid attributes need expansion for comprehensive test coverage

**Lesson Management:**
- Lesson card component with status tracking (pending, confirmed, completed, cancelled)
- Calendar integration ready
- Video call integration prepared

**Payment Integration:**
- QR code payment modal using VietQR API
- Support for Vietnamese banking systems (Vietcombank, etc.)
- Transaction code generation for payment tracking

**Review System:**
- 5-star rating system
- Review cards with student feedback
- Timestamp and subject association

## External Dependencies

**Frontend Libraries:**
- @radix-ui/* - Accessible UI primitives for React components
- @tanstack/react-query - Async state management
- wouter - Lightweight routing
- react-hook-form with @hookform/resolvers - Form management
- date-fns - Date manipulation
- embla-carousel-react - Carousel functionality
- lucide-react - Icon library
- class-variance-authority & clsx - Styling utilities

**Backend Services:**
- @neondatabase/serverless - PostgreSQL serverless database
- drizzle-orm - TypeScript ORM
- express - Web server framework
- connect-pg-simple - PostgreSQL session store (prepared)

**Development Tools:**
- TypeScript - Type safety
- Vite - Build tool and dev server
- tsx - TypeScript execution
- esbuild - Production bundler
- @replit/* plugins - Replit cloud IDE integration

**Payment Integration:**
- VietQR API (img.vietqr.io) - QR code generation for Vietnamese banking

**Styling & Design:**
- Tailwind CSS - Utility-first CSS framework
- PostCSS with Autoprefixer - CSS processing
- Custom design tokens for Vietnamese market preferences (defined in design_guidelines.md)