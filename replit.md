# LopHoc.Online - Vietnamese Tutoring Platform

## Overview

LopHoc.Online is an online tutoring marketplace platform designed for the Vietnamese education market. It connects students with tutors, offering features such as tutor discovery, lesson scheduling, QR code-based payment processing, and a comprehensive review system. The platform aims to streamline the online tutoring experience in Vietnam.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

**Technology Stack:** React 18 with TypeScript, Vite for bundling, Wouter for routing, and React Query for server state management.

**UI/UX Design:** Shadcn/ui component library, Radix UI primitives, Tailwind CSS for styling, and CVA for component variants. It features a custom theme system with light/dark modes, a custom color palette, Vietnamese-focused typography, and a mobile-responsive design.

**Key Features:**

*   **Authentication System:** Supports Google OAuth, Facebook OAuth, and email/password JWT authentication, including password reset functionality. Currently uses mock authentication flow (saves user data to localStorage). Logged-in users see personalized home page with greeting, quick access menu (Dashboard, Tìm gia sư, Lịch học), and stats cards. Navbar displays user dropdown menu with profile and logout options.
*   **Notification System:** Real-time notifications for lessons, payments, and system alerts, accessible via a dropdown in the Navbar.
*   **Tutor Discovery:** A dedicated page `/tutors` with filtering (subject, grade, price) and sorting options (price, rating, experience, review count). Tutor cards display detailed information and are visually enhanced. Pagination system shows 8 tutors per page with Previous/Next buttons and page numbers. Smooth scroll-to-top on page changes, automatic reset to page 1 when sort changes.
*   **Tutor Registration:** A multi-step wizard form for prospective tutors, covering personal information, education, experience, teaching profile (with **Rich Text Editor** for bio/achievements/teaching method), and availability/rate. Includes profile photo and certificate uploads with validation. The rich text editor supports formatting (bold, italic), headings, bullet/ordered lists, and undo/redo functionality.
*   **Complete Tutor Flow System:** An 8-stage journey for tutors, from registration to reputation building, with progress tracking. Stages include Dashboard, Verification (OCR, video selfie), Profile Setup (video introduction), Schedule Setup, Trial Requests, Online Teaching (video call integration placeholder), Feedback & Reviews, and Reputation & Stats.
*   **Booking Dialog System (October 14, 2025 - With Subject & Package Selection):** Popup booking dialogs in tutor detail pages:
    - **Subject Selection (Both Trial & Monthly)**: 
      - Multi-select checkboxes for subjects tutor teaches
      - Displays grade levels for each subject
      - Can select multiple subjects simultaneously
      - Required: At least 1 subject must be selected
      - Shows summary of selected subjects
    - **Grade Selection**: 
      - Dropdown for student's current grade (Lớp 6-12, Khác)
      - Required field for booking
    - **Trial Booking**: Calendar-based single session booking (30 minutes free)
    - **Monthly Booking**: Complete booking flow with package selection:
      - Step 1: Select subjects and grade
      - Step 2: Select pre-configured slot from tutor's available schedules
      - Step 3: Choose start date
      - Step 4: Select subscription package (1, 2, 3, 6, or 12 months with tiered discounts)
      - Shows detailed summary with subjects, grade, monthly price, discount breakdown, total payment, and savings
      - Package discounts: 1m (0%), 2m (5%), 3m (10% - Popular), 6m (15%), 12m (20%)
      - Auto-calculates: monthly price × months - discount% = total payment
*   **Enhanced Schedule Display (October 14, 2025):** Improved tutor availability display in detail page:
    - **Card-based layout**: Each time slot displayed as individual card with badges
    - **Pattern grouping**: Slots organized by day patterns (T2,4,6 / T3,5,7 / T7,CN / etc)
    - **Status indicators**: Visual badges showing availability status
      - "Còn X chỗ" (orange) when ≤3 slots remaining
      - "Đã đầy" (red) when fully booked
    - **Rich information**: Time range, price per session, estimated monthly cost
    - **Smart booking**: Disabled booking button for full slots, enabled for available slots
    - **Responsive design**: Adapts to mobile and desktop layouts
*   **Advanced Scheduling System (October 14, 2025):** Production-ready scheduling with comprehensive conflict prevention and data integrity:
    - **Tutor Availability Management** (`/tutor-availability`): Create, edit, and delete custom time slots with day-of-week selection and time ranges
    - **Student Timetable** (`/student-timetable`): View scheduled lessons in a weekly calendar format
    - **Robust Conflict Detection**: Prevents overlapping time slots for both tutors and students with strict validation
    - **Data Integrity**: Type validation and coercion for all inputs (dayOfWeek, times, prices), immutable ID enforcement (tutorId, studentId cannot change after creation), sanitized data persistence only
    - **Security Features**: All update operations fetch by ID, validate types/formats, check conflicts before updates, and persist only validated data
    - **Data Models**: TutorAvailability (tutorId, dayOfWeek, startTime, endTime, isActive), Lessons (tutorId, studentId, date, startTime, endTime, subject, price, status, notes)
*   **Recurring Schedule & Subscription System (October 14, 2025 - UI Prototype):** Mock UI implementation for recurring weekly schedules and multi-month subscription packages:
    - **Recurring Schedule Setup** (`/tutor/recurring-schedule`): Tutor-facing interface with preset patterns (T2,4,6 / T3,5,7 / Weekends / Weekdays / Everyday), custom day selection, time/price inputs, live preview showing sessions/week and monthly revenue, schedule list management, and weekly calendar visualization
    - **Tutor Availability with Presets** (`/tutor-availability`): Enhanced management page with preset buttons (T2,4,6 / T3,5,7 / Cuối tuần / T2-T6) allowing tutors to create multiple slots at once. Supports both preset patterns and custom day selection, creating all selected slots simultaneously
    - **Student Booking Simplified** (`/student/register`): Streamlined registration form where students select from tutor's pre-configured slots and choose start date. Displays monthly price estimate (sessions/week × 4 × price/session), tutor info, and QR payment placeholder. No package selection needed in booking flow
    - **Booking Flow Simplified** (`/student/booking`): Simplified from 4-step wizard to 2-step process - select slot and start date, then payment. Same functionality as `/student/register` but titled "Đặt lịch học theo tháng" for monthly recurring bookings
    - **Subscription Packages** (`/packages`): Pricing table with 4 tiers - Cơ Bản (1 month, 0% discount), Tiết Kiệm (3 months, 10% discount), Phổ Biến (6 months, 15% discount), Ưu Đãi Nhất (12 months, 25% discount). Displays total sessions, price calculations, and savings amount
    - **Note**: Currently UI-only with mock data for UX prototyping. Backend integration pending
*   **Lesson Management:** Components for tracking lesson status (pending, confirmed, completed, cancelled).
*   **Admin Dashboard System:** A comprehensive platform for administrators with distinct routes (`/admin/*`) and a destructive color theme. It includes sections for dashboard overview, tutor management (pending, active, blocked), student management, and transaction management.

### Backend

**Technology Stack:** Express.js with TypeScript.

**API Design:** RESTful API structure with `/api` prefix, including request/response logging and error handling middleware. JSON is used for data exchange.

### Data Layer

**Database:** MySQL 8.0 managed with Drizzle ORM for type-safe operations. A schema-first approach with Drizzle-Zod is used for validation.

**Storage Abstraction:** An `IStorage` interface with a `MemStorage` implementation for development, designed for easy swap to database-backed storage.

## External Dependencies

*   **UI Libraries:** @radix-ui/*, @tanstack/react-query, wouter, react-hook-form, date-fns, embla-carousel-react, lucide-react, class-variance-authority, clsx.
*   **Backend Services:** mysql2 (MySQL), drizzle-orm, express, connect-pg-simple (session store).
*   **Development Tools:** TypeScript, Vite, tsx, esbuild, @replit/* plugins.
*   **Payment Integration:** VietQR API (img.vietqr.io) for QR code generation.
*   **Styling:** Tailwind CSS, PostCSS, Autoprefixer.