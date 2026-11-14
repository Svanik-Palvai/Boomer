# How we work

Four lanes, one owner each, all building at once. Every file belongs to exactly one lane or is **shared**.
Edit only your lane's files. If you need something from another lane, ask in chat; don't edit their file.
That rule is what keeps merges conflict-free.

## Lanes and the files each person owns

| Lane | Branch | Owns |
| --- | --- | --- |
| **Andy**: app screens | `andy/screens` | `app/page.tsx`, `app/profile/`, `app/camera/`, `app/job/[id]/page.tsx`, `app/job/[id]/record/`, `app/record/`, `components/screens/`, `components/camera/`, `components/hooks/` |
| **Zohaib**: Photon + backend + voice number | `zohaib/backend` | `lib/db/`, `lib/jobs/`, `lib/record/`, `lib/photon/`, `lib/voice/`, `app/api/workers/`, `app/api/jobs/`, `app/api/frames/`, `app/api/records/`, `app/api/demo/`, `app/api/stats/`, `app/api/webhooks/` |
| **Sunny**: AI + voice agent | `sunny/ai` | `lib/ai/`, `lib/agent/`, `lib/memory/`, `app/api/voice/` |
| **Aniketh**: harness + location + data | `aniketh/data` | `data/`, `lib/location/`, `components/location/`, `app/api/jurisdiction/`, `app/api/gaps/` |

Every file starts with an `// OWNER:` line. If it says `SHARED`, see below.

## Shared files (post in chat before touching)

| File | What it is |
| --- | --- |
| `lib/types.ts` | **The contract.** Adding an optional field is fine; renaming or removing one is not. |
| `lib/config.ts` | Env flags and timing constants (frame interval, 10 s max frame age, 3 s check budget). |
| `lib/copy.ts` | Exact spoken/printed phrases ("looks right", "not yet", "can't tell from here") and banned words. |
| `lib/routes.ts` | Every page and API path. Use `pages.*` / `api.*` instead of typing URLs. |
| `lib/mock/demo.ts` | Demo worker `worker-demo` and demo job `demo-2041` everyone tests against. |
| `scripts/fake-call.mjs` | Drives a whole guided call like ElevenLabs would. |
| `package.json` + lockfile, `.env.example`, `app/layout.tsx`, `app/globals.css`, `tsconfig.json`, `next.config.mjs` | One person adds a package/env var on `main`, everyone pulls. |

## How the pieces fit

```
harness phone ──camera page──► POST /api/frames ──► lib/db (frames, newest kept)
      │                                                    ▲
      └─call─► Photon number ─SIP─► ElevenLabs agent       │ recentFrames(<10 s)
                                       │ server tools      │
                                       ▼                   │
                         /api/voice/<tool>  (Sunny) ── voiceTool() wrapper (Zohaib):
                                       │                  match caller → job, log, lastSay
                                       ├─ lib/agent/engine   step engine (pure)
                                       ├─ lib/ai/checkStep   Gemini, one yes/no per frame
                                       └─ finish/stop ──► lib/jobs/close: record entry + iMessage link
laptop ──live job view──► GET /api/jobs/[id] every 1 s + GET /api/jobs/[id]/frame
```

### Contracts between lanes (all in `lib/types.ts`)

- **Camera page → backend:** `POST /api/frames` with `FrameUpload` → `FrameAck` (job id, step n of N, `wantBurst`). The camera page doesn't need to know the job id; the backend attaches frames to the worker's open job.
- **ElevenLabs → voice tools:** every tool takes `VoiceToolRequest` (`callerPhone` from `{{system__caller_id}}`, or `jobId`) and returns `VoiceToolResponse` with one `say` line. The agent speaks `say` exactly. Tools: `get_context`, `look`, `next_step`, `repeat_step`, `explain_step`, `go_back`, `check_step`, `stop_job`, `finish_job` (`lib/agent/tools.ts`).
- **Check result:** `CheckResult { outcome: pass | fail | unclear, say }`. A step advances only on `pass` or a logged spoken confirmation. Never turn `unclear` into `pass`. Hard gates (breaker off, tester dead) are spoken checks and can't be skipped.
- **Step data:** `data/steps.json` (`JobTemplate`) + `data/rules.json` (`Rule.tagsSteps`) → `buildPlan()` → `Step[]` tagged `standard` / `new_here`. Unverified rules tag the step with `ruleVerified: false`; nothing cites an unverified rule as a source.
- **Database:** only through `@/lib/db` functions. Their signatures stay; Zohaib swaps the bodies for Supabase. `updateJob(id, fn)` with a synchronous `fn` for every write; do slow work (Gemini) before it.
- **Record:** `closeJob(job)` builds a `RecordEntry`, saves it and texts the link. Idempotent.

## Working with mocks

With `USE_MOCKS=true` (default) Gemini and Photon are mocked. The mock check fails the LINE step once (the "wires on LOAD" mistake) and passes everything else, so every lane can build against the full flow before anything real is wired.

```
npm run dev
npm run fake-call          # in a second terminal: plays a whole call, prints what Boomer says
```

Then open `/job/demo-2041` (live view) and `/job/demo-2041/record`. `POST /api/demo/reset` starts over.

## Rules

- Keep function signatures. Change the body, not the shape.
- Everything must work with `USE_MOCKS=true` so nobody is blocked.
- Pull `main` into your branch often: `git pull origin main`.
- Merge to `main` only when `npm run check` passes (typecheck + build) and your lane's "done when" test passes.
- Everyone tests against `demo-2041`.
- Never commit `.env` / `.env.local` or API keys.
- No rule is spoken or shown as fact unless `verified: true` in `data/rules.json`, with a source link.
- Never use "safe", "compliant", "code-approved", "passed" or "certified" for anything the AI produces (`lib/copy.ts`).
- Nobody signs up for a paid plan or buys credits without the team's OK.
