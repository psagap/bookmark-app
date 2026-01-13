# Repository Guidelines

Quick reference for contributors across the Express backend, Vite/React frontend, and Chrome extension. Keep changes small, tested, and clearly explained.

## Project Structure & Module Organization
- `server.js`: Express API serving `frontend/dist` plus Supabase-backed bookmark CRUD/metadata.
- `src/`: Node domain logic (`api/`, `storage/`, `categorization/`); integration tests live in `src/__tests__/`.
- `frontend/`: Vite + React UI (`frontend/src` components, `frontend/src/config/themes.js` tokens, `frontend/src/index.css` globals).
- `extension/`: Chrome extension scripts (`background.js`, `popup.js`) talking to the server.
- `public/` and root JSON files (`bookmarks.json`, `collections.json`) for static assets/sample data; `docs/` holds planning notes.

## Build, Test, and Development Commands
- Install deps with Bun: `bun install` (root) and `cd frontend && bun install` for the UI bundle.
- Backend dev: `bun run dev` (nodemon on port 3000) or `bun start` for production-mode server (expects built frontend in `frontend/dist`).
- Frontend: from `frontend/`, use `bun run dev` (Vite), `bun run build` (emits `frontend/dist`), `bun run preview` to serve the build, and `bun run lint` for ESLint.
- Tests: `bun run test` or `bun run test:watch` (Jest, Node env). Coverage is collected from `src/**/*.js` excluding test files.

## Coding Style & Naming Conventions
- JavaScript/JSX with 2-space indent and semicolons; backend uses CommonJS, frontend uses ES modules.
- React components and files are PascalCase; hooks/utility functions are camelCase. Prefer small functional components; pull shared tokens from `frontend/src/config/themes.js`.
- Prefer small pure functions in `src/` modules; keep Supabase/env access centralized in `server.js`. Tailwind-style classnames live in JSX—keep them readable.

## Testing Guidelines
- Place new tests under `src/__tests__` using `*.test.js`; mirror the modules you touch.
- `integration.test.js` sets up a temp dir—reuse its setup for filesystem isolation.
- For data-affecting changes, assert stats counts and CRUD flows; run `npm test` before opening a PR.

## Commit & Pull Request Guidelines
- Follow the conventional style in history (`feat: ...`, `fix: ...`, `chore: ...`).
- PRs should summarize the change, note affected areas (backend, frontend, extension), list commands/tests run, and include screenshots or clips for UI updates.
- Link related issues or plans in `docs/` when applicable; call out new env vars or migration steps.

## Security & Configuration Tips
- Keep secrets in `.env` (e.g., `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `YOUTUBE_API_KEY`); never commit them. Ensure keys match usages in `server.js` and any frontend env reads.
- Sample data in `bookmarks.json`/`collections.json` is for local use—avoid real user data. If Supabase is unavailable, fail fast with clear errors.
