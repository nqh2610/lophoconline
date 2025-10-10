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

**Design System:**
- Custom color palette optimized for educational platforms
- Vietnamese-focused typography using Inter font family
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
- Prepared session-based authentication
- User schema with hashed passwords
- Login/registration modal components

**Tutor Discovery:**
- Filter panel with subject, grade level, and price range filters
- Tutor card component displaying credentials, ratings, and availability
- Mock data structure supporting real-time tutor information

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