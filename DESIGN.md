---
name: Boomer
description: A job read like the circuit directory in a breaker door, on dark steel with label-maker tape.
colors:
  steel: "#2e353d"
  steel-raised: "#3a424b"
  rule: "#5a646f"
  field-border: "#8f99a4"
  ink: "#f4f2ec"
  ink-2: "#bac1c8"
  on-tape: "#141414"
  tape-yellow: "#ffd400"
  tape-white: "#f4f2ec"
  ground-green: "#3dbe6b"
  hot-red: "#ff8073"
typography:
  display:
    fontFamily: "Atkinson Hyperlegible, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(30px, 2.9vw, 44px)"
    fontWeight: 700
    lineHeight: 1.2
  hud-number:
    fontFamily: "Atkinson Hyperlegible, system-ui, -apple-system, sans-serif"
    fontSize: "56px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.01em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Atkinson Hyperlegible, system-ui, -apple-system, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.15
  title:
    fontFamily: "Atkinson Hyperlegible, system-ui, -apple-system, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.15
  step:
    fontFamily: "Atkinson Hyperlegible, system-ui, -apple-system, sans-serif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.3
  body:
    fontFamily: "Atkinson Hyperlegible, system-ui, -apple-system, sans-serif"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Atkinson Hyperlegible, system-ui, -apple-system, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.25
rounded:
  tape: "3px"
  thumb: "6px"
  field: "12px"
  button: "14px"
spacing:
  gutter: "16px"
  section: "28px"
  tap: "48px"
  tap-primary: "64px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.steel}"
    typography: "{typography.body}"
    rounded: "{rounded.button}"
    padding: "12px 20px"
    height: "64px"
  button-primary-disabled:
    backgroundColor: "{colors.steel-raised}"
    textColor: "{colors.ink-2}"
  button-quiet:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "8px 12px"
    height: "48px"
  tape-new-here:
    backgroundColor: "{colors.tape-yellow}"
    textColor: "{colors.on-tape}"
    rounded: "{rounded.tape}"
    padding: "0.22em 0.75em"
  tape-record:
    backgroundColor: "{colors.tape-white}"
    textColor: "{colors.on-tape}"
    rounded: "{rounded.tape}"
    padding: "0.22em 0.75em"
  input:
    backgroundColor: "{colors.steel-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "12px 14px"
    height: "56px"
  banner:
    backgroundColor: "{colors.steel-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "10px 14px"
  step-row-current:
    backgroundColor: "{colors.steel-raised}"
    padding: "12px"
---

# Design System: Boomer

## Overview

**Creative North Star: "The Labeled Panel"**

A job reads like the circuit directory card inside a breaker door: numbered, ruled rows on dark steel, one status mark per step, nothing decorative. Everything is read at a glance by someone whose hands are busy: a phone in a chest harness, a laptop read from about 2 m, a record opened on an employer's phone. Type is big, flat and high-contrast, and structure comes from hairline rules, never from boxes.

The only signature is label-maker tape. Yellow tape says "New here" (a step that differs from the worker's home state). White tape is the printed "Observed by Boomer" stamp on a record, and it feeds out as it prints. Green and red mean one thing each and appear only as status. The frame Boomer used for a check develops into its row, and corrections stay visible ("Corrected after 1 not yet") instead of being erased.

**Key Characteristics:**
- Dark steel ground, off-white ink, 1px hairline rules between rows.
- Label-maker tape is the one signature; two tones, two meanings.
- One status mark per step: filled dot, hollow dot or red dot, with words beside it.
- Tabular numerals for step numbers, counts and times.
- Single family (Atkinson Hyperlegible), 400 and 700 only.
- Flat; depth is one tonal step (steel to steel-raised).

## Colors

A near-monochrome steel panel with two tape colors and two status colors, each holding exactly one job.

### Primary
- **Label Yellow** (tape-yellow): "New here" tape, the focus ring, the text caret, text selection and the profile radio accent. Nothing else.
- **Record White** (tape-white): the "Observed by Boomer" stamp on job and work records. Same value as ink on dark, but always reads as tape (dark text on a light strip), never as text color.

### Secondary
- **Ground Green** (ground-green): looks right / done. Filled dot = seen on camera; hollow green ring = worker confirmed, not seen. Also the "Looks right" lead-in on Boomer's last line.
- **Hot Red** (hot-red): not yet, errors, "Corrected after N not yet", a stale camera frame (red pill with on-tape text) and the "Not yet" lead-in.

### Neutral
- **Panel Steel** (steel): page ground, HUD bars, action bar, sheet.
- **Raised Steel** (steel-raised): one step up, for the current step row, fields, banners, the plan compare strip and the no-frame placeholder.
- **Hairline** (rule): row rules, bar borders, empty thumbnail outline, flow-step track, scrollbar.
- **Field Edge** (field-border): 1px border on inputs and choice rows.
- **Ink** (ink): primary text and the primary button fill.
- **Second Ink** (ink-2): secondary text, metadata, pending steps, link underlines.
- **Tape Black** (on-tape): text on yellow tape, white tape and the red frame-age pill.

### Named Rules
**The One Job Rule.** Each accent means one thing. Yellow is never a highlight, green is never a brand color, red is never emphasis.

**The Mark-Plus-Words Rule.** Status color never travels alone: every mark carries its words ("Looks right, seen on camera", "Worker confirmed, not seen", "Not yet").

## Typography

**Display Font:** Atkinson Hyperlegible (with system-ui, -apple-system, sans-serif)
**Body Font:** Atkinson Hyperlegible

**Character:** One hyperlegible family that keeps 1/l/I and 0/O distinct, so NEC sections like 210.52(C)(3) survive a 2 m read. Weight does all the hierarchy work: 400 for running text, 700 for everything that must be found.

### Hierarchy
- **Display** (700, clamp(30px, 2.9vw, 44px), 1.2): Boomer's last spoken line on the live job view, max 30ch. Always the largest text on that page.
- **HUD number** (700, 56px, 1, tabular): the current step number on the harness HUD.
- **Headline** (700, 32px, 1.15, balanced): page h1.
- **Title** (700, 24px, 1.15): h2, sheet titles, notice titles, quiet states.
- **Step** (400, 22px, 1.3): step text and step numbers (numbers at 700), record summaries, list item names.
- **Body** (400, 20px, 1.4): running text and buttons, max 65ch. Fields stay at 20px so iOS never zooms.
- **Label** (700, 17px): status marks, job bar, flow steps, metadata (metadata at 400 in ink-2).

### Named Rules
**The Loudest Voice Rule.** On the live view, what Boomer last said outranks the title and every row.

**The Tabular Rule.** Any number a reader compares (step numbers, counts, minutes, times) is tabular; times never break across lines.

## Layout

Phone screens are a single 480px column centered with a 16px gutter, bottom padding reserved for a fixed thumb-zone action bar. Lists are full-width ruled stacks: a top rule on the list, a bottom rule on each row, about 16px vertical padding. Step rows are a three-column grid: a right-aligned number column (2.2ch), the text, and a 76px portrait (3:4) frame slot. Sections separate by 28px; secondary blocks by 20 to 24px.

The live job view widens to 1480px: the portrait camera frame sized by viewport height on the left, the last line and a scrolling step list on the right, sharing one height so the page never scrolls. Below 900px it stacks to one column. The harness camera is a full-screen grid of HUD, video and footer bars, with nothing to tap once the job starts.

## Elevation & Depth

Flat. Depth is one tonal step from steel to steel-raised and 1px hairlines. Inset 1px outlines (box-shadow inset) draw the empty thumbnail slot, the white tape edge, the hollow camera dot and the chosen choice row; they are lines, not lift. The modal sheet uses a 50% black scrim.

### Shadow Vocabulary
- **Over-photo pill** (`box-shadow: 0 2px 8px rgb(0 0 0 / 0.35)`): only the frame-age pill sitting on the camera image, for legibility over a photo.

### Named Rules
**The Rule-Not-Box Rule.** Structure is drawn with hairlines. A raised fill marks one thing (the current row, a field, a notice), never a layout section.

## Shapes

Square-shouldered and small-cornered. Tape has barely-rounded 3px ends, like cut label stock. Frame thumbnails round at 6px, fields, banners and icon buttons at 12px, primary buttons and the live camera frame at 14px. Status marks are 14px circles, filled or 2px rings. The only full pill is the frame-age chip.

## Components

### Buttons
- **Shape:** gently rounded (14px), full width, 64px tall.
- **Primary:** ink fill, steel text, 700 at body size. Lives in the fixed action bar at the bottom of phone screens, with an optional ink-2 note above it.
- **Press / Focus:** 1px downward nudge (80ms ease-out); 3px yellow focus outline offset 3px.
- **Disabled:** raised steel fill, ink-2 text.
- **Quiet:** text-only, underlined in ink-2, still a 48px target.

### Inputs / Fields
- **Style:** raised steel fill, 1px field-border edge, 12px radius, 56px min height (textarea 120px), ink-2 placeholder.
- **Choice rows:** the same field treatment around a 24px radio with yellow accent; checked rows take an ink border plus inset ink line.

### Tape (signature)
- **New here:** yellow tape inline before step text, 700, dark text, 3px radius, never wraps.
- **Observed by Boomer:** white tape under the record title; prints in with a 720ms stepped left-to-right feed (none under reduced motion). The only tape that animates.

### Step Row (signature)
- Ruled row: tabular number, step text with optional New here tape, then one status line: mark and words, a red "Corrected after N not yet" when fixed after failures, and the NEC section linked only when its rule is verified ("rule not checked yet" otherwise).
- The current row takes raised steel (240ms ease) and a hollow ink "Now" ring; steps ahead dim to ink-2.
- The check's frame develops into the 76px slot (520ms, from bright and desaturated, slight scale-down). Spoken checks get no empty slot. On records the photo moves under the text at up to 360px.

### Status Mark
Filled green = seen on camera; hollow green = worker confirmed, not seen; hollow ink = now; red = not yet; muted grey at 400 for quiet states. Always 14px plus words at label size.

### Flow Steps
Five-segment track (New, Looking, Plan ready, Guiding, Done): 4px top rule per segment, done in ink-2, current in ink and bold. Shown before guiding; the step list takes over once guiding starts.

### Banner and Sheet
- **Banner:** raised steel strip, 12px radius, label size; errors switch the text to hot-red and announce as alerts.
- **Sheet:** full-height dialog on steel with a ruled header (title plus 48px close button) for anything that needs the keyboard.

## Do's and Don'ts

### Do:
- **Do** separate rows with 1px rule hairlines and number them in a right-aligned tabular column.
- **Do** keep each accent to its single job: yellow = New here and focus, white tape = Observed by Boomer, green = looks right/done, red = not yet/errors.
- **Do** distinguish seen from worker-confirmed with a filled versus hollow green dot, always with words.
- **Do** keep corrections visible in the row ("Corrected after 1 not yet").
- **Do** make Boomer's last line the largest text on the live view.
- **Do** put the primary action in the fixed bottom action bar at 64px; keep every target at least 48px.

### Don't:
- **Don't** use cards or raised panels as layout structure; rules carry structure.
- **Don't** put a kicker or eyebrow label above headings.
- **Don't** use gradients, glass or blur, or drop shadows outside the over-photo pill.
- **Don't** add a second progress device beside the step list.
- **Don't** add a third tape color or use tape as decoration.
- **Don't** label AI output as safe, compliant, code-approved, passed or certified, on tape or anywhere else.
