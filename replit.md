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

*   **Authentication System:** Supports Google OAuth, Facebook OAuth, and email/password JWT authentication, including password reset functionality. Mock authentication flow (October 12, 2025): saves user data to localStorage on login, page reload to update UI, error handling for localStorage parsing, logout clears session. Logged-in users see personalized home page with greeting, quick access menu (Dashboard, Tìm gia sư, Lịch học), and stats cards. Navbar displays user dropdown menu with profile and logout options.
*   **Notification System:** Real-time notifications for lessons, payments, and system alerts, accessible via a dropdown in the Navbar.
*   **Tutor Discovery:** A dedicated page `/tutors` with filtering (subject, grade, price) and sorting options (price, rating, experience, review count). Tutor cards display detailed information and are visually enhanced. Pagination system shows 8 tutors per page with Previous/Next buttons and page numbers. Smooth scroll-to-top on page changes, automatic reset to page 1 when sort changes.
*   **Tutor Registration:** A multi-step wizard form for prospective tutors, covering personal information, education, experience, teaching profile, and availability/rate. Includes profile photo and certificate uploads with validation.
*   **Complete Tutor Flow System:** An 8-stage journey for tutors, from registration to reputation building, with progress tracking. Stages include Dashboard, Verification (OCR, video selfie), Profile Setup (video introduction), Schedule Setup, Trial Requests, Online Teaching (video call integration placeholder), Feedback & Reviews, and Reputation & Stats.
*   **Lesson Management:** Components for tracking lesson status (pending, confirmed, completed, cancelled).
*   **Admin Dashboard System:** A comprehensive platform for administrators with distinct routes (`/admin/*`) and a destructive color theme. It includes sections for dashboard overview, tutor management (pending, active, blocked), student management, and transaction management.

### Backend

**Technology Stack:** Express.js with TypeScript.

**API Design:** RESTful API structure with `/api` prefix, including request/response logging and error handling middleware. JSON is used for data exchange.

### Data Layer

**Database:** PostgreSQL (Neon serverless) managed with Drizzle ORM for type-safe operations. A schema-first approach with Drizzle-Zod is used for validation.

**Storage Abstraction:** An `IStorage` interface with a `MemStorage` implementation for development, designed for easy swap to database-backed storage.

## External Dependencies

*   **UI Libraries:** @radix-ui/*, @tanstack/react-query, wouter, react-hook-form, date-fns, embla-carousel-react, lucide-react, class-variance-authority, clsx.
*   **Backend Services:** @neondatabase/serverless (PostgreSQL), drizzle-orm, express, connect-pg-simple (session store).
*   **Development Tools:** TypeScript, Vite, tsx, esbuild, @replit/* plugins.
*   **Payment Integration:** VietQR API (img.vietqr.io) for QR code generation.
*   **Styling:** Tailwind CSS, PostCSS, Autoprefixer.