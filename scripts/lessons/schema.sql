-- OWNER: Lessons feature. Apply ONLY to the team's dedicated Boomer project.
-- Tables are server-only; every HTTP operation authenticates and authorizes explicitly.
create table if not exists public.boomer_lesson_workers (
 worker_id text primary key, user_id uuid not null references auth.users(id)
);
create table if not exists public.boomer_lessons (
 id text primary key, owner_id uuid not null references auth.users(id),
 version integer not null default 1, document jsonb not null,
 created_at timestamptz not null default now()
);
create table if not exists public.boomer_lesson_tasks (
 id text primary key, lesson_id text not null references public.boomer_lessons(id),
 kind text not null check(kind in ('prepare','render')), revision integer not null,
 state text not null default 'queued' check(state in ('queued','running','done','failed')),
 attempts integer not null default 0, not_before timestamptz not null default now(), lease_token uuid, lease_until timestamptz, error text,
 created_at timestamptz not null default now()
);
create index if not exists boomer_lesson_task_queue on public.boomer_lesson_tasks(state,created_at);
alter table public.boomer_lesson_workers enable row level security;
alter table public.boomer_lessons enable row level security;
alter table public.boomer_lesson_tasks enable row level security;
revoke all on public.boomer_lesson_workers,public.boomer_lessons,public.boomer_lesson_tasks from anon,authenticated;
grant all on public.boomer_lesson_workers,public.boomer_lessons,public.boomer_lesson_tasks to service_role;
-- No public Storage policies. Only server-generated scoped signed URLs are issued.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('boomer-lesson-media','boomer-lesson-media',false,52428800,
 array['video/webm','video/mp4','audio/mpeg','audio/mp4','image/jpeg','text/vtt','application/octet-stream'])
on conflict(id) do nothing;
