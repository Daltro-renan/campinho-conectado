# Campinho Conectado

## Overview

Campinho Conectado is a full-stack web application for managing amateur football associations. The platform provides comprehensive features for player management, game scheduling, team statistics, news publishing, payment management (mensalidades), and role-based user authentication. Built as a mobile-first Progressive Web App (PWA), it serves as a complete management solution for grassroots football organizations.

The application was migrated from a Lovable/Supabase architecture to a self-hosted full-stack solution running on Replit, featuring a React frontend with custom JWT authentication, role-based authorization, and PostgreSQL database backend.

## Recent Changes (October 28, 2025)

**Role-Based Hierarchy System:**
- Implemented complete three-tier role system: `presidente`, `diretoria`, and `jogador`
- Admin roles (presidente and diretoria) have full CRUD access to games, players, and payments
- Regular users (jogador) have read-only access to most resources
- JWT tokens now include user role for server-side authorization

**Payment Management System (Mensalidades):**
- Created new `payments` table for tracking monthly player fees
- Full CRUD API with admin-only access controls
- Payment tracking includes: amount (in cents), due date, paid date, status, month/year, and notes
- Status auto-calculated based on payment state (pending, paid, overdue)
- Dedicated Payments page with filtering by status and player

**Enhanced Security:**
- Created `requireAdmin` middleware for protecting admin-only routes
- All mutation routes (create/delete games, players, payments) now require admin role
- Frontend pages check user role and redirect unauthorized users
- Payments page completely restricted to admin roles

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Routing:**
- React 18 with TypeScript using Vite as the build tool
- Wouter for client-side routing (replacing react-router)
- Mobile-first responsive design with bottom navigation pattern
- Progressive Web App (PWA) capabilities via VitePWA plugin

**UI Component Library:**
- Radix UI primitives for accessible, unstyled components
- shadcn/ui component system with Tailwind CSS for styling
- Custom design system with black and orange color scheme (football theme)
- Consistent use of Card, Button, Badge, Avatar, and other shadcn components

**State Management:**
- TanStack Query (React Query) v5 for server state management
- React Context API for authentication state
- Local storage for JWT token persistence

**Styling System:**
- Tailwind CSS v3 with custom configuration
- CSS variables for theming (defined in index.css)
- PostCSS with autoprefixer for cross-browser compatibility
- Custom color palette: primary (orange #ff6600), secondary (black/dark gray)

### Backend Architecture

**Server Framework:**
- Express.js running on Node.js
- TypeScript for type safety across the stack
- Custom middleware for logging, error handling, and JWT verification
- Development mode uses Vite middleware for HMR

**Authentication & Security:**
- JWT-based authentication with role-based authorization (replacing Supabase Auth)
- JWT payload includes: user id, email, and role for permission checks
- bcryptjs for password hashing (10 rounds)
- `authenticateToken` middleware for verifying JWT on protected routes
- `requireAdmin` middleware for restricting admin-only operations
- Token stored in localStorage on client, sent via Authorization header
- Three-tier role system: presidente (admin), diretoria (admin), jogador (regular user)

**Database Layer:**
- Drizzle ORM for type-safe database operations
- PostgreSQL schema with the following tables:
  - `users`: User accounts with email, password hash, role (presidente/diretoria/jogador), avatar
  - `teams`: Team information including stats (wins, draws, losses, goals)
  - `players`: Player profiles linked to users and teams with statistics
  - `games`: Match scheduling with home/away teams, scores, dates, venues
  - `news`: News articles with title, content, author, published status
  - `payments`: Monthly fee tracking with playerId, amount, dueDate, paidDate, status, month, year, notes

**API Design:**
- RESTful endpoints under `/api` prefix
- Authentication endpoints: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- Resource endpoints for teams, players, games, news, and payments
- Admin-only endpoints: POST/DELETE games, POST/DELETE players, all payment operations
- Zod schemas for request validation (defined in shared/schema.ts)
- Shared TypeScript types between client and server
- All insert schemas use `.strict()` for enhanced security

### Code Organization

**Monorepo Structure:**
- `client/`: Frontend React application
  - `src/pages/`: Route components (Home, Auth, Games, Team, Profile, Payments)
  - `src/components/`: Reusable components including BottomNav
  - `src/components/ui/`: shadcn component library
  - `src/lib/`: Utilities (auth context with role checking, query client, utils)
  - `src/hooks/`: Custom React hooks
- `server/`: Backend Express application
  - `index.ts`: Server entry point and middleware setup
  - `routes.ts`: API route definitions
  - `storage.ts`: Database abstraction layer
  - `db.ts`: Drizzle database client
  - `vite.ts`: Development server utilities
- `shared/`: Code shared between client and server
  - `schema.ts`: Drizzle schema definitions and Zod validation schemas
- `public/`: Static assets including PWA icons and manifest

**Build Configuration:**
- Vite config points to `client/` as root
- TypeScript path aliases: `@/` for client src, `@shared/` for shared code
- Separate tsconfig files for app, node, and root
- Development script runs server with tsx watch for hot reload

## External Dependencies

### Database

**PostgreSQL via Neon:**
- Cloud-hosted PostgreSQL database (Neon.tech)
- Connection string stored in `DATABASE_URL` environment variable
- Drizzle Kit for schema migrations
- Connection pooling via postgres.js client

### Third-Party Services

**Capacitor (iOS/Android):**
- Native mobile app capabilities configured
- App ID: `app.lovable.0da8c8c79e1a4c94be439ca052f68eb8`
- Server URL points to Lovable preview URL (may need updating for production)

**Development Tools:**
- ESLint with TypeScript support for code quality
- Lovable Tagger plugin for component tracking in development
- React Hook Form with Hookform Resolvers for form handling

### Key NPM Packages

**Frontend:**
- `@tanstack/react-query`: Server state management
- `wouter`: Lightweight routing
- `sonner` & custom toast: Toast notifications
- `date-fns`: Date formatting and manipulation
- `clsx` & `tailwind-merge`: Utility class merging
- `class-variance-authority`: Component variant management

**Backend:**
- `express`: Web server framework
- `drizzle-orm`: Type-safe ORM
- `postgres`: PostgreSQL client
- `bcryptjs`: Password hashing
- `jsonwebtoken`: JWT creation and verification
- `zod`: Schema validation

**Build Tools:**
- `vite`: Fast build tool and dev server
- `@vitejs/plugin-react-swc`: React plugin with SWC compiler
- `typescript`: Type checking
- `tsx`: TypeScript execution and watch mode
- `tailwindcss` & `autoprefixer`: CSS processing

### Environment Variables

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT signing (auto-generated in dev if not set)
- `NODE_ENV`: Environment mode (development/production)