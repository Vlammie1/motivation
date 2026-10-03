-- ---------------------------------------------------------------------------
-- Mate schrijft werk en slaap weg via de MCP-route (`api/mcp.ts`).
--
-- Die route heeft alleen de publieke anon-sleutel, dus Mate kan niet als jou
-- inloggen en RLS laat hem nergens bij. In plaats daarvan krijgt hij een eigen
-- sleutel (aan te maken op de site, onder "Mate"), en doen deze functies het
-- werk namens de eigenaar van die sleutel. Ze controleren de sleutel zelf en
-- raken alleen rijen van die gebruiker aan. Alleen de hash staat in de tabel:
-- wie de database leest, kan er niet mee schrijven.
--
-- Eenmalig uitvoeren in de SQL-editor van Supabase.
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.mate_sleutels (
    user_id         uuid primary key references auth.users (id) on delete cascade,
    sleutel_hash    text not null unique,
    aangemaakt_op   timestamptz not null default now(),
    laatst_gebruikt timestamptz
);

-- RLS aan en geen policies: alleen de functies hieronder komen bij deze tabel.
alter table public.mate_sleutels enable row level security;

-- Een sessie die Mate al stuurde, stuurt hij bij twijfel opnieuw. Met zijn
-- eigen kenmerk erbij wordt dat een correctie in plaats van dubbele uren.
alter table public.work_log_entries add column if not exists extern_id text;
create unique index if not exists work_log_entries_extern_idx
    on public.work_log_entries (user_id, extern_id) where extern_id is not null;

-- Een nieuwe sleutel voor de ingelogde gebruiker. Een oude vervalt meteen.
create or replace function public.mate_maak_sleutel()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    uid uuid := auth.uid();
    sleutel text;
begin
    if uid is null then
        raise exception 'niet ingelogd';
    end if;
    sleutel := 'mate_' || encode(gen_random_bytes(24), 'hex');
    insert into mate_sleutels (user_id, sleutel_hash)
    values (uid, encode(digest(sleutel, 'sha256'), 'hex'))
    on conflict (user_id) do update
        set sleutel_hash = excluded.sleutel_hash, aangemaakt_op = now(), laatst_gebruikt = null;
    return sleutel;
end;
$$;

-- Of er al een sleutel is, en wanneer Mate hem voor het laatst gebruikte.
create or replace function public.mate_sleutel_stand()
returns json
language sql
security definer
set search_path = public
as $$
    select json_build_object('aangemaakt_op', aangemaakt_op, 'laatst_gebruikt', laatst_gebruikt)
    from mate_sleutels where user_id = auth.uid();
$$;

-- Van sleutel naar gebruiker. Niet aan te roepen van buiten.
create or replace function public.mate_gebruiker(p_sleutel text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    uid uuid;
begin
    update mate_sleutels
       set laatst_gebruikt = now()
     where sleutel_hash = encode(digest(coalesce(p_sleutel, ''), 'sha256'), 'hex')
    returning user_id into uid;
    if uid is null then
        raise exception 'onbekende sleutel' using errcode = '28000';
    end if;
    return uid;
end;
$$;

-- Het dagtotaal opnieuw afleiden, zoals `recalcDayTotal` in de app.
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
      from work_log_entries where user_id = p_user and work_date = p_datum;
    if totaal = 0 then
        delete from work_logs where user_id = p_user and work_date = p_datum;
    else
        insert into work_logs (user_id, work_date, hours) values (p_user, p_datum, totaal)
        on conflict (user_id, work_date) do update set hours = excluded.hours;
    end if;
    return totaal;
end;
$$;

-- De projecten, met de uren van de laatste week, zodat Mate werk bij het
-- juiste project kan zetten.
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
                 where e.project_id = p.id and e.user_id = uid and e.work_date >= current_date - 7
            ), 0)
        ) order by p.archived, p.name)
        from projects p where p.user_id = uid
    ), '[]'::json);
end;
$$;

-- Eén werksessie. Met hetzelfde extern_id wordt een bestaande sessie bijgewerkt.
create or replace function public.mate_log_werk(
    p_sleutel text,
    p_datum date,
    p_uren numeric,
    p_notitie text default null,
    p_project uuid default null,
    p_extern text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    uid uuid := mate_gebruiker(p_sleutel);
    rij_id uuid;
    oude_datum date;
    totaal numeric;
begin
    if p_uren is null or p_uren <= 0 or p_uren > 16 then
        raise exception 'uren moeten tussen 0 en 16 liggen';
    end if;
    if p_project is not null and not exists (select 1 from projects where id = p_project and user_id = uid) then
        raise exception 'onbekend project';
    end if;

    if p_extern is not null then
        select id, work_date into rij_id, oude_datum
          from work_log_entries where user_id = uid and extern_id = p_extern;
    end if;

    if rij_id is null then
        insert into work_log_entries (user_id, work_date, hours, note, project_id, extern_id)
        values (uid, p_datum, round(p_uren, 3), left(p_notitie, 500), p_project, p_extern)
        returning id into rij_id;
    else
        update work_log_entries
           set work_date = p_datum, hours = round(p_uren, 3), note = left(p_notitie, 500), project_id = p_project
         where id = rij_id;
        if oude_datum <> p_datum then
            perform mate_herbereken_dag(uid, oude_datum);
        end if;
    end if;

    totaal := mate_herbereken_dag(uid, p_datum);
    return json_build_object('id', rij_id, 'dag_totaal', totaal);
end;
$$;

-- Slaap: het tijdstip van inslapen bij de dag waarop je naar bed ging, en het
-- tijdstip van wakker worden bij de dag waarop je opstond. Wat er al stond voor
-- de andere helft blijft staan. De tijden gaan als letterlijke waarde mee, zodat
-- het werkt of de kolom nu tekst of een tijd is.
create or replace function public.mate_log_slaap(
    p_sleutel text,
    p_slaap_datum date,
    p_slaap_tijd text,
    p_wakker_datum date,
    p_wakker_tijd text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    uid uuid := mate_gebruiker(p_sleutel);
begin
    if p_slaap_tijd !~ '^\d{2}:\d{2}$' or p_wakker_tijd !~ '^\d{2}:\d{2}$' then
        raise exception 'tijden als HH:MM';
    end if;
    execute format(
        'insert into daily_habits (user_id, work_date, sleep_time) values (%L, %L, %L)
         on conflict (user_id, work_date) do update set sleep_time = excluded.sleep_time',
        uid, p_slaap_datum, p_slaap_tijd);
    execute format(
        'insert into daily_habits (user_id, work_date, wake_time) values (%L, %L, %L)
         on conflict (user_id, work_date) do update set wake_time = excluded.wake_time',
        uid, p_wakker_datum, p_wakker_tijd);
    return json_build_object('ok', true);
end;
$$;

-- Wat er op een dag staat: de sessies, het totaal en de slaap.
create or replace function public.mate_dag(p_sleutel text, p_datum date)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    uid uuid := mate_gebruiker(p_sleutel);
begin
    return json_build_object(
        'datum', p_datum,
        'uren', coalesce((select hours from work_logs where user_id = uid and work_date = p_datum), 0),
        'sessies', coalesce((
            select json_agg(json_build_object('uren', e.hours, 'notitie', e.note, 'project', p.name) order by e.created_at)
              from work_log_entries e left join projects p on p.id = e.project_id
             where e.user_id = uid and e.work_date = p_datum
        ), '[]'::json),
        'opstaan', (select wake_time::text from daily_habits where user_id = uid and work_date = p_datum),
        'slapen', (select sleep_time::text from daily_habits where user_id = uid and work_date = p_datum)
    );
end;
$$;

-- Wie wat mag aanroepen. De sleutelfuncties zijn van buiten (anon) te roepen en
-- controleren zelf; het aanmaken alleen ingelogd; de hulpfuncties door niemand.
revoke all on function public.mate_maak_sleutel() from public, anon;
grant execute on function public.mate_maak_sleutel() to authenticated;
revoke all on function public.mate_sleutel_stand() from public, anon;
grant execute on function public.mate_sleutel_stand() to authenticated;
revoke all on function public.mate_gebruiker(text) from public, anon, authenticated;
revoke all on function public.mate_herbereken_dag(uuid, date) from public, anon, authenticated;
revoke all on function public.mate_projecten(text) from public;
grant execute on function public.mate_projecten(text) to anon, authenticated;
revoke all on function public.mate_log_werk(text, date, numeric, text, uuid, text) from public;
grant execute on function public.mate_log_werk(text, date, numeric, text, uuid, text) to anon, authenticated;
revoke all on function public.mate_log_slaap(text, date, text, date, text) from public;
grant execute on function public.mate_log_slaap(text, date, text, date, text) to anon, authenticated;
revoke all on function public.mate_dag(text, date) from public;
grant execute on function public.mate_dag(text, date) to anon, authenticated;
