# Campinho Conectado

## Overview

Campinho Conectado is a full-stack web application for managing amateur football associations. It provides comprehensive features for player management, game scheduling, team statistics, news publishing, payment management, and role-based user authentication. Designed as a mobile-first Progressive Web App (PWA), it aims to be a complete management solution for grassroots football organizations. The platform features a React frontend with custom JWT authentication, role-based authorization, and a PostgreSQL database backend.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Routing:** React 18 with TypeScript and Vite. Wouter is used for client-side routing. The design is mobile-first responsive with a bottom navigation pattern and PWA capabilities via VitePWA.

**UI Component Library:** Radix UI primitives and shadcn/ui components with Tailwind CSS for styling. A custom design system uses a black and orange color scheme.

**State Management:** TanStack Query (React Query) v5 for server state and React Context API for authentication state. Local storage persists JWT tokens.

**Styling System:** Tailwind CSS v3 with custom configuration, CSS variables for theming, and PostCSS.

### Backend Architecture

**Server Framework:** Express.js running on Node.js with TypeScript. Custom middleware handles logging, error handling, and JWT verification.

**Authentication & Security:** JWT-based authentication with a four-tier role-based authorization system: `presidente`, `diretoria`, `tecnico`, and `jogador`. bcryptjs hashes passwords. `authenticateToken`, `requireAdmin`, and `requireRole` middlewares enforce access control.

**Database Layer:** PostgreSQL accessed via Drizzle ORM. Key tables include `users`, `teams`, `players`, `games`, `news`, `payments`, `messages`, and `squadTeams`.

**API Design:** RESTful endpoints under `/api`. Includes authentication, resource management (teams, players, games, news, payments, chat, squadTeams), and admin/role-specific operations. Zod schemas validate requests.

### Code Organization

**Monorepo Structure:** Divided into `client/` (React app), `server/` (Express app), and `shared/` (common code like Drizzle/Zod schemas).

**Build Configuration:** Vite for the frontend build, TypeScript for type checking, and `tsx` for server-side execution with watch mode.

## External Dependencies

### Database

**PostgreSQL via Neon:** Cloud-hosted PostgreSQL (Neon.tech) with connection string in `DATABASE_URL`. Drizzle Kit handles schema migrations, and `postgres.js` is used for client connection.

### Third-Party Services

**Capacitor:** Configured for native mobile app capabilities (iOS/Android).

**Development Tools:** ESLint for code quality, React Hook Form with Zod for form handling.

### Key NPM Packages

**Frontend:** `@tanstack/react-query`, `wouter`, `sonner`, `date-fns`, `clsx`, `tailwind-merge`, `class-variance-authority`.

**Backend:** `express`, `drizzle-orm`, `postgres`, `bcryptjs`, `jsonwebtoken`, `zod`.

**Build Tools:** `vite`, `@vitejs/plugin-react-swc`, `typescript`, `tsx`, `tailwindcss`, `autoprefixer`.

### Environment Variables

Required: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`.

## Recent Changes (October 28, 2025)

**Chat System Fixed:**
- Fixed message retrieval in Chat page - messages now display correctly
- Corrected API endpoint URL format from query parameters to path parameters (`/api/chat/1/geral` instead of `/api/chat?clubId=1&channel=geral`)
- Updated cache invalidation to use proper query key format
- Auto-refresh every 3 seconds maintains real-time messaging
- Three channels: Geral (all members), Técnicos (diretoria + técnicos), Diretoria (presidente + diretoria only)

**Dashboard Integration with Squad Teams:**
- Dashboard "Próximo Jogo" card now correctly displays games from the Games tab
- Games use squadTeams (created in Times tab) instead of the old teams table
- Next game calculation filters future games and sorts by date to show the closest upcoming match
- Team names and abbreviations displayed from squadTeams
- Full integration: Create teams in Times tab → Create games in Games tab → See next game on Dashboard