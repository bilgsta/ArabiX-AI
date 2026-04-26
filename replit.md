# Abu Al-Yazid – Personal AI Assistant

## Overview

Abu Al-Yazid is an Arabic-first personal AI assistant platform built by ArabiX AI. It's designed to compete with ChatGPT and Google Gemini while maintaining a unique Arabic identity in design, language, and user experience. The platform supports intelligent AI conversations with streaming responses, content generation, code help, and multimodal capabilities (image, audio, documents). It features end-to-end encryption badges, RTL layout, and a premium Islamic green design theme.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (React + Vite)

- **Framework**: React 18 with TypeScript, bundled by Vite
- **Routing**: Wouter (lightweight router) with routes: `/` (landing), `/c/:id` (chat), `/settings`
- **State Management**: TanStack React Query for server state, local React state for UI
- **UI Components**: Shadcn/ui (new-york style) with Radix UI primitives, Tailwind CSS
- **Styling**: Tailwind CSS with CSS variables for theming. Custom Islamic green color palette with dark mode support. IBM Plex Sans Arabic as the primary font, Fira Code for monospace
- **RTL Support**: The app is Arabic-first and expects RTL layout direction
- **Chat Features**: Markdown rendering (react-markdown + remark-gfm), syntax highlighting (react-syntax-highlighter), streaming SSE responses, framer-motion animations
- **Path aliases**: `@/` → `client/src/`, `@shared/` → `shared/`, `@assets/` → `attached_assets/`

### Backend (Express + Node.js)

- **Framework**: Express.js running on Node with TypeScript (tsx)
- **API Pattern**: RESTful JSON API under `/api/` prefix. Chat responses use Server-Sent Events (SSE) for streaming
- **AI Integration**: OpenAI SDK configured with Replit AI Integrations environment variables (`AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`)
- **File Uploads**: Multer with disk storage to `client/public/uploads`
- **Build**: Custom build script using esbuild for server and Vite for client. Production output goes to `dist/`

### Authentication

- **Method**: Replit Auth via OpenID Connect (passport + openid-client)
- **Sessions**: Express sessions stored in PostgreSQL via `connect-pg-simple`
- **Session table**: `sessions` table is mandatory — do not drop it
- **User table**: `users` table is mandatory — do not drop it
- **Key routes**: `/api/login`, `/api/logout`, `/api/auth/user`
- **Middleware**: `isAuthenticated` guard for protected routes

### Database

- **Database**: PostgreSQL (required, accessed via `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with `drizzle-zod` for schema validation
- **Schema location**: `shared/schema.ts` (main app tables), `shared/models/auth.ts` (auth tables), `shared/models/chat.ts` (chat integration tables)
- **Migrations**: Drizzle Kit with `drizzle-kit push` command (`npm run db:push`)
- **Key tables**:
  - `sessions` — session storage (required for auth)
  - `users` — user accounts (required for auth)
  - `user_preferences` — language, theme, font size, accent color settings
  - `subscriptions` — user subscription plans (free/premium)
  - `conversations` — chat conversations with userId, title, model, encryption flag
  - `messages` — chat messages with role, content, conversationId

### Shared Code (`shared/`)

- `schema.ts` — All Drizzle table definitions and Zod insert schemas
- `routes.ts` — Typed API route definitions with Zod response schemas, used by both client and server
- `models/auth.ts` — Auth-specific table definitions (duplicated from schema for integration compatibility)
- `models/chat.ts` — Chat-specific table definitions (integration scaffolding)

### Branding / Logo

- **Logo file**: `attached_assets/generated_images/abu_alyazid_logo.png` — cute Emirati boy character (kandura + ghutra) with futuristic AI accents on a green gradient background.
- **Used in**: Sidebar header, Landing page nav, ChatPage welcome screen, ChatBubble (assistant avatar), favicon, PWA icons.
- **Public copies**: `client/public/logo.png`, `client/public/favicon.png`, `client/public/icon-192.png`, `client/public/icon-512.png` — all currently the same image. To swap the logo, replace the file at `attached_assets/generated_images/abu_alyazid_logo.png` and copy it over the four files in `client/public/`.
- **Import in components**: `import logoImg from "@assets/generated_images/abu_alyazid_logo.png";`

### Admin Panel

- **Route**: `/admin` (page: `client/src/pages/AdminPage.tsx`)
- **Access control**: Email-based. Allowed emails are listed in `ADMIN_EMAILS` array inside `server/routes.ts`. Currently: `3mir.uk@gmail.com` (Bilal Amir).
- **Endpoints** (all protected by `isAuthenticated` + `isAdmin`):
  - `GET /api/admin/me` — returns `{ isAdmin: boolean }` for the current user
  - `GET /api/admin/stats` — total users / conversations / messages
  - `GET /api/admin/conversations` — all conversations across all users with user info and message counts (passwordHash stripped, replaced with `isLocked` flag)
  - `GET /api/admin/conversations/:id/messages` — full messages for any conversation
  - `GET /api/admin/users` — all registered users
- **Sidebar link**: An amber "لوحة الأدمن" button appears at the bottom of the sidebar only for admin users (via `/api/admin/me` check).
- **To add more admins**: Edit the `ADMIN_EMAILS` array in `server/routes.ts`.

### Replit Integrations (`server/replit_integrations/` and `client/replit_integrations/`)

Pre-built integration modules for:
- **Auth**: Replit OIDC authentication with passport
- **Chat**: Basic chat CRUD with OpenAI streaming (custom routes override these)
- **Audio**: Voice recording, playback, speech-to-text, text-to-speech via AudioWorklet
- **Image**: Image generation via `gpt-image-1` model
- **Batch**: Rate-limited batch processing utility with retries

## Mobile App (Android)

A complete React Native + Expo Android app is located in the `mobile/` directory.

- **Entry point**: `mobile/App.tsx`
- **Backend URL**: Configure in `mobile/src/api/client.ts` → `BASE_URL`
- **Screens**: Splash, Login, Chat (with sidebar drawer), Voice mode, Settings
- **Build**: `cd mobile && npm install && npx eas build --platform android --profile preview`
- **Full docs**: See `mobile/README.md`

## External Dependencies

- **PostgreSQL**: Primary database, must be provisioned with `DATABASE_URL` environment variable
- **OpenAI API** (via Replit AI Integrations): Powers chat completions, image generation, speech-to-text, and text-to-speech. Configured via `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL`
- **Replit Auth (OIDC)**: Authentication provider. Requires `ISSUER_URL`, `REPL_ID`, and `SESSION_SECRET` environment variables
- **Google Fonts**: IBM Plex Sans Arabic, Fira Code, DM Sans, Geist Mono loaded via CDN
- **Key npm packages**: express, drizzle-orm, openai, passport, react-query, wouter, react-markdown, framer-motion, shadcn/ui components, multer