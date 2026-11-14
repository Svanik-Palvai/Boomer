# Boomer

Strap on your phone and call Boomer. It sees what you see, talks you through the fix one step at a time, checks each step from the camera, and saves the job to a record that follows you to the next state.

The electrician puts their phone in a chest harness with the camera page open and calls Boomer on a Photon number. The agent works out the job from the camera frames, reads one step at a time, repeats on request, and checks each step from a fresh frame before moving on. It knows which town the job is in, so it calls out the steps that differ from the worker's home state. Every finished job is saved to a work record the worker owns, and the link arrives by iMessage.

Built at HackPrinceton, Nov 13–15, 2026, on Photon (voice agent, memory, iMessage) and Gemini.

## Run it

```
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. With `USE_MOCKS=true` Gemini and Photon are mocked, so the whole flow runs before anything is wired up.

Play a full guided call against the dev server (what ElevenLabs would do):

```
npm run fake-call
```

Then open `/job/demo-2041` (live job view) and `/job/demo-2041/record` (the record).

## Screens

- `/profile`: name, phone, home state, experience (once)
- `/camera/[workerId]`: harness phone. Live camera, a still every 2 s plus a burst on "done", wake lock, step number, connection dot. Needs HTTPS (Vercel or ngrok) on a real phone.
- `/job/[id]`: live job view for the laptop facing the judge
- `/job/[id]/record`: one finished job, every step with its check photo
- `/record/[workerId]`: all jobs, totals, share link

## What's pre-loaded for the demo

- The step list for the demo job (kitchen counter receptacle → GFCI), `data/steps.json`, hand-checked.
- Code editions and rule differences for Princeton, NJ and Philadelphia, PA (`data/`), each with a source link.

Live: the call, the camera, Gemini job identification and step checks, memory across calls, GPS, the record and the iMessage text.

Boomer guides and checks what the camera can see; the electrician tests, decides and stays responsible.

## Team

See `CONTRIBUTING.md` for lanes, branches, file ownership and the contracts between lanes.
