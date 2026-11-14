<!-- OWNER: Zohaib -->
# Mini apps: what we do and why

## What Photon "mini apps" are

A Photon mini app is an **iMessage App card**: a tappable bubble for a URL that opens inside Photon's
own Apple-approved iMessage app ("Spectrum Mini App"), so a business doesn't need its own iMessage extension.
The recipient downloads that app once, the first time. A "live" card shows the extension's live UI right in
the chat and can be edited in place later. Without the extension, the recipient gets a static preview or a link.

- Sent with `app(url, { live })` or `customizedMiniApp({...})` from the **spectrum-ts** SDK (`@spectrum-ts/imessage`),
  which is the **Stable (v1)** platform.
  Docs: https://photon.codes/docs/spectrum-ts/content/app.md and
  https://photon.codes/docs/spectrum-ts/providers/imessage/messaging-features/apps.md.
  Launch post: https://photon.codes/blog/you-can-now-send-live-mini-app-cards-in-imessage
- **Not on the 2.0 beta**, which is what we use (`app.beta.photon.codes`, `@photon-ai/api` 0.6.0). The beta page
  (https://photon.codes/docs/beta/photon.md) says iMessage on Beta "supports only text and images".
  The client agrees: `ImessageMessageContent` is `text | attachment | message.read | typing | group`, and there's
  no card, app, rich-link or preview type. Polls, reactions and voice exist in `SendContent`, but not for iMessage.
- Shared iMessage line (ours): sends only in direct chats, and only to someone who has texted the line since
  they were assigned (`SHARED_LINE_INBOUND_REQUIRED`). The worker texts first in the demo, so a reply works.
  Older posts list mini-app support under the paid Business tier (dedicated lines). We haven't confirmed that.

## Options

| | What | Cost | Demo in a live call | Lands on the record link |
|---|---|---|---|---|
| A | Real Photon mini app card for the record | Move the send to spectrum-ts on Stable, likely a dedicated line, and the worker installs the Spectrum app | Risky: second platform, install prompt on stage | Yes |
| B | Card or rich content type through beta `sendMessage` | Not possible: beta iMessage has no card type. The closest is an image attachment (multipart upload, then send) | OK | Only as an image next to the link |
| C | iMessage link preview: Open Graph tags plus a card image on the record pages | About 1 hour. Additive and server-only | Yes: the text we already send unfurls into a card | Yes, it *is* the link |
| D | Skip | 0 | n/a | n/a |

## Pick: C, link preview cards

It's cheap, it doesn't change the send path (the 10-second record text and the `boomer-record:<entryId>`
dedupe key are untouched), and it works on the beta shared line today. The link we already text now unfurls into a
card with the job title, town and code edition, "N of M steps done · K seen on camera · J corrected" and
"Observed by Boomer". For judges, we say: "Photon mini app cards are on Stable. On the 2.0 beta we get the same
'card in the thread' with a link preview, and the record page is the mini app." If the Photon rep confirms that
beta can send app cards, or that our project can use Stable, A is the upgrade, and the URL is the same record page.

Built:
- `lib/record/preview.tsx`: metadata and the 1200x630 card image (`next/og`).
- `app/job/[id]/record/layout.tsx` and `app/record/[workerId]/layout.tsx`: `generateMetadata` only. Andy's
  `page.tsx` files are client components, so the metadata goes in a sibling layout and the pages aren't touched.
- `app/api/og/job/[id]` and `app/api/og/record/[workerId]`: the card PNGs. These are API routes, not
  `opengraph-image.tsx` files, because Next points file-based images at `localhost` in dev, so iMessage
  couldn't fetch them through the tunnel.

Caveats: the preview only renders if the page and image can be reached at `NEXT_PUBLIC_APP_URL` (the tunnel). iOS
may show "Tap to load preview" for a sender who isn't in the worker's contacts, so save the Boomer number as a
contact on the demo phone.

## Questions for the Photon rep
1. Will beta (`@photon-ai/api`) get iMessage app cards (`app()` / mini app) as a content type? When?
2. Can a beta project send a Stable mini app card from a **shared** line, or do mini apps need a dedicated line or plan?
3. When the beta sends a text that contains a URL, does Photon's sender generate the iMessage rich-link payload,
   or does it arrive as a plain link that the recipient's phone previews (or shows as "Tap to load preview")?
4. Is an image attachment, or a `group` of text plus image, on a shared line within the same "texted first" rule?
