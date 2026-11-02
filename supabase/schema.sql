-- ============================================================================
-- AQUA MATH BATTLE — SUPABASE SCHEMA, REALTIME & ROW LEVEL SECURITY (RLS)
-- Jalankan skrip ini pada SQL Editor di Dashboard Supabase.
-- ============================================================================

create table if not exists public.match_results (
  id text primary key,
  school_id text not null default 'sd-aqua-city',
  session_id text not null,
  started_at timestamptz not null,
  finished_at timestamptz not null default now(),
  battle_mode text not null check (battle_mode in ('touch', 'motion')),
  level text not null check (level in ('level1', 'level2', 'level3')),
  duration_seconds integer not null check (duration_seconds > 0 and duration_seconds <= 3600),
  total_questions integer not null check (total_questions > 0 and total_questions <= 100),
  blue_score integer not null default 0 check (blue_score >= 0),
  yellow_score integer not null default 0 check (yellow_score >= 0),
  blue_correct integer not null default 0 check (blue_correct >= 0),
  blue_wrong integer not null default 0 check (blue_wrong >= 0),
  yellow_correct integer not null default 0 check (yellow_correct >= 0),
  yellow_wrong integer not null default 0 check (yellow_wrong >= 0),
  winner text not null check (winner in ('blue', 'yellow', 'draw')),
  match_status text not null check (match_status in ('in_progress', 'completed', 'finished_early')),
  round_history jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_match_results_school_finished
  on public.match_results (school_id, finished_at desc);

-- Aktifkan Row Level Security (RLS)
alter table public.match_results enable row level security;

-- Kebijakan 1: Pembacaan riwayat pertandingan (PID & Laptop dengan school_id yang valid)
drop policy if exists "Allow read match_results by school_id" on public.match_results;
create policy "Allow read match_results by school_id"
  on public.match_results
  for select
  to anon, authenticated
  using (
    char_length(school_id) >= 2 and char_length(school_id) <= 64
  );

-- Kebijakan 2: Penyimpanan pertandingan baru (INSERT) dengan validasi ID unik & school_id
drop policy if exists "Allow insert match_results with valid constraints" on public.match_results;
create policy "Allow insert match_results with valid constraints"
  on public.match_results
  for insert
  to anon, authenticated
  with check (
    char_length(id) >= 8 and char_length(id) <= 96
    and char_length(school_id) >= 2 and char_length(school_id) <= 64
    and char_length(session_id) >= 4 and char_length(session_id) <= 96
    and blue_score >= 0 and yellow_score >= 0
  );

-- Kebijakan 3: Pembaruan sinkronisasi (UPSERT/UPDATE) hanya diizinkan dari sesi/sekolah yang sama
drop policy if exists "Allow upsert match_results from same school and session" on public.match_results;
create policy "Allow upsert match_results from same school and session"
  on public.match_results
  for update
  to anon, authenticated
  using (
    char_length(school_id) >= 2 and char_length(session_id) >= 4
  )
  with check (
    char_length(id) >= 8 and char_length(id) <= 96
    and blue_score >= 0 and yellow_score >= 0
  );

-- Kebijakan 4: Tolak penghapusan publik (DELETE dilarang untuk anon/authenticated)
drop policy if exists "Deny public delete on match_results" on public.match_results;
create policy "Deny public delete on match_results"
  on public.match_results
  for delete
  to anon, authenticated
  using (false);

-- Aktifkan Supabase Realtime khusus untuk tabel match_results
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'match_results'
  ) then
    alter publication supabase_realtime add table public.match_results;
  end if;
end $$;
