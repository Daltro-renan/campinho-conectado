# Campinho Conectado

## Overview

Campinho Conectado is a full-stack web application for managing amateur football associations. The platform provides comprehensive features for player management, game scheduling, team statistics, news publishing, payment management (mensalidades), and role-based user authentication. Built as a mobile-first Progressive Web App (PWA), it serves as a complete management solution for grassroots football organizations.

The application was migrated from a Lovable/Supabase architecture to a self-hosted full-stack solution running on Replit, featuring a React frontend with custom JWT authentication, role-based authorization, and PostgreSQL database backend.

## Recent Changes (October 28, 2025)

**Complete UI/UX Overhaul - Integrated User Experience:**

**1. Dashboard (Home Page) - Unified User Experience:**
- Completely rebuilt with 3 navigable cards showing real-time data:
  - **Próximo Jogo Card**: Shows ONLY the next upcoming game with team logos, date/time, and venue (navigates to /games)
  - **Meu Time Card**: Displays user's primary team with logo, colors, location, and statistics (navigates to /team)
  - **Mensalidade Card**: Real payment status calculation (Em dia/Pendente/Vencido) with color-coded badges (navigates to /payments)
- All data fetched from database with cross-references between players, teams, games, and payments
- Team statistics displayed: wins, draws, losses, goal difference
- Visual indicators for payment urgency (red for overdue, yellow for pending, green for paid)

**2. Games Page - Enhanced Game Management:**
- Fixed form to use Select dropdowns for choosing teams (no more manual ID entry)
- Validation prevents creating games with same team twice
- Shows team logos and names in game cards
- Proper chronological ordering: upcoming games first, past games at bottom
- Automatic clubId assignment
- Error handling for empty team database
- Query cache invalidation ensures immediate UI updates after creating games

**3. Team Management - Integrated Player CRUD:**
- Added complete player management within teams:
  - "Gerenciar Jogadores" button on each team card
  - Dialog showing all players on the team
  - "Adicionar Jogador" form with name, position, number, and photo URL
  - Individual player delete buttons
  - Player count displayed on each team card
- All player operations use react-hook-form with zod validation
- Immediate cache invalidation for real-time updates
- Full integration with existing team CRUD operations

**4. Chat - Real-time Messaging:**
- Fixed: Messages now appear immediately after sending
- Added queryClient.invalidateQueries for instant cache updates
- Maintains auto-refresh every 3 seconds for new messages
- Proper channel separation (geral/tecnicos/diretoria)

**5. Profile Page - Comprehensive User View:**
- Displays user avatar/photo with fallback to initials
- Shows translated role badge (Presidente, Diretoria, Técnico, Jogador)
- Real-time payment status with visual indicators and urgency badges
- Player statistics card: goals, assists, games played
- Functional navigation buttons:
  - "Meus Pagamentos" → navigates to /payments with payment count
  - "Histórico de Jogos" → navigates to /games with game count
  - "Configurações" → disabled (placeholder for future)
- Member since date displayed
- App version info

**6. Cross-Page Integration:**
- Home, Profile, and Payments synchronized via shared queries
- Payment status calculation consistent across all pages
- Player data cross-referenced with teams, games, and payments
- All pages use queryClient.invalidateQueries for immediate updates
- Unified navigation flow between all sections

**Comprehensive Team Management System:**
- Expanded `teams` table with visual and location fields:
  - `abbreviation` (sigla/short code for team)
  - `colorPrimary` and `colorSecondary` (team colors in hex format)
  - `city` and `state` (location data)
  - `description` (team history/mission)
  - `createdBy` (user ID who created the team)
- Visual team cards displaying logo, colors, location
- Modal form for creating/editing teams with color pickers
- URL-based logo upload support
- Admin-only permissions (presidente/diretoria) for team management
- Backend secured with `requireAdmin` middleware for all team mutations
- All new teams automatically associated with current club (clubId=1)

**Four-Tier Role Hierarchy System:**
- Expanded role system: `presidente`, `diretoria`, `tecnico`, and `jogador`
- Admin roles (presidente and diretoria) have full CRUD access to all resources
- Técnico role can manage their assigned squad teams and players
- Regular users (jogador) have read-only access to most resources
- JWT tokens include user role for server-side authorization

**Hierarchical Chat System:**
- Three role-based channels: `geral`, `tecnicos`, and `diretoria`
- Channel "diretoria": accessible only by presidente and diretoria
- Channel "tecnicos": accessible by presidente, diretoria, and tecnico roles
- Channel "geral": accessible by all authenticated users
- Real-time messaging with auto-refresh every 3 seconds
- Backend permission checks enforce channel access rules
- Dedicated Chat page with tab-based interface

**Squad Team Management System:**
- New `squadTeams` table for managing team categories (Sub-17, Sub-20, etc.)
- Full CRUD operations with role-based permissions:
  - Create/Delete teams: admin only (presidente/diretoria)
  - Edit teams & manage players: admin or assigned técnico
- Coach assignment system linking técnicos to teams
- Player roster management (add/remove players from teams)
- Dedicated SquadTeams page with team listing and player management dialogs

**Enhanced Payment Management:**
- Added `paymentMethod` field to payments table
- Payment methods supported: PIX, Credit Card, Debit Card, Cash
- Controlled Select component ensures proper form submission
- Payment creation includes method selection with validation
- Full payment tracking: amount, due date, paid date, status, month/year, method, notes

**Security Enhancements:**
- `requireAdmin` middleware protects admin-only routes
- `requireRole` helper for flexible role checking in route handlers
- All mutation routes enforce proper role-based authorization
- Frontend pages verify user role and redirect unauthorized access
- Payments and SquadTeams pages restricted to appropriate roles

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
- `requireRole` helper for flexible permission checking
- Token stored in localStorage on client, sent via Authorization header
- Four-tier role system: presidente (admin), diretoria (admin), tecnico (team manager), jogador (regular user)

**Database Layer:**
- Drizzle ORM for type-safe database operations
- PostgreSQL schema with the following tables:
  - `users`: User accounts with email, password hash, role (presidente/diretoria/tecnico/jogador), avatar
  - `teams`: Team information including stats (wins, draws, losses, goals)
  - `players`: Player profiles linked to users and teams with statistics
  - `games`: Match scheduling with home/away teams, scores, dates, venues
  - `news`: News articles with title, content, author, published status
  - `payments`: Monthly fee tracking with playerId, amount, dueDate, paidDate, paymentMethod, status, month, year, notes
  - `messages`: Chat messages with associationId, authorId, channel (geral/tecnicos/diretoria), content, timestamp
  - `squadTeams`: Team categories with name, category, associationId, coachId, playerIds array, createdBy

**API Design:**
- RESTful endpoints under `/api` prefix
- Authentication endpoints: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- Resource endpoints for teams, players, games, news, payments, chat, and squadTeams
- Admin-only endpoints: POST/DELETE games, POST/DELETE players, all payment operations, POST/DELETE squadTeams
- Role-based endpoints: 
  - Chat channels enforce role restrictions (diretoria, tecnicos, geral)
  - SquadTeams allow técnicos to manage their assigned teams
- Zod schemas for request validation (defined in shared/schema.ts)
- Shared TypeScript types between client and server
- All insert schemas use `.strict()` for enhanced security

### Code Organization

**Monorepo Structure:**
- `client/`: Frontend React application
  - `src/pages/`: Route components (Home, Auth, Games, Team, Profile, Payments, Chat, SquadTeams)
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