-- Live timer state. Max één actieve timer per user, daarom user_id als primary key.
-- Staat in de database (niet localStorage) zodat de timer refreshes overleeft
-- en je hem op je telefoon kunt stoppen als je hem op je laptop startte.
create table if not exists public.active_timers (
    user_id       uuid primary key references auth.users (id) on delete cascade,
    project_id    uuid references public.projects (id) on delete set null,
    intent        text,
    started_at    timestamptz not null default now(),
    sound_enabled boolean     not null default true,
    updated_at    timestamptz not null default now()
);

alter table public.active_timers enable row level security;

drop policy if exists "own_active_timer_select" on public.active_timers;
create policy "own_active_timer_select" on public.active_timers
    for select using (auth.uid() = user_id);

drop policy if exists "own_active_timer_insert" on public.active_timers;
create policy "own_active_timer_insert" on public.active_timers
    for insert with check (auth.uid() = user_id);

drop policy if exists "own_active_timer_update" on public.active_timers;
create policy "own_active_timer_update" on public.active_timers
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own_active_timer_delete" on public.active_timers;
create policy "own_active_timer_delete" on public.active_timers
    for delete using (auth.uid() = user_id);

-- Archiveren i.p.v. verwijderen: oude projecten verdwijnen uit de kiezer
-- zonder dat je de gelogde uren kwijtraakt.
alter table public.projects
    add column if not exists archived boolean not null default false;
