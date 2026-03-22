# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # TypeScript compile + Vite build
npm run lint      # ESLint
npm run preview   # Preview production build
```

## Architecture

**Stack:** React 19 + TypeScript + Vite, deployed to Vercel. Supabase for auth, database, and RLS. No backend server — all data access is client-side via `@supabase/supabase-js`.

**Routes (React Router):**
- `/` — Main task management tool (`App.tsx`)
- `/work` — Work analytics & hour logging (`src/pages/WorkTrackerPage.tsx`)

**Data flow:**
1. `src/lib/supabase.ts` — single Supabase client instance
2. `src/context/AuthContext.tsx` — manages session + profile; auto-creates profile on first login
3. `src/hooks/useSupabase*.ts` — each hook owns one Supabase table (tasks, work_logs, profiles, lock_in_sessions)
4. Components consume hooks directly — no global state manager

**Supabase tables:** `tasks`, `work_logs` (upsert on user_id + work_date), `work_log_entries` (individual session entries with optional project_id), `projects` (user projects with name + color), `profiles` (lock_in_beat goal), `lock_in_sessions`

**Theming:** 4 themes (light, dark, hazard, cyber) via CSS variables in `src/styles/design-tokens.css`. Theme state lives in `ThemeContext.tsx` and is persisted to localStorage.

**Design system:** Brutalist — 4px borders, 8px shadow offsets, Impact/Anton headings. Max-width 800px container.

## Environment

Requires `.env.local` with:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Deployment

The app is deployed on Vercel. `vercel.json` rewrites all routes to `index.html` for SPA routing. Edge functions (if any) must be deployed manually — do not attempt to deploy edge functions automatically; instead, tell the user which function(s) to deploy.
