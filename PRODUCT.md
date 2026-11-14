# Product

<!-- impeccable:product-schema 1 -->

## Platform

web (mobile web on the harness phone and for records; one laptop screen for the live job view)

## Stack

Next.js 14 app router + TypeScript, deployed on Vercel (HTTPS is required for the camera). Team decision, see README and CONTRIBUTING.md.

## Users and jobs

- **Electrician on the job** (new out of trade school, or a journeyman working outside their home state). Phone in a chest harness, hands and eyes on the work. They never tap mid-job; they talk to Boomer on a phone call.
- **Whoever watches the live job view** (a supervisor or instructor in real use; the judges at the demo table). Reads it from about 2 m away.
- **The next employer**, who opens a forwarded work record on their phone.

## What it does

Boomer sees what the worker's camera sees, talks them through a job one step at a time, checks each step from a fresh frame, and calls out steps that differ from the worker's home state. Every finished job becomes a record the worker owns, texted by iMessage.

## Constraints and vocabulary

- Safety line, everywhere: "Boomer guides and checks what the camera can see; the electrician tests, decides and stays responsible."
- Check results are only "looks right", "not yet", "can't tell from here", "worker confirmed".
- Records are "Observed by Boomer", never "certified".
- Never use "safe", "compliant", "code-approved" or "passed" for anything the AI produces (`lib/copy.ts`).
- No rule is shown as fact unless it is verified and has a source link.
- Demo props are inert; no live wiring.

## Brand commitments

The "Labeled panel" look already in `app/globals.css` and `components/screens/`:
- dark steel ground
- label-maker tape as the one signature (yellow = New here, white = record)
- green for done, red for not yet
- Atkinson Hyperlegible
