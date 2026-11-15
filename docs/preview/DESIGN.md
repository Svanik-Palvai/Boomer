---
name: Boomer Preview
description: Real field footage hands off to Boomer's machine view, on graphite with one hard-hat yellow signal.
colors:
  graphite-deep: "#0a0b0b"
  graphite: "#0e1011"
  graphite-raised: "#15181a"
  graphite-lit: "#1d2124"
  hairline: "rgb(237 231 218 / 0.13)"
  hairline-strong: "rgb(237 231 218 / 0.26)"
  cream-ink: "#ede7da"
  cream-ink-2: "#b4ad9f"
  cream-ink-3: "#8f897d"
  hard-hat-yellow: "#f4c430"
  hard-hat-yellow-hot: "#ffd24a"
  on-yellow: "#15130b"
  looks-right-green: "#6fca8e"
  not-yet-red: "#ff7d6b"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(52px, 8.6vw, 136px)"
    fontWeight: 900
    lineHeight: 0.86
    letterSpacing: "-0.012em"
    fontVariation: "'wdth' 62.5"
  display-close:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(44px, 7vw, 112px)"
    fontWeight: 900
    lineHeight: 0.88
    fontVariation: "'wdth' 62.5"
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(34px, 5.2vw, 76px)"
    fontWeight: 800
    lineHeight: 0.94
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 75"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(28px, 2.9vw, 44px)"
    fontWeight: 800
    lineHeight: 0.98
    fontVariation: "'wdth' 62.5"
  figure:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(20px, 1.9vw, 28px)"
    fontWeight: 800
    lineHeight: 1
    fontVariation: "'wdth' 75"
  lede:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(17px, 1.35vw, 20px)"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.5
  body-small:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  readout:
    fontFamily: "JetBrains Mono, ui-monospace, Menlo, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  readout-micro:
    fontFamily: "JetBrains Mono, ui-monospace, Menlo, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  none: "0px"
spacing:
  gutter: "clamp(16px, 4vw, 56px)"
  section: "clamp(88px, 12vw, 160px)"
  section-head: "clamp(40px, 6vw, 80px)"
  row: "28px"
  cell: "14px"
  max-width: "1360px"
  nav-height: "64px"
components:
  button-primary:
    backgroundColor: "{colors.hard-hat-yellow}"
    textColor: "{colors.on-yellow}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0 24px"
    height: "56px"
  button-primary-hover:
    backgroundColor: "{colors.hard-hat-yellow-hot}"
    textColor: "{colors.on-yellow}"
  button-nav:
    backgroundColor: "transparent"
    textColor: "{colors.cream-ink}"
    typography: "{typography.body-small}"
    rounded: "{rounded.none}"
    padding: "10px 16px"
  button-nav-hover:
    backgroundColor: "{colors.hard-hat-yellow}"
    textColor: "{colors.on-yellow}"
  nav-bar:
    backgroundColor: "rgb(14 16 17 / 0.82)"
    textColor: "{colors.cream-ink-2}"
    height: "{spacing.nav-height}"
  readout-band:
    backgroundColor: "{colors.hard-hat-yellow}"
    textColor: "{colors.on-yellow}"
    typography: "{typography.figure}"
    height: "76px"
  annotation-label:
    backgroundColor: "{colors.hard-hat-yellow}"
    textColor: "{colors.on-yellow}"
    typography: "{typography.readout}"
    rounded: "{rounded.none}"
    padding: "4px 6px"
  spec-glyph:
    backgroundColor: "transparent"
    textColor: "{colors.cream-ink}"
    rounded: "{rounded.none}"
    size: "52px"
  spec-glyph-hover:
    backgroundColor: "{colors.hard-hat-yellow}"
    textColor: "{colors.on-yellow}"
  matrix-cell-not-yet:
    backgroundColor: "{colors.not-yet-red}"
    textColor: "#1a0b08"
    typography: "{typography.figure}"
---

# Design System: Boomer Preview

## Overview

**Creative North Star: "The Machine View"**

This system belongs to the `/preview` marketing surface only: it is a new world proposed for the public homepage and has not been approved for the product, whose app screens keep the root `DESIGN.md` ("Labeled panel"). It plays the cinematic industrial-tech scroll straight: graded field footage on graphite, then the same scene seen the way Boomer sees it, with yellow boxes, mono readouts and a ruled spec sheet. The page earns its authority by showing real mechanism; every visual is either footage, product output, or labeled as illustrative.

Density is low at the edges and high inside the instruments. Sections are wide graphite fields with a condensed uppercase headline and a single lede, while the stage visuals, check panel, spec rows and system diagram pack real constants and code paths in mono at 11–12px. The material is matte: graphite steps, cream hairlines, scrims over photography, viewfinder corner brackets, square shoulders. The world rejects the card-grid AI startup page; structure comes from rules and grid, not from filled rounded containers.

Motion is a camera, not a decoration. Things rise and clip in on one long-tail ease, annotation boxes wipe open after the footage has played, and every sequence starts from a visible default and jumps to its final state under reduced motion.

**Key Characteristics:**
- Graphite grounds in four steps, warm cream ink in three, hard-hat yellow as the only accent.
- Archivo on its width axis: condensed uppercase (62.5–75% wdth, 800–900) for display and figures, normal width for reading.
- JetBrains Mono only for readouts, code paths, data keys and provenance captions.
- Hairline rules (1px cream at 13% and 26%) and viewfinder corner brackets instead of cards.
- Zero radius on everything native.

## Colors

A graphite-and-cream instrument palette with one yellow signal and two outcome colors that are reserved for check results.

### Primary
- **Hard-Hat Yellow** (`hard-hat-yellow`): the single signal. It carries the primary action, the full-width readout band under the hero, the third hero line, annotation boxes and their labels, the current stage in the progress meter, the nav scroll-progress hairline, the human-in-the-loop marks in the system diagram, the agent glyph line under each stage heading, focus outlines and text selection. Text on it is always On-Yellow.
- **Hot Yellow** (`hard-hat-yellow-hot`): hover state of the primary action only.
- **On-Yellow** (`on-yellow`): near-black warm ink for anything set on yellow.

### Tertiary
- **Looks-Right Green** (`looks-right-green`): a check outcome of "looks right" or "worker confirmed" (vote results, the check matrix, status rings, the fixed-wire highlight).
- **Not-Yet Red** (`not-yet-red`): a check outcome of "not yet" and the correction loop in the system diagram. As a fill it backs the "not yet" matrix cell with dark red-black ink.

### Neutral
- **Graphite Deep** (`graphite-deep`): alternating section ground (story, agents, gate) and the backing behind full-bleed media.
- **Graphite** (`graphite`): page ground and theme color.
- **Graphite Raised** (`graphite-raised`): media placeholders and diagram nodes.
- **Graphite Lit** (`graphite-lit`): agent nodes, the inactive progress-meter rule.
- **Cream Ink** (`cream-ink`): headings, primary text, corner brackets, the diagram bus bar.
- **Cream Ink 2** (`cream-ink-2`): ledes, body copy in stages, nav links, secondary cells.
- **Cream Ink 3** (`cream-ink-3`): mono captions, code paths, fine print, matrix headers.
- **Hairline / Hairline Strong** (`hairline`, `hairline-strong`): row dividers and section tops at 13%; table tops, ghost borders and the nav CTA border at 26%.

### Named Rules
**The One Signal Rule.** Yellow is the only accent and it always means "act here" or "the machine is pointing at this". It never fills a decorative surface or a section background, apart from the hero readout band.

**The Outcome Colors Rule.** Green and red appear only where a check result is shown, using the product's four results. They never decorate, never mark a feature, and never stand in for brand.

## Typography

**Display Font:** Archivo, variable `wdth` axis (with system-ui, sans-serif)
**Body Font:** Archivo at 100% width
**Label/Mono Font:** JetBrains Mono 400/500 (with ui-monospace, SFMono-Regular, Menlo)

**Character:** One industrial family stretched from compressed to normal width: condensed caps read like stencil on equipment, normal width reads like a manual. Mono is the machine's voice and appears only where the machine is speaking.

### Hierarchy
- **Display** (900, clamp(52px, 8.6vw, 136px), 0.86, 62.5% wdth, uppercase): the hero's three lines only. The closing title uses the same voice slightly smaller (clamp(44px, 7vw, 112px), 0.88, 14ch).
- **Headline** (800, clamp(34px, 5.2vw, 76px), 0.94, 75% wdth, uppercase, balanced, 18ch): every section heading.
- **Title** (800, clamp(28px, 2.9vw, 44px), 0.98, 62.5% wdth, uppercase): stage headings in the scroll story.
- **Figure** (800, 75% wdth, uppercase, line-height 1): readout-band values, comparison heads (20px), spec names (26px), vote results (20px), matrix results (clamp(24px, 3vw, 44px)). The check verdict uses 900 at 62.5% wdth, clamp(40px, 4.6vw, 72px).
- **Lede** (400, clamp(17px, 1.35vw, 20px), 1.5, max 54ch, Cream Ink 2): one paragraph beside each section headline. The hero lede is larger (clamp(17px, 1.5vw, 22px), 1.45, 46ch).
- **Body** (400, 17px, 1.5): base. Stage body is 18px/1.55 at 44ch; facts and table cells drop to 14px.
- **Readout** (JetBrains Mono 400, 12px; 11px micro): code paths, data keys, readout-band labels, provenance captions, annotation labels (clamp(10px, 0.8vw, 12px), 500).
- **Fine** (Archivo 400, 13px, Cream Ink 3, 70ch): sourcing and scope notes.

### Named Rules
**The Condensed Voice Rule.** Uppercase belongs only to condensed Archivo at 800–900. Reading text is sentence case at normal width; nothing is tracked-out uppercase at small sizes.

**The Mono Is Data Rule.** JetBrains Mono sets values, identifiers, code paths and provenance, never prose, headings or buttons. Numbers that must align use tabular figures.

## Layout

A full-bleed scroll on a 1360px content measure with a fluid gutter (clamp(16px, 4vw, 56px)). Sections open with a two-column head at 1000px and up (headline 1.1fr, lede 0.9fr, bottom-aligned), and are separated by a hairline top plus generous vertical padding (clamp(88px, 12vw, 160px)); grounds alternate between Graphite and Graphite Deep. The fixed nav is 64px with a blurred translucent graphite ground.

The hero fills the small viewport height: footage behind a bottom-and-left scrim, viewfinder brackets inset from the nav and the band, the display headline bottom-left, and a yellow readout band pinned to the bottom edge (76px; 136px and two columns below 900px).

The scroll story is the signature layout: at 900px and up, a sticky visual column (1.32fr) holds the active stage while a narrow text column (0.68fr) scrolls one stage per viewport height; inactive stage text sits at 32% opacity. A nine-segment mono progress meter rides above the visual. Below 900px, visual and text interleave in one column.

Data is set as ruled tables, not cards: comparison rows, the agent spec sheet (220px id column plus three fluid columns at 1000px), the check matrix (1.1fr 1fr 1fr), vote lists. Breakpoints are 600, 640, 900, 1000 and 1100px.

**The Ruled Sheet Rule.** Grouped information sits on hairlines inside the grid: a 26% hairline on top, 13% between rows, generous row padding (14–28px). It never sits in floating, filled boxes.

## Elevation & Depth

The native world is flat. Depth comes from graphite steps, scrims over photography (bottom-up gradients to 94% Graphite Deep) and the translucent blurred nav. Shadows appear only under depicted physical objects and screenshots, as long soft drops that seat a device on the page, and as a thin dark halo that keeps yellow annotation strokes legible over footage.

### Shadow Vocabulary
- **Device seat** (`box-shadow: 0 30px 60px -30px rgb(0 0 0 / 0.8)`): product screenshots in the product section; the phone uses a deeper variant with a hairline ring.
- **Annotation halo** (`box-shadow: 0 0 0 1px rgb(0 0 0 / 0.35), inset 0 0 0 1px rgb(0 0 0 / 0.25)`): yellow detection boxes over video, for contrast only.

### Named Rules
**The Flat Instrument Rule.** Native surfaces never cast shadows. A shadow means "this is a real object or screen placed on the page".

## Shapes

Square shoulders throughout: buttons, the readout band, annotation boxes and labels, spec glyph tiles, diagram nodes and media frames all have 0 radius. Corner brackets (2px cream strokes, 28px in the hero, 18px inset 10px on stage media) frame footage like a viewfinder. Dashed strokes mark rules engines and stores (dashed glyph tiles, dashed diagram nodes and legend swatches) and the correction loop.

Radius appears only on depicted things that are round in reality: the phone (34px bezel), phone screenshots (22px), message bubbles (18px with a 6px tail corner), the product's label tape (3px) and status dots and rings (50%).

**The Square Shoulder Rule.** If it belongs to this page, its corners are square. If a corner is round, it is depicting a device or a product screen.

**The Hard-Hat Mark Rule.** Agent glyphs are built from the Boomer hard hat (a dome arc and a brim line) on a 24px grid, one 1.75 stroke, square caps and miter joins, in currentColor. Human roles share one mark so people read apart from software.

## Components

### Buttons
Blunt and plate-like.
- **Shape:** square (0 radius).
- **Primary:** Hard-Hat Yellow ground, On-Yellow text, Archivo 800 at 17px, 56px tall, 24px horizontal padding, trailing arrow. Used for "Open the demo console" in the hero and close.
- **Hover / Focus:** ground warms to Hot Yellow and the arrow slides 4px right; active presses down 1px. Focus everywhere is a 2px yellow outline offset 3px.
- **Secondary:** an underlined text link (Archivo 600, 16px, 48px tall hit area) next to the primary. The underline is a 26% cream hairline that turns yellow on hover.
- **Nav CTA:** ghost square with a 26% hairline border, 14px Archivo 700; fills yellow on hover.

### Navigation
Fixed 64px bar on 82% graphite with a 14px backdrop blur and a hairline bottom. Wordmark left (Archivo 900, 80% wdth, 26px, yellow hard hat), five 14px Cream Ink 2 anchor links that brighten to Cream Ink on hover, the ghost CTA right. A 2px yellow scroll-progress line runs along the bottom edge. Links hide below 900px.

### Readout Band (signature)
A full-bleed yellow strip at the bottom of the hero, set like a machine plate: four real constants, each a mono 11px label over a condensed 800 figure, divided by 25% On-Yellow hairlines, plus a right-aligned mono source note. Values come from the code, never from marketing.

### Framed Media and Annotation (signature)
Stage footage sits in a 16:9 frame with viewfinder corners, a mono caption row under it, and an annotation layer that draws 2px yellow boxes with flush mono labels in yellow. Boxes wipe open after the clip plays. A mono provenance caption states whether the overlay is product output or illustrative.

### Stage Text
A condensed title, one or two body paragraphs, a hairline-topped facts line, then the agent line: the agent's hard-hat glyph in yellow, its name in 14px Archivo 700 and the code path in 12px mono beneath.

### Spec Sheet
A ruled list of agents. Each row has a 52px square glyph tile (hairline border, dashed for rules and stores) that fills yellow when the row is hovered, the condensed name with a mono kind line, a role sentence, a mono-keyed input/output list, and a sample quotation marked by a 1px yellow left rule.

### Check Matrix and Votes
Outcomes are set as condensed uppercase figures in their outcome color on a ruled grid; the "not yet" cell inverts to a solid Not-Yet Red ground. Votes list reviewer, model in mono and result, with the verdict in 900 condensed.

### System Diagram
An SVG on the page ground: a 6px cream bus bar, square nodes on Graphite Raised with hairline strokes (agents on Graphite Lit with a stronger stroke, rules dashed, the human node in yellow, the record output in cream), 1.5px edges with mono labels knocked out of the ground, and animated dash flow while in view. A text version follows for non-visual readers.

### Depicted Product
Product screens shown inside the page (the phone HUD, the work record, iMessage threads) keep the product's own Labeled-panel colors and forms; they are pictures of the product, not part of this system.

## Do's and Don'ts

### Do:
- **Do** keep Hard-Hat Yellow the only accent and put On-Yellow text on it.
- **Do** set every heading in uppercase condensed Archivo (62.5–75% wdth, 800–900) and every paragraph in normal-width sentence case.
- **Do** use JetBrains Mono for constants, code paths, data keys and provenance captions only.
- **Do** separate sections and rows with 1px cream hairlines at 13% and 26% and alternate Graphite and Graphite Deep grounds.
- **Do** frame footage with viewfinder corner brackets and caption every visual with its source or "illustrative".
- **Do** start every animated sequence from a visible state and use the long-tail ease (cubic-bezier(0.16, 1, 0.3, 1)); reduced motion shows the final state.

### Don't:
- **Don't** use green or red for anything except check results, and never describe AI output as safe, compliant, code-approved, passed or certified.
- **Don't** round the corners of native elements; radius belongs to depicted devices and product screens.
- **Don't** wrap content in filled, rounded or shadowed cards; use the ruled sheet.
- **Don't** put kickers or eyebrow labels above headings; the agent line belongs under the stage heading.
- **Don't** cast shadows from native surfaces.
- **Don't** restyle depicted product screens in this world, or carry this world into the product's app screens until it is approved there.
