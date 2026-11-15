# Standard-zoom visual check

Chrome was used at normal scale (deviceScaleFactor 1; verified DPR 1 and exact CSS viewport dimensions). The embedded preview had been at 90% zoom, so it was not used as standard-zoom evidence.

## Changes

- Next.js `app/icon.svg` supplies the Boomer B/hardhat browser-tab icon to every route without changing shared metadata.
- The pinned hero uses the actual viewport space below the 76px header. Photograph, story panel, call to action and footer register remain visible together at 1280×720, 1366×768, 1440×900 and 1920×1080.
- The setup section is compact on laptop screens; the regional, record and lesson sections fill at least the available desktop viewport. Longer sections still scroll rather than hiding or shrinking content.

## Visual inspection

At 1440×900: homepage, demo console, profile, camera setup, live monitor (new job/no frame), job-record pending state, empty portable record, both mini-app sheets, lesson library and signed-out workspace were captured and inspected. No horizontal overflow.

At 1280×720: the same product routes were captured; profile/camera fixed actions remain visible, forms can scroll, and the live monitor frame fits vertically. The signed-out private editor correctly requests sign-in. No horizontal overflow was detected. Six pitch anchors were additionally inspected at 1366×768; hero fit was checked at all four desktop sizes above.

The profile, work record and mini apps intentionally retain centered phone-sized content. A long form or record does not need to fit all its content onto one screen. The first screen must be readable and remaining content accessible by scrolling.

## Limits

No real camera capture, provider call, authenticated populated lesson editor or published lesson playback was performed in this sizing pass. No approved lesson exists for checking the actual published viewer; its existing responsive styles are unchanged. Test-fixture content was not published as real work. Production Vercel must still deploy this commit before the favicon and sizing changes appear there.
