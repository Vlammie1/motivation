-- ---------------------------------------------------------------------------
-- 1. Indexen. Elke query filtert op user_id; zonder index scant Postgres de
--    hele tabel. Geen CONCURRENTLY: de SQL-editor draait alles in één
--    transactie en dat verdraagt CONCURRENTLY niet. Bij deze tabelgroottes is
--    een gewone CREATE INDEX een kwestie van milliseconden.
-- ---------------------------------------------------------------------------
create index if not exists work_log_entries_user_date_idx
    on public.work_log_entries (user_id, work_date);
create index if not exists work_logs_user_date_idx
    on public.work_logs (user_id, work_date);
create index if not exists other_activities_user_date_idx
    on public.other_activities (user_id, work_date);
create index if not exists daily_habits_user_date_idx
    on public.daily_habits (user_id, work_date);
create index if not exists projects_user_idx
    on public.projects (user_id);

-- ---------------------------------------------------------------------------
-- 2. Taken per project. Losstaand van de oude, ongebruikte `tasks`-tabel.
-- ---------------------------------------------------------------------------
create table if not exists public.project_tasks (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid not null references auth.users (id) on delete cascade,
    project_id   uuid not null references public.projects (id) on delete cascade,
    title        text not null,
    notes        text,
    status       text not null default 'todo'
                 check (status in ('todo', 'doing', 'testing', 'done')),
    priority     text not null default 'medium'
                 check (priority in ('low', 'medium', 'high', 'critical')),
    -- Volgorde binnen een kolom. Een float laat je een kaart tussen twee
    -- bestaande kaarten droppen zonder de rest te hoeven hernummeren.
    position     double precision not null default 0,
    due_date     date,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now(),
    completed_at timestamptz
);

create index if not exists project_tasks_user_project_idx
    on public.project_tasks (user_id, project_id, status, position);

alter table public.project_tasks enable row level security;

-- (select auth.uid()) i.p.v. auth.uid(): zo evalueert Postgres de functie één
-- keer per query in plaats van één keer per rij.
drop policy if exists "own_project_tasks_select" on public.project_tasks;
create policy "own_project_tasks_select" on public.project_tasks
    for select using ((select auth.uid()) = user_id);

drop policy if exists "own_project_tasks_insert" on public.project_tasks;
create policy "own_project_tasks_insert" on public.project_tasks
    for insert with check ((select auth.uid()) = user_id);

drop policy if exists "own_project_tasks_update" on public.project_tasks;
create policy "own_project_tasks_update" on public.project_tasks
    for update using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "own_project_tasks_delete" on public.project_tasks;
create policy "own_project_tasks_delete" on public.project_tasks
    for delete using ((select auth.uid()) = user_id);
