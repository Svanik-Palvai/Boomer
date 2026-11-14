# Boomer

Snap a photo of an electrical job in an unfamiliar town. Boomer works out the location, the adopted code, what differs from home, and permit and license notes, then builds a job plan. A local electrician confirms the plan and the manager approves it with one tap on an iMessage mini app card. While working, the electrician can call Boomer hands-free, and every agent remembers what was said in calls and texts. An AR guide walks the worker through only the steps that are new to them.

Built at HackPrinceton, Nov 13–15, 2026, on Photon (iMessage mini apps, voice, messaging).

## Run it

```
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
npm run dev
```

Open http://localhost:3000. With `USE_MOCKS=true` every lane returns demo data, so the full flow clicks through before anything is wired up.

Fake an iMessage reply locally (PowerShell):

```
Invoke-RestMethod -Method Post -Uri localhost:3000/api/webhooks/photon -ContentType "application/json" -Body '{"stage":"manager","text":"yes"}'
```

Other useful endpoints:

- `POST /api/cases/demo-2041/reset`: reset the demo case
- `GET /api/voice/context?caseId=demo-2041`: what the voice agent sees (plan + shared memory)
- `/mini/review/demo-2041` and `/mini/approve/demo-2041`: the two mini app cards

## What's pre-loaded for the demo

- Code rules, permit, inspection and license data for Princeton, NJ and Philadelphia, PA (`data/`), each hand-checked with a source link.
- AR overlay positions (`data/arSteps.json`), drawn at fixed screen spots with the phone on a stand.

Live: photo identification, GPS, Photon messaging, mini app cards, voice calls, shared memory, reply parsing, plan updates.

Boomer never marks work as compliant. A licensed local electrician confirms the plan and a manager approves it.

## Team

See `CONTRIBUTING.md` for lanes, branches and rules.
