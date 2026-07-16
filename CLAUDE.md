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
- `/` — Work analytics & hour logging (`src/pages/WorkTrackerPage.tsx`); `/work` is a legacy alias
- `/projects` — Project management & per-project stats (`src/pages/ProjectsPage.tsx`)

**Data flow:**
1. `src/lib/supabase.ts` — single Supabase client instance
2. `src/context/AuthContext.tsx` — manages session + profile; auto-creates profile on first login
3. `src/context/ProjectsContext.tsx` — shared project list (wraps `useSupabaseProjects`)
4. `src/context/TimerContext.tsx` — the live timer; owns `active_timers` and writes sessions
5. `src/hooks/useSupabase*.ts` — each hook owns one Supabase table
6. Components consume hooks/contexts directly — no global state manager

**The timer** is the primary logging path. `src/components/TimerLayer.tsx` renders all timer UI outside the routes so it survives navigation. Flow: start modal (project + intent) → `FocusMode` (or `TimerBar` when minimized) → confirm modal (editable duration + note) → `work_log_entries` row. Timer state lives in the DB, not localStorage, so it survives reloads and works across devices. A timer found running for >4h on load is assumed forgotten and prompts for the real duration.

`src/lib/workEntries.ts` is the single writer for work entries — `work_logs` holds per-day totals derived from `work_log_entries`, so every mutation must go through it to keep the two in sync.

**Supabase tables:** `work_logs` (per-day total, upsert on user_id + work_date), `work_log_entries` (individual sessions with optional project_id), `projects` (name, color, archived), `active_timers` (one row per user, PK user_id), `daily_habits`, `other_activities`, `profiles`. `tasks` and `lock_in_sessions` still exist but are no longer read or written by the app.

**Theming:** 4 themes (light, dark, hazard, cyber) via CSS variables in `src/styles/design-tokens.css`. Theme state lives in `ThemeContext.tsx` and is persisted to localStorage.

**Design system:** Clean/modern with Impact/Anton headings and the original orange/yellow/blue palette. Max-width 900px container.

Everything comes from tokens in `src/styles/design-tokens.css` — never hardcode px values for these:
- **No drop shadows.** Depth comes from 1px borders (`--color-border`, `--color-border-strong`) and surface colours. The `--shadow-*` tokens all resolve to `none`; only `--shadow-ring` (the focus indicator) paints. Don't reintroduce `box-shadow` for elevation.
- **Surfaces:** `--color-canvas` is the page, `--color-bg` is a card on it, `--color-surface-2` is a nested/inset panel. Components set `background: var(--color-bg)`, so `--color-bg` must never equal the canvas.
- **Never** use `background: var(--color-text)` — it inverts per theme and produces white-on-white. Use `--color-surface-2` for active/selected states.
- **Spacing** is a 4px scale (`--spacing-2xs` … `--spacing-2xl`); **radius** is `--radius-sm/md/lg/full`; **type** is `--text-xs` … `--text-3xl`.
- Shared primitives live in `src/index.css`: `.card`, `.card-title`, `.label`, `.muted`, `.btn-primary`, `.stack`, `.modal-overlay`, `.modal-panel`, `.modal-header`, `.modal-close`.
- Form rows: give every field a `.label` (use an `aria-hidden` spacer label above a button) so inputs and buttons share one baseline.
- `--brutalist-border` / `--brutalist-shadow` are legacy aliases kept only so old call sites inherit the new look; prefer the real tokens in new code.

## Environment

Requires `.env.local` with:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Deployment

The app is deployed on Vercel. `vercel.json` rewrites all routes to `index.html` for SPA routing. Edge functions (if any) must be deployed manually — do not attempt to deploy edge functions automatically; instead, tell the user which function(s) to deploy.
