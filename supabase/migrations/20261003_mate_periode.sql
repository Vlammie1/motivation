-- ---------------------------------------------------------------------------
-- Mate: uren per dag over een periode, en datums die als tekst vergelijken.
--
-- `work_logs.work_date` (en `daily_habits.work_date`) is in deze database
-- tekst, geen datum. `mate_dag` vergeleek met een datum en gaf daarom
-- "operator does not exist: text = date". Alle vergelijkingen gaan nu via
-- tekst ('yyyy-mm-dd'), zodat het werkt of de kolom nu tekst of een datum is.
--
-- `mate_periode` geeft de uren per dag en per project, zodat Mate de dag, de
-- week en de maand in de balk kan vullen met wat er in de app staat (ook wat
-- je daar met de hand logde).
--
-- Eenmalig uitvoeren in de SQL-editor van Supabase, na 20261003_mate_mcp.sql.
-- ---------------------------------------------------------------------------

create or replace function public.mate_herbereken_dag(p_user uuid, p_datum date)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
    totaal numeric;
begin
    select coalesce(sum(hours), 0) into totaal
      from work_log_entries where user_id = p_user and work_date::text = p_datum::text;
    if totaal = 0 then
        delete from work_logs where user_id = p_user and work_date::text = p_datum::text;
    else
        insert into work_logs (user_id, work_date, hours) values (p_user, p_datum, totaal)
        on conflict (user_id, work_date) do update set hours = excluded.hours;
    end if;
    return totaal;
end;
$$;

create or replace function public.mate_projecten(p_sleutel text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    uid uuid := mate_gebruiker(p_sleutel);
begin
    return coalesce((
        select json_agg(json_build_object(
            'id', p.id,
            'naam', p.name,
            'gearchiveerd', p.archived,
            'uren_7d', coalesce((
                select round(sum(e.hours)::numeric, 2) from work_log_entries e
                 where e.project_id = p.id and e.user_id = uid and e.work_date::text >= (current_date - 7)::text
            ), 0)
        ) order by p.archived, p.name)
        from projects p where p.user_id = uid
    ), '[]'::json);
end;
$$;

create or replace function public.mate_dag(p_sleutel text, p_datum date)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    uid uuid := mate_gebruiker(p_sleutel);
    d text := p_datum::text;
begin
    return json_build_object(
        'datum', d,
        'uren', coalesce((select sum(e.hours) from work_log_entries e where e.user_id = uid and e.work_date::text = d), 0),
        'sessies', coalesce((
            select json_agg(json_build_object('uren', e.hours, 'notitie', e.note, 'project', p.name) order by e.created_at)
              from work_log_entries e left join projects p on p.id = e.project_id
             where e.user_id = uid and e.work_date::text = d
        ), '[]'::json),
        'opstaan', (select wake_time::text from daily_habits where user_id = uid and work_date::text = d),
        'slapen', (select sleep_time::text from daily_habits where user_id = uid and work_date::text = d)
    );
end;
$$;

-- Uren per dag tussen twee datums (beide meegeteld), met de verdeling over projecten.
create or replace function public.mate_periode(p_sleutel text, p_van date, p_tot date)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    uid uuid := mate_gebruiker(p_sleutel);
begin
    if p_tot < p_van or p_tot - p_van > 92 then
        raise exception 'een periode van hoogstens drie maanden, met tot na van';
    end if;
    return coalesce((
        select json_agg(json_build_object('datum', dag.datum, 'uren', dag.uren, 'projecten', dag.projecten) order by dag.datum)
        from (
            select d.datum, round(sum(d.uren)::numeric, 3) as uren, json_object_agg(d.project, d.uren) as projecten
              from (
                  select e.work_date::text as datum,
                         coalesce(p.name, 'zonder project') as project,
                         round(sum(e.hours)::numeric, 3) as uren
                    from work_log_entries e
                    left join projects p on p.id = e.project_id
                   where e.user_id = uid
                     and e.work_date::text between p_van::text and p_tot::text
                   group by 1, 2
              ) d
             group by d.datum
        ) dag
    ), '[]'::json);
end;
$$;

revoke all on function public.mate_periode(text, date, date) from public;
grant execute on function public.mate_periode(text, date, date) to anon, authenticated;
