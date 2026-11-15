<!-- OWNER: Zohaib -->
# Gate report

```
npm run risk
```

Two questions about the step engine, answered for the demo job (about a second to run, no model calls):

**1. Can a call get past a gate?** `paths.ts` walks every state a guided call can reach, through the real engine
functions, using the moves the voice tools allow. It checks six rules on every state and every move (step order,
hard gates only by logged spoken confirmation, seen-only steps only by camera, "not yet" / "can't tell" never
advance, voice confirmation of a camera step only after repeated "can't tell", done only when every step is
finished). A planted "skip this step" move confirms the rules do catch a broken engine. The script exits 1 if a
rule breaks, so it can gate a merge.

The moves mirror the guards in `app/api/voice/*`. If a route's guard changes, change `movesFrom()` to match.

**2. What is each step worth?** `simulate.ts` runs a Monte Carlo over `model.ts`: for each run it draws every
uncertain input from its range, then compares the job as designed with the same job where one step is skipped,
taken on the worker's word, or seen on camera.

## Read the numbers as comparisons

Every range in `model.ts` marked `assumption` is a team estimate. Nobody publishes per-task figures such as how
often the wrong breaker is switched off. The one measured input is the camera check's false-pass rate, read from
`eval/results` when it exists. So:

- Say "skipping the tester step multiplies the modelled risk by about 4 to 8". That ordering held in 99% of runs.
- Don't say "Boomer prevents N injuries". The model can't support it.
- Replace a range with a sourced one whenever you find a source, and put the link in `basis`.

## Adding a job type

Write a model for it in `model.ts` (hazards, and the steps that stand in front of each) and register it in
`MODELS`. A job type with no model gets the path check only.

## What the supervisor sees

The iMessage job sheet (`app/m`) uses the simulation to tell a supervisor where to look (`watch.ts`):

- **HIGH RISK** tape on the steps that matter most if skipped. For the GFCI swap that is breaker off and tester dead.
- A **LOOK** strip under the title, only when things line up on a step that matters: the camera has said "not yet",
  the worker is new to the step, or a camera step was taken on the worker's word. It clears when the step is redone
  and seen. An experienced worker doing the step cleanly raises nothing, and nothing is texted or called.

"New to the step" uses the worker's skill estimate when it exists (PR #16) and their experience level until then.
The sheet shows levels only, never the simulation's numbers. `npx tsx --tsconfig tsconfig.json lib/risk/watch.sim.ts`
checks the flags on the demo job.
