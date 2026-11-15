# Reviewed video lessons — setup and handoff

This feature extends the v2 scaffold. It does not replace the guided-call engine or certify electrical work. Only `gfci-swap` can be published; capture may begin while the call is still identifying the job. The default countertop job has no verified Philadelphia-to-Princeton New here requirement; the lesson must not invent one.

## What is implemented

- Camera page: opt-in video-only MediaRecorder using cloned camera tracks. No microphone permission is requested. Still uploads and wake lock remain owned by the existing camera hooks. Four-second recording chunks persist in IndexedDB. A completed/stopped job stops recording; stopping attempts direct uploads automatically. Network failures retain chunks for explicit retry. Local chunks are deleted only after server verification and finalization. A browser crash may leave an incomplete local recording; it is labeled interrupted and cannot silently become a lesson.
- Private authenticated workspace: Supabase email link/code sign-in, explicit worker-account binding by an allowlisted reviewer, private drafts and lesson editor. Edit clip bounds/order, source session/call, audio offset, chapter captions, transcript caption corrections, freeze frames, boxes/arrows and labels. Source transcript is retained unchanged. Every content edit invalidates the render, review, sync check and publishing permission.
- Post-call integration: the existing signature-verified webhook retains full raw transcript and timed turns for consented lesson jobs. This happens before summary-event dedup so a retried evidence write is not silently skipped. Local unsigned webhook shortcuts do not capture private call data. The laptop worker retrieves original call audio through the ElevenLabs conversation-audio API; large base64 audio payloads do not pass through Vercel.
- Job closure: existing record and iMessage behavior stays first; a small, bounded lesson hook snapshots completion and queues preparation. Preparation and rendering never run inside live voice checks. Call/media events wake waiting tasks. Missing source media never produces fabricated footage or speech.
- Trusted laptop worker: durable task queue, optimistic claim, two-minute lease, thirty-second heartbeat, explicit failure/retry, and temporary-file cleanup. Source assembly validates sequence/size and probes media duration, including browser WebM streams that omit a duration header. Build a deterministic evidence/timestamp proposal; real Gemini may shorten/copy-edit within the existing evidence intervals, with schema/range validation and deterministic fallback. No model-generated part positions are accepted without manual placement/review in this MVP.
- Rendering: FFmpeg H.264/AAC MP4, portrait/landscape normalization, labeled freeze-frame annotations, original conversation audio, silent freeze holds, a burned inert-demo notice, synchronized VTT transcript, poster and chapter timing. This is post-production annotation, not live AR tracking.
- Public `/lessons` library and lesson viewer: published projections only. Source media, raw calls, owner IDs, private drafts and credentials do not appear in public responses. New public media requests check publication before streaming; withdrawal blocks subsequent requests. Already-downloaded video cannot be recalled.

## Live setup and remaining dependencies

The dedicated Boomer project (`xhxckolfwfpvqmwltpis`) is configured locally. The bootstrap schema was applied through the authorized Supabase dashboard, and its private bucket, RLS and table grants were verified. A disposable, visibly labeled private fixture exercised real authentication, direct uploads, queue claims, FFmpeg rendering and private output storage; its users, rows and objects were removed afterward. No unrelated project was modified. The connected MCP account still lacks management access, so dashboard access was used. Configure these environment variables locally AND on Vercel as appropriate:

```
LESSON_SUPABASE_URL=https://YOUR-BOOMER-PROJECT.supabase.co
LESSON_SUPABASE_SERVICE_ROLE_KEY=<server-only>
NEXT_PUBLIC_LESSON_SUPABASE_ANON_KEY=<project public anon/publishable key supported by installed SDK>
LESSON_REVIEWER_EMAILS=<comma-separated verified team reviewer account emails>
ELEVENLABS_API_KEY=<worker-only for conversation audio retrieval>
ELEVENLABS_WEBHOOK_SECRET=<same signed-webhook secret as the existing backend>
FFMPEG_PATH=<local ffmpeg executable; omit if ffmpeg is on PATH>
```

Do not send secret keys through chat or commit them. Lesson-specific configuration is deliberately separate from generic Supabase variables so unrelated existing projects cannot be used accidentally. Missing configuration disables private capture and displays a setup-required state. There is no in-memory production fallback for lessons.

In the dedicated project only:

1. `scripts/lessons/schema.sql` has been applied to the dedicated project. It creates three server-only tables with RLS enabled and no anon/authenticated grants, and one private media bucket. This is a bootstrap script, not a Supabase migration-history entry. For a fresh project, apply it before using the APIs.
2. Confirm the bucket is private, has no public object policies, and accepts the script's allowed media types. Source parts are capped at 25 MiB each by the API; the private bucket has a 50 MiB object limit and render bitrate/duration are bounded to fit it. Never change it to public to fix preview access.
3. Enable email OTP/magic-link sign-in. The currently authorized dashboard account can run SQL but Auth URL settings are read-only; the project owner must add the following exact redirect URLs in Authentication → URL Configuration (do not allow arbitrary domains):
   - `http://localhost:3000/lessons/workspace`
   - `https://YOUR-TEAM-DEPLOYMENT/lessons/workspace`
   Verify email delivery and sign-in in that project. New preview deployments need their own redirect entry. The original Aniketh-owned Vercel project and its previews have been removed at the team’s request. The repository owner is deploying a replacement. Configure the lesson URL/server/public-key variables and reviewer allowlist on that new project; the retired project’s configuration does not transfer automatically.
4. Sign in as reviewer and worker. The workspace displays each account UUID. Reviewer explicitly links the existing worker ID to the correct UUID. There is no automatic ownership based on phone number and no account reassignment endpoint.
5. Enable ElevenLabs post-call transcription webhooks with timestamps, conversation ID, call start time/duration and the same `job_id` mapping as the existing integration. Confirm provider recording retention/consent and that the worker account can retrieve conversation audio. Original audio is fetched by the laptop worker, not exposed through the browser.
6. Configure Zohaib's durable job persistence for Vercel using the merged backend setup guide (`docs/setup-backend.md` and `supabase/schema.sql`). The backend falls back to process-local memory when its own Supabase variables are absent; lesson-specific variables do not configure it. Source snapshots persist in lesson storage after capture starts. Reusing demo-2041 after a reset is rejected instead of mixing distinct recordings into an old lesson; create a new job ID for a new recording.

Apply least-privilege access, verify anonymous direct table and bucket reads fail, and run Supabase security advisors in the actual Boomer project after setup. Service-role keys remain only on the server and trusted rendering laptop. No new paid service or unrelated project was activated.

## Run the worker

### Hosted production worker

`.github/workflows/lesson-worker.yml` runs on GitHub-hosted Ubuntu with FFmpeg.
It is scheduled every five minutes off the top of the hour and can be started
manually from Actions → Training lesson worker → Run workflow. Scheduled runs
can be delayed by GitHub; this is asynchronous preparation, not a live-call path.
Only main can process production tasks, and one workflow run executes at a time.
`npm run lessons:drain` processes available tasks, stops when none are eligible,
and checks a twenty-minute drain budget between tasks. The job has a forty-minute
timeout; an interrupted task's lease can be reclaimed by a later run.

Repository Actions secrets are `LESSON_SUPABASE_URL`,
`LESSON_SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_LESSON_SUPABASE_ANON_KEY`,
and `LESSON_REVIEWER_EMAILS`. Optional secrets are `LESSON_GEMINI_API_KEY`,
`LESSON_ELEVENLABS_API_KEY`, and `LESSON_ELEVENLABS_WEBHOOK_SECRET`.
They are mapped to the application's environment names only inside the worker.
No service credential belongs in source or a public build variable.
GitHub can disable scheduled workflows after prolonged repository inactivity;
check Actions if preparation stays queued. For immediate processing, manually
dispatch the workflow or run the trusted local worker below.

### Local worker and checks

Run `npm run lessons:check` first. This checks dedicated lesson configuration and
FFmpeg's required encoders/filters without claiming tasks or changing remote data.
It reports missing call-provider/reviewer settings without printing their values.
The worker performs the same check before touching the queue, so a missing FFmpeg
installation cannot turn queued lessons into failed exports. Passing this local
check does not verify remote credentials, Auth redirects, or a real recording.

Use `npm run lessons:worker` to process the queue. To run the local regression suite,
use `FFMPEG_PATH=/path/to/ffmpeg npm run lessons:test` (or omit FFMPEG_PATH when
FFmpeg is on PATH). The suite uses synthetic media and a fake HTTP storage service;
it does not publish lessons or prove live provider connectivity.

Install FFmpeg with libx264, AAC, drawbox and drawtext support on the rendering laptop. This workspace has a tested binary at `/tmp/boomer-ffmpeg-runtime/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1`; that temporary installation is not a portable deployment dependency. For a team laptop, install FFmpeg on PATH or set FFMPEG_PATH to its permanent location.

```
node scripts/lessons/run.cjs          # polls until interrupted
node scripts/lessons/run.cjs --once   # claim at most one eligible task
```

The worker reads `.env` and `.env.local` without printing secrets. It needs the same dedicated project configuration as Vercel. It is an explicit trusted process; nothing runs secretly on user devices. If the worker is offline, drafts stay queued. Missing-media tasks wait thirty seconds between checks and stop automatic attempts after twenty retries; new completion/upload/call events or explicit Retry preparation can wake the pipeline. Restarted workers can reclaim expired leases. Failed tasks require the editor's Retry preparation / Queue render action; a live lease is never stolen by a retry button.

## End-to-end workflow

### Upload an original recording (no ElevenLabs required)

The editor does not require a voice provider. In `/lessons/workspace`, sign in and
open **Create a lesson from an existing job recording**. Enter a job linked to your
worker account and give private-preparation consent. In the draft, expand
**Import a recording without a phone-call provider** and supply:

- An original MP4 or WebM containing both video and its original recorded audio,
  no longer than 15 minutes, with readable duration metadata.
- The actual recording start date/time (local time in the form).
- Its WebVTT or SRT transcript, with speech times relative to recording start.
  Existing JSON transcript arrays (`role`, `text`, `start`, `end`) are also accepted.

Upload goes directly to private storage in 20 MiB parts; retries in the open page
reuse verified parts. The original local file is never deleted. After a reload,
re-importing creates a new recording session rather than guessing file identity.
The server accepts evidence only from the linked worker, validates transcript
bounds and preserves an immutable original transcript. Use caption edits to fix
wording later. The trusted worker extracts the original soundtrack using FFmpeg;
an upload with no audio fails explicitly rather than synthesizing replacement
speech. No ElevenLabs API key or webhook is used on this path.

Run `npm run lessons:worker`, then refresh the editor. Completed-job timestamps
produce initial clips when they align with the recording. If they do not align,
select intervals with **Add clip**; no step timestamps are invented. Gemini may
refine a valid proposal when configured; manual editing and rendering work without
Gemini. Finish editing, confirm synchronization, render, inspect the full export,
then obtain the existing electrician review and separate publishing consent.
The supported publication template remains the inert GFCI demonstration.

Verified in this implementation pass: production build; local API/subtitle/export
regressions; and the opt-in live private-storage suite in the dedicated Boomer
project. The live suite uploaded explicitly synthetic video with its original tone
track, removed the ElevenLabs key, and verified private preview generation,
soundtrack extraction and preparation of an editable draft. It also verified real
FFmpeg rendering, task persistence and blocked anonymous reads. All test-owned
users, rows and remote media were cleaned up; nothing was publicly published.

Dedicated Supabase storage/auth and a running FFmpeg worker are still required.
ElevenLabs settings are only needed for automatic import from Boomer phone calls.
This feature does not transcribe uncaptioned uploads automatically: provide an
original timestamped transcript. It also does not bypass the worker-account
binding or real-review requirements.

### Automatic capture from a Boomer call

1. Visit `/lessons/workspace`; sign in. Reviewer binds the worker account.
2. On the harness camera page, start the existing camera; open the optional lesson controls, confirm the job location using the reused LocationPicker, then opt in to lesson recording before the call. Use the two-device fallback if a phone call suspends camera/recording. Capture remains optional and failures never stop still-frame guidance.
3. Run the actual inert job. Complete both spoken hard gates. Keep the prop disconnected. A simulated test is never described as a real electrical test.
4. Stop capture or finish the job. Upload verifies all chunks, preserves interrupted source metadata and queues preparation. The job must be done, video finalized, and original call audio/timed transcript available. Calls may arrive before or after completion; events queue preparation independently.
5. Start the worker. Open the draft, inspect source previews and original audio, verify synchronization, trim/reorder clips and adjust part boxes on readable freeze frames. Approximate clocks are suggestions only; a reviewer must check sync. Review corrections in context rather than guessing a mistake timestamp from aggregate failure counts.
6. Resolve editorial notes by inspecting footage. Save a revision, queue rendering, and preview the full export. Caption edits change the edited lesson only, not the original transcript. A changed revision requires a fresh render and fresh approvals.
7. Worker gives separate public-publishing permission; an allowlisted reviewer records the named electrician's review and stated credential/role. Credential identity is self-reported, not independently verified or inferred from email. Publish only the reviewed revision. Withdraw at any time to remove public listing and block new media requests.

## Actual verification performed

- `node tests/lessons/verify.cjs`: publication/evidence gates, owner isolation, revision invalidation, correction ordering, false regional claims, caption edits and freeze-frame timing, missing sources, unconfigured/authenticated API behavior.
- `node tests/lessons/api.cjs`: actual Supabase SDK against an isolated fake HTTP service. Exercises verified-auth lookup, reviewer allowlist, private owner isolation, idempotent creation, stale edits, consent/review/publication, minimal public projections, withdrawal, optimistic retries, duplicate queue creation, concurrent claims and expired-lease recovery. This is not a live Supabase/RLS test.
- `FFMPEG_PATH=/path/to/ffmpeg node tests/lessons/render.cjs`: actual synthetic portrait video/audio rendered through the real pipeline. Verified output duration, audio-bearing MP4, two-second freeze, burned part annotation/notice, poster and VTT. The exported frame was visually inspected. Synthetic fixtures are labeled and never published as real jobs. The explicit live suite uploads private fixtures only and removes them afterward.
- Optional UI suite: set `REACT_TEST_RENDERER` to an isolated react-test-renderer@18.3.1 installation and `FAKE_INDEXEDDB` to an isolated fake-indexeddb installation, then run `node tests/lessons/recorder.cjs`. Tests format negotiation, cloned video-only capture, chunk persistence, camera independence, failed upload retention and successful retry. Test-only packages were installed outside the repo; shared package.json/lockfile are untouched.
- `LESSON_LIVE_TESTS=true LESSON_TEST_PROJECT_REF=xhxckolfwfpvqmwltpis FFMPEG_PATH=/path/to/ffmpeg node tests/lessons/live.cjs`: passed against the dedicated project. Verifies real authenticated private APIs, denied anonymous table/object reads, signed direct uploads/downloads, durable writes, a scoped worker claim, real source assembly/rendering and private artifact storage. Temporary fixtures are explicitly blocked from publication and cleaned up. Never run against an unrelated project.
- Existing location suite and full mock guided-call flow must continue passing. `npm run check` runs typecheck and production build. Existing `npm run lint` still starts a configuration wizard because the shared scaffold has no ESLint setup.

Remaining acceptance requires reviewer allowlist and Auth redirect/email delivery configuration, a real signed call and camera recording on the team phones, actual AI/provider API calls, a real electrician review and consent, and playback of the approved lesson on Vercel. Database/private-storage setup and the live private synthetic pipeline have been verified; email delivery and real-device capture have not. No claim that these external steps occurred is made.

## Coordination / integration diff

All lesson logic is under new modules and routes. Existing integrations are limited to one home-page link, the optional recorder component on Andy's camera page, Zohaib's post-call transcript hook, and his post-record completion hook. Existing function signatures, shared types, route contracts, dependencies, and configuration files are preserved. These integration points are identified for review alongside the active AI and backend branches; neither teammate branch was overwritten or merged into this feature.

## Lesson UI

The lesson library, private workspace, editor and public viewer follow the existing steel/ink design tokens. The library uses actual published posters only and an explicit empty state. The viewer has current-chapter navigation and playback error handling; the editor has links to clips, editorial checks and review. Library and signed-out workspace were visually checked locally, including a 390px layout/overflow check. Authenticated editor and published-video visual acceptance still require a real session and the configured login flow.
