<!-- OWNER: Zohaib -->
# iMessage mini apps

Boomer's job sheet and work record open **inside iMessage** as mini apps.

**Two numbers:** voice is on Photon 2.0 (`PHOTON_NUMBER`, SIP to ElevenLabs). **All iMessage** (record texts,
replies, sign-up, supervisor alerts and the mini app cards) is on **Photon 1.0** (Stable, `spectrum-ts`,
`PHOTON_STABLE_NUMBER`), so cards and texts arrive in the same thread. 2.0 can only send text and images over
iMessage, which is why messaging moved. One number for all three needs Photon 1.0's paid Business plan
(dedicated line + Photon Call).

Inbound texts arrive at `/api/webhooks/spectrum` (signed, `PHOTON_STABLE_WEBHOOK_SECRET`) and go through
`lib/agents/inbox.ts`, the same router the old 2.0 webhook uses. `sendText` (lib/photon/send.ts) sends on 1.0 and
falls back to 2.0. Set `PHOTON_TEXT_VIA=beta` to put texts back on 2.0.

## What the worker (and whoever they share with) sees

| Card | Page it opens | When it's sent |
|---|---|---|
| **Job sheet** (live) | `/m/job/<jobId>` | Worker texts "job sheet" / "live card"; the supervisor gets one when the worker says "tell my supervisor …"; the worker gets the finished sheet when the job closes |
| **Work record** | `/m/record/<workerId>` | Worker texts "send me my record card", or "send my record to <number>" |

The job sheet is a **live** card. Every time a voice tool moves a step, the card already in the thread is edited
in place (`refreshJobCards` in `lib/voice/tool.ts`), and the open page polls the job every 3 s.

### Design: a panel schedule, not an app

Electricians already read panel schedules, circuit directories and drawing title blocks every day, so the sheet
borrows those instead of app chrome:

- **Title block** (Site · Code · Electrician · Date) like the corner of a drawing.
- **One row per step**, numbered like circuits, in a ruled grid. Tap a row for the reason, the NEC section and
  the source link.
- **Result codes**, short and all caps: `SEEN` (camera), `SAID` (worker confirmed out loud), `FIXED`
  (not yet, then seen), `NOW`, `NOT YET`. A legend sits at the bottom, like a panel legend.
- **Slots** across the top, one per step, like breaker handles: filled = done, yellow = now.
- **Yellow label-maker tape** for `NEW HERE` steps, the same token the rest of the app uses.
- The work record reads like a spreadsheet: a key-numbers row (Jobs, States, Seen on cam, Fixed), one row per job
  and a **Total** row.
- Light by default (iMessage), follows the phone's dark mode. Uses `.surface-card` from `app/globals.css`.

## How it's wired

| File | Job |
|---|---|
| `app/m/job/[id]/page.tsx`, `app/m/_ui/JobSheet.tsx` | Job sheet (server render, then live polling) |
| `app/m/record/[workerId]/page.tsx` | Work record sheet |
| `app/m/mini.module.css` | The sheet styles |
| `lib/record/sheet.ts` | Job → rows, result codes, the one-line progress used in captions |
| `lib/photon/stable.ts` | Photon 1.0 client: `sendMiniApp`, `updateMiniApp` (edit in place), `sendStableText` |
| `lib/photon/miniapp.ts` | `sendJobCard`, `sendRecordCard`, `refreshJobCards`, with fallbacks |
| `app/api/og/job/[id]` | Card image: live progress for open jobs, the record once closed |

The card's caption lines come from the page's Open Graph tags (`generateMetadata`), so they always match the
sheet. The card URL carries `?v=<status>-<step>` so iMessage re-reads the caption on each edit.

**Fallbacks.** If Photon 1.0 isn't set up, or a send fails, the same `/m/...` link goes out over Photon 2.0 and
unfurls into a preview card. If that fails too (2.0's shared line can't start a chat), the worker gets the card
to forward. Nothing in the core flow waits on Photon 1.0: the record text at job close goes out first, as before.

**Starting chats:** only Photon 1.0 Business (dedicated line) can start a new conversation ("cold outreach", 50 a
day). On the free shared line, a supervisor or employer has to text Boomer once first; until then the worker gets
the card to forward.

## Setup (Photon 1.0)

1. Sign in to the **Stable** dashboard (app.photon.codes, not `app.beta.photon.codes`). Create a project, add
   each phone that will text Boomer under **Users** (10 on Free), and copy the **project ID** and **project secret**
   from Settings. The iMessage number is on the Platforms page.
   Then **Webhooks → Add webhook** → `https://<app>/api/webhooks/spectrum`, and save the signing secret
   (shown once) as `PHOTON_STABLE_WEBHOOK_SECRET`.
2. Add them to `.env` / `.env.local` (and Vercel):
   ```
   PHOTON_STABLE_PROJECT_ID=...
   PHOTON_STABLE_PROJECT_SECRET=...
   ```
3. Check: `npm run miniapp-test -- +1<your phone>`. It sends the demo job sheet as a card. The first tap on the
   phone offers to install Photon's **Spectrum** iMessage app (one time).
4. Restart `npm run dev`. Text Boomer "job sheet" to get the live card.

`NEXT_PUBLIC_APP_URL` has to be reachable from the phone (the tunnel, or Vercel once it's deployed with this code).

## Limits and caveats

- Only people added under **Users** can text the shared 1.0 number, and a free shared line can't start chats
  ("cold outreach" is a Business feature), so a supervisor or employer must text Boomer once first.
- The recipient installs the Spectrum app once. Without it they still see the static card and can open the link.
- "Edit in place" keeps the sent card in server memory. After a restart, the next update sends a new card.
- Serverless (Vercel) functions don't keep the Photon 1.0 connection between requests: sends work, but in-place
  edits will mostly fall back to new cards there. A long-running server keeps them.
- Quotas on Stable: 5,000 messages per day per server, 50 new conversations per line per day.

## Questions for the Photon rep

1. Does a Stable shared-pool line support `app()` cards, or only dedicated lines?
2. Can a project hold both a beta (2.0) and a Stable (1.0) line on the same number, so cards come from Boomer's
   usual sender?
3. Can a sent card be edited from a different process (by message id), so live updates work on serverless?
