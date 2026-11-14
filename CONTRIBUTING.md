# How we work

## Lanes and the files each person owns

| Lane | Branch | Owns |
| --- | --- | --- |
| Teammate 1: screens + mini app cards | `screens` | `app/page.tsx`, `app/job/[id]/{checks,plan,review}/`, `app/playbook/`, `app/mini/`, `components/screens/` |
| Z: Photon + backend + voice number | `backend` | `lib/photon/`, `lib/cases/`, `app/api/cases/`, `app/api/webhooks/` |
| Teammate 3: AI + agents + memory | `ai` | `lib/ai/`, `lib/agents/`, `lib/memory/`, `app/api/identify/`, `app/api/playbook/`, `app/api/voice/`, `tests/ai/` |
| Teammate 4: AR + location + checks | `ar-checks` | `app/job/[id]/guide/`, `lib/checks/`, `app/api/checks/`, `app/api/jurisdiction/`, `data/`, `components/ar/` |

Edit only files in your lane. If you need something from another lane, ask; don't edit their file.

## How the Photon pieces fit

- **Mini app cards (iMessage):** the local electrician gets `/mini/review/[id]`, the manager gets `/mini/approve/[id]`. A tap POSTs a `CardDecision` to `/api/cases/[id]/decision`. Free-text replies still work through `/api/webhooks/photon` + `parseReply()`.
- **Voice agent:** ElevenLabs agent on a Photon number (SIP). Its tools call `/api/voice/context` and `/api/voice/ask`. After a call, ElevenLabs posts to `/api/webhooks/voice`.
- **Shared memory:** every text, tap and call is written with `remember()` and read with `contextFor()` (`lib/memory/store.ts`). That is how the voice agent knows what the manager texted.

## Shared files (ask in chat before touching)

- `lib/types.ts`: the contract. Adding an optional field is fine; renaming or removing one is not.
- `lib/mock/demoCase.ts`: the demo case everyone tests against (`demo-2041`).
- `package.json` / lockfile: Photon, ElevenLabs, Gemini and Supabase SDKs are already installed. For anything else, post the package name in chat; one person adds it on `main`, everyone pulls.
- `app/layout.tsx`, `app/globals.css`, `.env.example`.

## Rules

- Keep function signatures in the stubs. Change the body, not the shape.
- Every function works with `USE_MOCKS=true` so nobody is blocked.
- Pull `main` into your branch often: `git pull origin main`.
- Merge to `main` only when `npm run build` passes.
- Never commit `.env.local` or API keys.
- No rule is shown as fact unless `verified: true` in `data/rules.json`.
- Nobody signs up for a paid plan or buys credits without the team's OK.
