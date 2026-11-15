---
name: Hear
colors:
  surface: '#faf9f6'
  surface-dim: '#dbdad7'
  surface-bright: '#faf9f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f1'
  surface-container: '#efeeeb'
  surface-container-high: '#e9e8e5'
  surface-container-highest: '#e3e2e0'
  on-surface: '#1a1c1a'
  on-surface-variant: '#444748'
  inverse-surface: '#2f312f'
  inverse-on-surface: '#f2f1ee'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c9c6c5'
  secondary: '#b81120'
  on-secondary: '#ffffff'
  secondary-container: '#dc3135'
  on-secondary-container: '#fffbff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1d1b1a'
  on-tertiary-container: '#868381'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c9c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474646'
  secondary-fixed: '#ffdad7'
  secondary-fixed-dim: '#ffb3ae'
  on-secondary-fixed: '#410004'
  on-secondary-fixed-variant: '#930014'
  tertiary-fixed: '#e6e1df'
  tertiary-fixed-dim: '#cac6c3'
  on-tertiary-fixed: '#1d1b1a'
  on-tertiary-fixed-variant: '#484645'
  background: '#faf9f6'
  on-background: '#1a1c1a'
  surface-variant: '#e3e2e0'
typography:
  display-hero:
    fontFamily: Space Grotesk
    fontSize: 64px
    fontWeight: '700'
    lineHeight: 60px
    letterSpacing: -0.05em
  display-hero-mobile:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 46px
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.04em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.03em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Space Grotesk
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 22px
    letterSpacing: -0.01em
  body-sm:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-mono-lg:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.06em
  label-mono-badge:
    fontFamily: JetBrains Mono
    fontSize: 9px
    fontWeight: '700'
    lineHeight: 11px
    letterSpacing: 0.1em
spacing:
  gutter: 1rem
  gutter-sm: 0.75rem
  margin: 1.25rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
  space-2xl: 4rem
---

## Brand & Style

The design system embodies a modern Swiss International Typographic Style fused with an exacting, editorial Brutalist elegance tailored for an intimate personal music streaming experience. The aesthetic rejects decorative skeuomorphism, unnecessary drop shadows, and ornamental cards in favor of stark typographic scale, rigorous grid logic, and deliberate tactile focus.

### Tone & Attitude
- **Architectural & Pure:** Asymmetric balance, disciplined hairline divisions, and stark contrast between deep blacks and warm organic off-white.
- **Auditory Connoisseurship:** The interface behaves like an art publication or vinyl sleeve catalog, treating sound as a curated physical artifact rather than algorithmic noise.
- **Visceral Focus:** Vibrant international red functions as the singular active pulse—used with strict restraint solely to indicate kinetic audio states, real-time scrubbing, and editorial highlights.
- **Language & Atmosphere:** Exclusively set in concise, authoritative French UI copy (`LECTURE EN COURS`, `POPULAIRE`, `BIBLIOTHÈQUE`, `FAVORIS`), reinforcing its avant-garde cultural heritage.

## Colors

The palette is strictly restrained to create uncompromising typographic clarity.

- **Primary (`#0D0D0D`):** Ultra-dense carbon black applied to major display titles, body texts, active track names, and the tactile micro-grooved vinyl record body.
- **Secondary / Accent (`#E5383B`):** Pure cadmium signal red. Reserved exclusively for playback indicators, play/pause states, the elapsed progress bead, active scrub heads, and miniature high-priority tags like `POPULAIRE`. Never used for generic backgrounds or non-interactive text.
- **Neutral / Canvas (`#FAF9F6`):** Warm unbleached paper surface. An alternate secondary ground (`#F5F4F0`) provides subtle visual zoning for pinned bottom sheets or mechanical drawer zones.
- **Hairline / Boundary (`#E5E5E2`):** 1px structural dividing lines providing surgical separation across track rows and meta headers without adding visual weight.
- **Muted Text / Metadata (`#706F6C`):** Mid-tone neutral for secondary track credits and passive timestamps.

## Typography

The typographical system operates on a dual tension: oversized, aggressively kerned grotesque sans-serifs versus sterile, high-density monospaced technical metadata.

- **Display & Headlines (`Space Grotesk`):** Dense, wide, and sculptural. Large-format headings may intentionally scale beyond horizontal screen margins, bleeding off the edges to signal volume, weight, and editorial presence. Negative tracking is mandatory for sizes above 20px.
- **Technical & Utility (`JetBrains Mono`):** Set exclusively in tabular uppercase for track indexes (`01`, `02`), runtimes (`03:42`), bitrates (`FLAC 24-BIT / 96KHZ`), and taxonomy chips (`TECHNO / DÉROIT`).
- **Punctuation & Glyphs:** Always employ typographic quotation marks and strict French spacing before colons and double punctuation marks.

## Layout & Spacing

The layout is built upon an edge-to-edge mobile grid that leverages stark spatial voids to isolate dense typographic clusters.

- **Layout Grid:** A fluid 4-column layout on standard iOS viewports with consistent horizontal margins of `1.25rem` (`20px`), tightening to `1rem` (`16px`) on smaller compact form factors.
- **Rhythm & Structure:** Horizontal flow is punctuated by `1px` hairlines spanning full viewport width or aligned strictly to the inner text column. Containers, cards, and elevation wraps are banned.
- **Bleed Zones:** Album artist hero text and the interactive vinyl turntable disc intentionally break grid boundaries, spanning partially past the device viewport to establish physical tangibility.

## Elevation & Depth

This design system is strictly flat with tactile physical mechanics rather than faux drop shadows or artificial blur treatments.

- **Zero Shadows:** Drop shadows, blur radials, and gradient fills are entirely absent from all structural surfaces.
- **1px Hairline Framework:** Visual hierarchy and nesting are established solely using `1px` continuous borders (`#E5E5E2`).
- **Tactile Centerpiece (The Vinyl Record):** A high-density matte black disc (`#0D0D0D`) defined by concentric circular vector micro-grooves (`#1A1A1A` / `#262626`) and an inner label in canvas off-white (`#FAF9F6`). A center spindle hole (`#0D0D0D`) serves as the rotational anchor for interactive jog-wheel scrubbing.
- **Active State Highlights:** Focus is communicated by pure color shift (canvas white to primary black, or primary black to signal red) or inversion of typography, never by physical elevation.

## Shapes

The geometry adheres to uncompromising Swiss Modernist discipline:

- **Sharp Corners (0px):** Structural components, interactive buttons, modal drawers, and divider containers are strictly rectangular with `0px` border radius.
- **Exception for Rotational Media:** Perfect circles are permitted exclusively for rotary audio components: the micro-grooved vinyl record disc, the center spindle, transport scrub heads, and mini play state rings.

## Components

### Buttons & Transport Controls
- **Primary Play Action:** Bold rectangular block filled with `#0D0D0D` with sharp corners, featuring monospaced text in `#FAF9F6` (`LECTURE`). In active playback, the block or glyph flips to `#E5383B`.
- **Secondary Action:** Unfilled rectangular button bounded by a `1px` solid border (`#0D0D0D`), text in uppercase `JetBrains Mono`.
- **Minimal Icon Triggers:** Raw vector glyphs (sharp triangles, perpendicular twin bars for pause) rendered with no background container, interacting directly on the `#FAF9F6` surface.

### Tracklist Rows
- **Layout:** Continuous vertical stacks divided by `1px` hairlines (`#E5E5E2`). Zero rounded corners, zero elevation.
- **Leading Number:** Uppercase monospaced index (`01`, `02`, `03`) in `#706F6C` positioned at the left boundary.
- **Body Hierarchy:** Track title in `Space Grotesk` medium (`16px`, `#0D0D0D`), accompanied by artist and duration in `JetBrains Mono` (`11px`, `#706F6C`).
- **Active State:** The active track title flips to bold italic with an inline signal red bullet (`●`) or an animated 3-bar equalizer pulse in `#E5383B`.

### Badges & Metadata Chips
- **Design:** Compact, non-rounded boxes with a fine `1px` outline or filled solid in `#0D0D0D`.
- **Typography:** `label-mono-badge` (`9px`, tracked at `+0.1em`).
- **Signal Badges:** Badges like `POPULAIRE` or `DIRECT` use an unfilled border in `#E5383B` with matching red text.

### Interactive Jog-Wheel & Vinyl Scrub Unit
- **Visual Motif:** An oversized circular disc displaying micro-groove concentric line rings.
- **Interaction:** Behaves as an iOS rotary dial. Rotating clockwise advances playback (`+15S`), counter-clockwise rewinds. Dynamic haptic clicks occur at 1-second scrub intervals.
- **Spindle Center:** Displays the album jacket center-label with a miniature signal red track indicator pointing to the current time coordinate.

### Inputs & Scrub Bars
- **Timeline Scrubber:** A continuous `1px` baseline (`#E5E5E2`) with an overlaid elapsed progress stroke in `#0D0D0D` and a sharp `6x6px` square scrubber head in `#E5383B`.
- **Search & Filter:** Bare single-line text inputs underlined with a `1px` border; active cursor rendered as a solid flashing block in `#E5383B`.