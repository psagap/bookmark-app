# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (Express Server)
```bash
bun install          # Install backend dependencies
bun run start        # Start production server (port 3000)
bun run dev          # Start with nodemon (auto-reload)
bun run test         # Run Jest tests
bun run test:watch   # Run tests in watch mode
```

### Frontend (React + Vite)
```bash
cd frontend
bun install          # Install frontend dependencies
bun run dev          # Start Vite dev server (proxies /api to localhost:3000)
bun run build        # Build for production (outputs to frontend/dist)
bun run lint         # Run ESLint
bun run preview      # Preview production build
```

### Running Both
For development, run backend (`bun run dev` in root) and frontend (`bun run dev` in frontend/) in separate terminals. The Vite dev server proxies API requests to the Express backend.

## Architecture Overview

### Three-Part System
1. **Backend** (`server.js`): Express server that provides REST API endpoints for bookmarks, collections, and notes. Uses Supabase as the database backend.
2. **Frontend** (`frontend/`): React 19 + Vite application with TailwindCSS. Built with shadcn/ui components, Framer Motion animations, and TipTap rich text editor.
3. **Chrome Extension** (`extension/`): Browser extension for saving bookmarks. Shares Supabase auth session with the web app.

### Data Flow
- Frontend uses `useBookmarks` and `useCollections` hooks for data fetching
- Hooks call Supabase directly for real-time data operations
- Backend server is used for serving the built frontend and some API operations
- Auth syncs between web app and extension via localStorage + custom events

### Key Frontend Structure
- **Contexts**: `AuthContext`, `ThemeContext`, `PreferencesContext` wrap the app in `main.jsx`
- **Hooks**: `useBookmarks.js`, `useCollections.js` handle data operations with Supabase
- **Components**: Large feature components include `BookmarkDetail.jsx`, `FilterStackSearch.jsx`, `MindSearch.jsx`, `NoteEditorModal.jsx`
- **Path alias**: `@/` maps to `frontend/src/` (configured in vite.config.js)

### Theming System
- CSS variables defined in `index.css` power the theming
- Multiple themes available (Gruvbox, vintage, etc.) via `ThemeContext`
- Tailwind uses CSS variables through custom color classes (`theme-*`, `gruvbox-*`, `vintage-*`)

### Environment Variables
Backend (`.env` in root):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Frontend (`.env` in frontend/):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Bookmark Data Model

Bookmarks have both frontend (camelCase) and database (snake_case) representations. The `bookmarkMapper.js` handles conversion. Key fields:
- `id`, `url`, `title`, `thumbnail`
- `category` (video/text/audio/image), `subCategory` (youtube-video, article, tweet, etc.)
- `tags[]`, `metadata{}`, `notes`
- `collectionId`, `archived`
- `createdAt`, `updatedAt` (epoch ms in frontend, ISO timestamps in DB)

## Working Notes
- Use bun for frontend package management
- The extension syncs auth via `supabase-session-update` custom events
- Rich text notes use TipTap with task lists and image extensions
