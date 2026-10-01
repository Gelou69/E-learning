-- =====================================================================
--  VGD E-Learning Hub — Supabase schema
--  Grade 11 Visual Graphics Design (DepEd SHS)
--
--  HOW TO APPLY
--  1. Supabase Dashboard → SQL Editor → New query
--  2. Paste this whole file → Run
--  3. Then run `supabase/seed.sql` (section 2 below is included at the end)
-- =====================================================================

create schema if not exists extensions;
create extension if not exists "pgcrypto" with schema extensions;

-- ---------------------------------------------------------------------
-- 1. profiles  (mirrors auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  email         text not null unique,
  full_name     text not null,
  role          text not null default 'student'
                check (role in ('student', 'teacher', 'admin')),
  requested_role text check (requested_role in ('student', 'teacher')),
  section       text,
  student_no    text,
  gender        text,
  avatar_color  text default '#0f766e',
  phone         text,
  is_active     boolean not null default true,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now()
);

alter table public.profiles add column if not exists requested_role text;
alter table public.profiles drop constraint if exists profiles_requested_role_check;
alter table public.profiles add constraint profiles_requested_role_check
  check (requested_role in ('student', 'teacher'));

-- ---------------------------------------------------------------------
-- 0. helper: role lookup from JWT
-- ---------------------------------------------------------------------
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (select 1 from public.profiles where id = auth.uid() and is_active = false) then 'student'
    else coalesce(
      (select raw_app_meta_data ->> 'role' from auth.users where id = auth.uid()),
      (select role from public.profiles where id = auth.uid()),
      'student'
    )
  end;
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
as $$
  select public.current_role() in ('teacher', 'admin');
$$;

alter table public.profiles enable row level security;

drop policy if exists "profiles read authenticated" on public.profiles;
create policy "profiles read authenticated"
  on public.profiles for select
  to authenticated using (true);

drop policy if exists "profiles update self" on public.profiles;
create policy "profiles update self"
  on public.profiles for update
  to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles admin all" on public.profiles;
create policy "profiles admin all"
  on public.profiles for all
  to authenticated using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- keep profile in sync with auth.users
-- NOTE: role is taken from raw_app_meta_data only (server controlled by the
-- create-user Edge Function). Client metadata can never grant a role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, requested_role, section, student_no, avatar_color, is_active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case
      when new.raw_app_meta_data ->> 'role' in ('student', 'teacher', 'admin')
        then new.raw_app_meta_data ->> 'role'
      else 'student'
    end,
    case
      when new.raw_user_meta_data ->> 'requested_role' in ('student', 'teacher')
        then new.raw_user_meta_data ->> 'requested_role'
      else null
    end,
    new.raw_user_meta_data ->> 'section',
    new.raw_user_meta_data ->> 'student_no',
    coalesce(new.raw_user_meta_data ->> 'avatar_color', '#0f766e'),
    case
      when new.raw_user_meta_data ->> 'requested_role' in ('student', 'teacher') then false
      else true
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 1b. role protection
-- A signed-in student must never be able to promote themselves, and the
-- self-update policy grants UPDATE on every column — so guard the column.
-- ---------------------------------------------------------------------
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.role is distinct from old.role and public.current_role() <> 'admin' then
    raise exception 'Only an admin can change an account role.';
  end if;
  if new.is_active is distinct from old.is_active and public.current_role() <> 'admin' then
    raise exception 'Only an admin can activate or deactivate an account.';
  end if;
  if new.requested_role is distinct from old.requested_role and public.current_role() <> 'admin' then
    raise exception 'Only an admin can change an account role request.';
  end if;
  if new.email is distinct from old.email then
    raise exception 'Email is managed by Supabase Auth.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Column privileges are deliberately left intact so admins can still toggle
-- is_active from the browser; the trigger above is what blocks the escalation.
revoke update (role) on public.profiles from anon;

-- ---------------------------------------------------------------------
-- 2. content tables  (text ids keep the seed ids stable)
-- ---------------------------------------------------------------------
create table if not exists public.plates (
  id          text primary key,
  title       text not null,
  topic       text not null,
  difficulty  text not null default 'Intermediate',
  sdgs        int[] not null default '{}',
  quarter     text not null,
  scale       text default 'NTS',
  description text,
  svg         text,                     -- generated vector plate markup
  file_path   text,                     -- or an uploaded file in storage
  featured    boolean default false,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.lessons (
  id          text primary key,
  title       text not null,
  topic       text not null,
  quarter     text not null,
  sdgs        int[] not null default '{}',
  pages       int not null default 1,
  size_kb     int default 0,
  summary     text,
  sections    jsonb not null default '[]'::jsonb,   -- [{heading, body[], bullets[]}]
  published   boolean not null default true,
  file_path   text,
  file_name   text,
  generated   boolean not null default true,        -- rendered in-app when no file
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.videos (
  id          text primary key,
  title       text not null,
  topic       text not null,
  quarter     text not null,
  sdgs        int[] not null default '{}',
  duration    text,
  level       text default 'Beginner',
  provider    text default 'youtube',
  video_id    text not null,
  summary     text,
  tasks       jsonb not null default '[]'::jsonb,   -- [{id,title,detail}]
  created_at  timestamptz not null default now()
);

create table if not exists public.announcements (
  id         text primary key,
  title      text not null,
  body       text not null,
  audience   text not null default 'all'
             check (audience in ('all', 'students', 'teachers', 'admins')),
  author     text,
  author_id  uuid references public.profiles(id) on delete set null,
  pinned     boolean default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. student work
-- ---------------------------------------------------------------------
create table if not exists public.submissions (
  id              text primary key,
  kind            text not null check (kind in ('plate', 'video')),
  ref_id          text not null,
  student_id      uuid not null references public.profiles(id) on delete cascade,
  section         text,
  file_name       text,
  file_path       text,               -- storage path
  notes           text default '',
  status          text not null default 'submitted'
                  check (status in ('submitted', 'graded', 'returned')),
  feedback        text default '',
  rubric_scores   jsonb not null default '{}'::jsonb,  -- {criterionId: 1..5}
  checklist_score int,
  grader_id       uuid references public.profiles(id) on delete set null,
  submitted_at    timestamptz not null default now(),
  graded_at       timestamptz
);

create table if not exists public.lesson_progress (
  id          text primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  ref_id      text not null,
  status      text not null default 'opened'
              check (status in ('opened', 'completed')),
  page        int not null default 1,
  last_opened timestamptz not null default now(),
  unique (user_id, ref_id)
);

create table if not exists public.bookmarks (
  id         text primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  ref_id     text not null,
  page       int not null,
  note       text default '',
  created_at timestamptz not null default now(),
  unique (user_id, ref_id, page)
);

create table if not exists public.survey_responses (
  id           text primary key,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  section      text,
  answers      jsonb not null default '{}'::jsonb,   -- {itemId: 1..5} already reverse-scored
  submitted_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.checklist_assessments (
  id            text primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  section       text,
  responses     jsonb not null default '{}'::jsonb,  -- {indicatorId: 0|1}
  self_assessed boolean default false,
  submitted_at  timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.activity_log (
  id        text primary key,
  kind      text not null,
  user_id   uuid references public.profiles(id) on delete set null,
  ref_id    text,
  file_name text,
  meta      jsonb default '{}'::jsonb,
  at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. RLS for content tables
-- ---------------------------------------------------------------------
alter table public.plates    enable row level security;
alter table public.lessons   enable row level security;
alter table public.videos    enable row level security;
alter table public.announcements enable row level security;

drop policy if exists "plates read auth" on public.plates;
create policy "plates read auth" on public.plates
  for select to authenticated using (true);
drop policy if exists "plates write staff" on public.plates;
create policy "plates write staff" on public.plates
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "videos read auth" on public.videos;
create policy "videos read auth" on public.videos
  for select to authenticated using (true);
drop policy if exists "videos write staff" on public.videos;
create policy "videos write staff" on public.videos
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "announcements read auth" on public.announcements;
create policy "announcements read auth" on public.announcements
  for select to authenticated using (true);
drop policy if exists "announcements write staff" on public.announcements;
create policy "announcements write staff" on public.announcements
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- students only see published lessons; staff see drafts too
drop policy if exists "lessons read auth" on public.lessons;
create policy "lessons read auth" on public.lessons
  for select to authenticated using (published or public.is_staff());
drop policy if exists "lessons write staff" on public.lessons;
create policy "lessons write staff" on public.lessons
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------
-- 5. RLS for student work
-- ---------------------------------------------------------------------
alter table public.submissions enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.bookmarks enable row level security;
alter table public.survey_responses enable row level security;
alter table public.checklist_assessments enable row level security;
alter table public.activity_log enable row level security;

drop policy if exists "submissions read own or staff" on public.submissions;
create policy "submissions read own or staff" on public.submissions
  for select to authenticated using (student_id = auth.uid() or public.is_staff());
drop policy if exists "submissions insert own" on public.submissions;
create policy "submissions insert own" on public.submissions
  for insert to authenticated with check (student_id = auth.uid());
drop policy if exists "submissions delete own pending" on public.submissions;
create policy "submissions delete own pending" on public.submissions
  for delete to authenticated using (student_id = auth.uid() and status = 'submitted');
drop policy if exists "submissions grade staff" on public.submissions;
create policy "submissions grade staff" on public.submissions
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "progress read own" on public.lesson_progress;
create policy "progress read own" on public.lesson_progress
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "progress write own" on public.lesson_progress;
create policy "progress write own" on public.lesson_progress
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "bookmarks read own" on public.bookmarks;
create policy "bookmarks read own" on public.bookmarks
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "bookmarks write own" on public.bookmarks;
create policy "bookmarks write own" on public.bookmarks
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "surveys read own or staff" on public.survey_responses;
create policy "surveys read own or staff" on public.survey_responses
  for select to authenticated using (user_id = auth.uid() or public.is_staff());
drop policy if exists "surveys write own" on public.survey_responses;
create policy "surveys write own" on public.survey_responses
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "checklists read own or staff" on public.checklist_assessments;
create policy "checklists read own or staff" on public.checklist_assessments
  for select to authenticated using (user_id = auth.uid() or public.is_staff());
drop policy if exists "checklists write own" on public.checklist_assessments;
create policy "checklists write own" on public.checklist_assessments
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Staff can truncate/reset learner data in bulk (used by Settings → Clear learner data)
drop policy if exists "submissions delete staff" on public.submissions;
create policy "submissions delete staff" on public.submissions
  for delete to authenticated using (public.is_staff());
drop policy if exists "progress delete staff" on public.lesson_progress;
create policy "progress delete staff" on public.lesson_progress
  for delete to authenticated using (public.is_staff());
drop policy if exists "bookmarks delete staff" on public.bookmarks;
create policy "bookmarks delete staff" on public.bookmarks
  for delete to authenticated using (public.is_staff());
drop policy if exists "surveys delete staff" on public.survey_responses;
create policy "surveys delete staff" on public.survey_responses
  for delete to authenticated using (public.is_staff());
drop policy if exists "checklists delete staff" on public.checklist_assessments;
create policy "checklists delete staff" on public.checklist_assessments
  for delete to authenticated using (public.is_staff());
drop policy if exists "activity delete staff" on public.activity_log;
create policy "activity delete staff" on public.activity_log
  for delete to authenticated using (public.is_staff());

drop policy if exists "activity read staff" on public.activity_log;
create policy "activity read staff" on public.activity_log
  for select to authenticated using (public.is_staff() or user_id = auth.uid());
drop policy if exists "activity insert auth" on public.activity_log;
create policy "activity insert auth" on public.activity_log
  for insert to authenticated with check (true);

-- ---------------------------------------------------------------------
-- 6. convenience views for analytics
-- ---------------------------------------------------------------------
create or replace view public.v_submission_joined as
select
  s.*,
  p.full_name as student_name,
  p.student_no,
  p.section   as student_section
from public.submissions s
left join public.profiles p on p.id = s.student_id;

create or replace view public.v_learner_rollup as
select
  p.id,
  p.full_name,
  p.section,
  p.student_no,
  (select count(*) from public.survey_responses sr where sr.user_id = p.id)      as has_survey,
  (select count(*) from public.checklist_assessments ca where ca.user_id = p.id)  as has_checklist,
  (select count(*) from public.submissions su where su.student_id = p.id)        as submissions,
  (select count(*) from public.submissions su where su.student_id = p.id and su.status = 'graded') as graded
from public.profiles p
where p.role = 'student';

-- =====================================================================
-- 7. STORAGE BUCKETS  (create once in Dashboard → Storage, or run below)
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('submissions', 'submissions', false, 10485760),
  ('lessons',     'lessons',     false, 26214400),
  ('plates',      'plates',      true,  10485760),
  ('avatars',     'avatars',     true,  2097152)
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit;

drop policy if exists "submissions own files" on storage.objects;
create policy "submissions own files" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'submissions'
    and (
      public.is_staff()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  )
  with check (
    bucket_id = 'submissions'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff())
  );

drop policy if exists "lessons staff files" on storage.objects;
create policy "lessons staff files" on storage.objects
  for all to authenticated
  using (bucket_id = 'lessons' and public.is_staff())
  with check (bucket_id = 'lessons' and public.is_staff());

drop policy if exists "plates public read" on storage.objects;
create policy "plates public read" on storage.objects
  for select to authenticated using (bucket_id = 'plates');
drop policy if exists "plates staff write" on storage.objects;
create policy "plates staff write" on storage.objects
  for insert to authenticated with check (bucket_id = 'plates' and public.is_staff());
drop policy if exists "plates staff update" on storage.objects;
create policy "plates staff update" on storage.objects
  for update to authenticated using (bucket_id = 'plates' and public.is_staff());
drop policy if exists "plates staff delete" on storage.objects;
create policy "plates staff delete" on storage.objects
  for delete to authenticated using (bucket_id = 'plates' and public.is_staff());

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select to authenticated using (bucket_id = 'avatars');
drop policy if exists "avatars own write" on storage.objects;
create policy "avatars own write" on storage.objects
  for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- NOTE: private-bucket files (submissions, lessons) are read from the browser
-- with supabase.storage.from(bucket).createSignedUrl(path, 3600).
-- Delete any previously created `public.signed_url` helper — it is not needed.
drop function if exists public.signed_url(text, text, int);
