-- Boomer schema. Paste into Supabase → SQL Editor → Run. Safe to run twice.
-- Documents (workers, jobs, records, tool logs, flags) are stored as JSON; the app owns the shape (lib/types.ts).

create table if not exists boomer_docs (
  kind        text not null,              -- worker | job | record | toollog | flag | contact | signup
  id          text not null,
  data        jsonb not null,
  worker_id   text,
  job_id      text,
  phone       text,
  version     integer not null default 1, -- optimistic concurrency for updateJob()
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (kind, id)
);
create index if not exists boomer_docs_worker on boomer_docs (kind, worker_id);
create index if not exists boomer_docs_job on boomer_docs (kind, job_id);
create index if not exists boomer_docs_phone on boomer_docs (kind, phone);

create table if not exists boomer_frames (
  id         text primary key,
  job_id     text not null,
  worker_id  text not null,
  at         timestamptz not null default now(),
  image      text not null,                -- data URL (~100 KB JPEG); old ones are pruned by the app
  burst      boolean not null default false
);
create index if not exists boomer_frames_job_at on boomer_frames (job_id, at desc);

-- Only the server (service role key) touches these tables.
alter table boomer_docs enable row level security;
alter table boomer_frames enable row level security;
