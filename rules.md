# Interface Design System & Frontend Guidelines (`rules.md`)

```yaml
name: frontend-design
description: Guidance for distinctive, intentional visual design and technical precision when building new UI or reshaping existing dashboards.
license: Complete terms in LICENSE.txt
```

---

## 1. Technical Dashboard Design System

This system is built for high-density, technical interfaces (such as device utility panels, runtime management tools, and cloud deployment dashboards). It prioritizes information clarity, high contrast, and structural boundaries using subtle background shifts (`bg-shift`) and crisp 1px borders rather than heavy ambient glow, floating cards, or drop shadows.

### Theme Tokens (SF Pro Foundation)

| Token Name | Dark Mode Value | Light Mode Value | Functional Usage |
| --- | --- | --- | --- |
| `--bg-page` | `#0D0D0E` | `#FAFAFA` | Main application canvas background |
| `--bg-surface` | `#141417` | `#FFFFFF` | Primary card, container, and sidebar background |
| `--bg-surface-hover` | `#1A1A1E` | `#F3F4F6` | Interactive surface hover, row hover |
| `--bg-subtle` | `#1F1F24` | `#EAEAEB` | Inactive control pills, track backgrounds |
| `--border-default` | `#222226` | `#E5E7EB` | Structural cards, dividers, table borders |
| `--border-active` | `#3F3F46` | `#D1D5DB` | Input borders, focused states, active card borders |
| `--text-primary` | `#F4F4F5` | `#111827` | Main headings, primary values, active tab text |
| `--text-secondary` | `#A1A1AA` | `#4B5563` | Body text, labels, subheadings, inactive tabs |
| `--text-muted` | `#71717A` | `#6B7280` | Micro-labels, metadata, commit hashes, icons |
| `--accent-solid` | `#FFFFFF` | `#000000` | Primary action buttons, active segmented control |
| `--accent-text` | `#000000` | `#FFFFFF` | Text rendered on top of `--accent-solid` |
| `--status-success-bg` | `rgba(34, 197, 94, 0.12)` | `#DCFCE7` | Success badges, active indicator backgrounds |
| `--status-success-fg` | `#22C55E` | `#15803D` | Success text, active indicator status dots |
| `--status-error-bg` | `rgba(239, 68, 68, 0.12)` | `#FEE2E2` | Error badges, failed deployment tags |
| `--status-error-fg` | `#EF4444` | `#B91C1C` | Error text, alert icons |
| `--status-warning-bg` | `rgba(245, 158, 11, 0.12)` | `#FEF3C7` | Beta tags, pending status badges |
| `--status-warning-fg` | `#F59E0B` | `#B45309` | Warning text, beta text |

---

### Layout Structure & Density

* **Sidebar Navigation:**
* Fixed width of `240px`.
* Background: `--bg-surface`.
* Right border: `1px solid var(--border-default)`.
* Navigation Item: Height `36px`, padding `0 12px`, radius `6px`. Font size `13px`, weight `400` default, `500` active. Active state uses `--bg-surface-hover` and `--text-primary` without accent bars.


* **Card-Based Containers:**
* Card Separation: **1px Border Only**. Do not mix shadows, ambient glows, or dual outlines site-wide.
* Border Radius: `10px` for outer structural cards; `6px` for controls nested inside cards.
* Inner Padding: `20px` default (`16px` on tight control groups).
* Nesting Rule: Maximum 1 level of structural nesting (Page -> Card -> Control Group). Never nest cards inside cards.



---

### Typography Scale (SF Pro)

Set a clear type scale with intentional weights. Avoid font weight `700` unless marking explicit error conditions; standard heading weight is `500` (Medium).

| Element Role | Size | Line Height | Weight | Letter Spacing | Case | Color Token |
| --- | --- | --- | --- | --- | --- | --- |
| **Page Title** | `20px` | `28px` | `500` | `-0.011em` | Sentence | `--text-primary` |
| **Section Title** | `15px` | `22px` | `500` | `-0.006em` | Sentence | `--text-primary` |
| **Micro Kicker Label** | `10px` | `14px` | `500` | `0.06em` | UPPERCASE | `--text-muted` |
| **Body / Readout** | `13px` | `18px` | `400` | `0em` | Sentence | `--text-secondary` |
| **Code / Hash / Path** | `12px` | `16px` | `400` (Monospaced) | `0em` | As-is | `--text-primary` |
| **Tab Text** | `13px` | `18px` | `500` | `0em` | Sentence | Variable |

* Do not place hairline divider lines under headers already separated by vertical whitespace.
* Keep a minimum gap of `8px` between a Micro Kicker Label and its Section Title.

---

### Components & Controls

* **Navigation Tabs:**
* **Underline Tabs (Main Views):** Container bottom border `1px solid var(--border-default)`. Active tab has bottom border `2px solid var(--text-primary)`, text `--text-primary`. Inactive tab uses `--text-secondary`.
* **Segmented Tabs (Dense Views):** Track background `--bg-subtle`, radius `8px`, padding `3px`. Active pill uses background `--bg-surface`, border `1px solid var(--border-default)`, text `--text-primary`.


* **Buttons:**
* **Primary Button:** Fill `--accent-solid`, text `--accent-text`, border `none`, radius `6px`, padding `8px 16px`, weight `500`.
* **Secondary / Outline Button:** Fill `transparent`, text `--text-primary`, border `1px solid var(--border-default)`, radius `6px`. Never place a hairline border on a filled button.


* **Segmented Option Grid (Discrete Selectors):**
* Unselected option: Background `--bg-surface`, border `1px solid var(--border-default)`, text `--text-secondary`.
* Selected option: Background `--accent-solid`, border `1px solid var(--accent-solid)`, text `--accent-text`, weight `500`.


* **Range Sliders:**
* Track height: `2px`, background `--border-default`. Active track `--text-primary`.
* Thumb knob: Solid circle `16px x 16px`, fill `--accent-solid`, no shadow or outline. Scale ticks placed `12px` below track in `--text-muted`.


* **Data Tables:**
* Layout: Width `100%`, border-collapse `collapse`.
* Header: Font size `11px`, uppercase, color `--text-muted`, weight `500`, padding `10px 16px`, bottom border `1px solid var(--border-default)`.
* Row: Padding `12px 16px`, bottom border `1px solid var(--border-default)`. Hover background `--bg-surface-hover`.


* **Iconography:**
* **Thin Stroke Only**: All icons must have a thin stroke weight of `1.5px` (`strokeWidth={1.5}` / `stroke-[1.5px]`).
* **No Container Boxes**: Icons must NEVER be wrapped in background containers, rounded squircle boxes, circles, or pill badges (e.g. do NOT wrap empty state icons or list icons in `w-12 h-12 bg-[var(--bg-subtle)] border...` boxes). Icons stand freely without container boxes.
* Sizing: `14px` (inline), `16px` (sidebar/buttons), or `22px` (empty states).



---

## 2. Frontend Design Framework

Approach UI tasks as the design lead at a small studio known for giving every client a distinct visual identity. Make deliberate, opinionated choices about palette, typography, and layout that are specific to the brief.

### Ground in the Subject

If the brief does not specify the product or subject, define it explicitly before designing: name one concrete subject, its target audience, and the page's single job. Draw inspiration from the subject's physical materials, instruments, artifacts, and vernacular. Use real, concrete content throughout the interface rather than generic filler.

### Core Principles

* **The Hero is a Thesis:** Open with the most characteristic element of the subject's world (a headline, live demo, data readout, or interactive control). Avoid templated hero sections like a big number with a tiny label and a floating gradient background.
* **Typography Carries Personality:** Pair faces deliberately with an intentional type scale, weights, widths, and line heights. Make the typographic execution an active design decision rather than a generic text container.
* **Structure Encodes Meaning:** Structural devices (eyebrows, labels, dividers, layout grids) must represent authentic attributes of the content. Do not use numbered markers (01 / 02 / 03) unless the content represents a sequential process or ordered timeline.
* **Deliberate Motion:** Use animation selectively for page loads, scroll reveals, or micro-interactions. Orchestrated, subtle transitions land better than scattered effects. Excess motion can make a design feel automated or artificial.
* **Calibrated Complexity:** Maximalist directions demand dense, meticulous execution; minimalist directions require exact precision in spacing, alignment, and typography.
* **Interface Copy as Design Material:** Words exist to clarify navigation and utility. Write from the user's perspective in plain terms ("Save changes" instead of "Submit"; "Notifications" instead of "Webhook Config").

### Design Process: Plan, Critique, Build

To avoid default aesthetic trends (e.g., warm cream with terracotta, dark mode with acid green, or dense broadsheet columns), execute in two structured passes:

1. **Pass 1: Design Plan Formulation**
* **Color:** Define a palette of 4–6 semantic tokens (hex values).
* **Typography:** Select distinct typefaces for 2+ functional roles (display, body, utility).
* **Layout:** Map out structural regions using prose and ASCII wireframes.
* **Signature Element:** Identify one unique visual or interactive element that defines the layout.


2. **Pass 2: Review & Self-Critique**
* Evaluate the plan against the brief. If any component reads as an unconsidered default rather than a deliberate choice, adjust it before writing code.
* Ensure CSS selector specificity is controlled (e.g., avoid conflicting rules between utility classes and element-level selectors).


3. **Restraint & Execution**
* Focus visual effort on the signature element while keeping surrounding controls clean and disciplined.
* Maintain baseline quality constraints: responsive behavior across viewports, explicit visual keyboard focus, and respect for reduced-motion settings.



---

## 3. Skills & Operating Capabilities

* **Interface Deconstruction:** Ability to dissect mockups, DOM trees, and visual designs to produce precise CSS variables, token systems, and layout rules.
* **Multi-Theme Engineering:** Structuring scalable semantic token systems that flip seamlessly between light and dark modes while maintaining contrast ratio compliance.
* **High-Density UI Design:** Designing dashboards, hardware control tools, and data-dense web utilities that balance information density with visual hierarchy.
* **Systematic Frontend Specification:** Generating clean, maintainable technical documentation (`rules.md`, style guides, design tokens) without conversational filler or redundant preamble.

# Design System Rules

Extracted from two reference UIs: a light-theme dashboard (sidebar + cards + tables) and a dark-theme device-control panel (sidebar + cards + segmented controls + sticky action bar). Together they define one coherent system that works in both themes — same structural patterns, same interaction language, inverted palette.

> **Note on colors:** the hex values below are close visual estimates read off the screenshots, not pixel-sampled exact values (I wasn't able to sample raw pixels from the uploaded files). Treat them as a very close starting palette and fine-tune 1–2% if you eyedropper your own exports. Font is intentionally not specified anywhere in this document — you're pairing this with SF Pro.

---

## 1. Core philosophy

- **Flat, not shadowed.** Separation comes from a 1px border and a background-shade difference, almost never from drop shadow. Reserve shadow for true overlays (menus, popovers, modals).
- **Density with air.** Rows and cards are compact horizontally but generous vertically — 16–24px of breathing room around anything readable, tight 4–8px around anything paired (icon+label, dot+status).
- **Color is a signal, not decoration.** Blue/amber/green/red only ever appear on: links, the single primary action, and status indicators. Everything else is grayscale.
- **Every interactive surface has a resting, hover, active/selected, and disabled state** — and the difference between them is a background-shade step, not a new color.
- **The theme flips background/text polarity; it does not change the personality.** Radius, spacing, borders, iconography, and the underline-tab pattern are identical in light and dark — only the token values swap.

---

## 2. Layout skeleton

Both references share the same app-shell:

```
┌───────────┬──────────────────────────────────────────┬───────────────┐
│           │  breadcrumb                    utilities  │               │
│  Sidebar  ├──────────────────────────────────────────┤  Contextual   │
│  (fixed,  │  underline tab bar                        │  right nav    │
│  ~260px)  ├──────────────────────────────────────────┤  (optional,   │
│           │                                            │  settings-    │
│  logo/    │  page content: cards, tables, forms        │  style pages  │
│  account  │  in a single scrollable column,            │  only)        │
│  switcher │  max content width, generous padding       │               │
│           │                                            │               │
│  search   │  [sticky bottom action bar when a form     │               │
│           │   has pending/unsaved changes]             │               │
│  nav      │                                            │               │
│  groups   │                                            │               │
└───────────┴──────────────────────────────────────────┴───────────────┘
```

- **Sidebar**: fixed width, own background shade distinct from the page, never scrolls with content.
- **Main column**: everything lives in cards or table-rows stacked vertically — no multi-column dashboards in this pattern.
- **Right contextual nav**: only appears on nested/settings pages; a plain vertical list of anchor links, not a card.
- **Sticky bottom bar**: appears only when there's something to confirm (unsaved changes) — otherwise it doesn't exist. It's the one place a filled, saturated accent button is allowed.

---

## 3. Color tokens

Name tokens semantically so a component never hard-codes light/dark — it just asks for `--color-text-secondary` etc.

### Light theme

| Token | Approx. hex | Used for |
|---|---|---|
| `--bg-page` | `#FAFAFB` | Main content background |
| `--bg-sidebar` | `#F4F5F7` | Sidebar panel (one shade darker than page) |
| `--bg-surface` | `#FFFFFF` | Cards, table surface, inputs |
| `--bg-surface-hover` | `#F3F4F6` | Row/list-item hover |
| `--bg-active-pill` | `#FFFFFF` | Active sidebar item, "lifted" out of the sidebar shade |
| `--border-subtle` | `#E5E7EB` | Card borders, dividers, table hairlines |
| `--border-strong` | `#D1D5DB` | Input borders, hover-state borders |
| `--text-primary` | `#18181B` | Headings, body copy, values |
| `--text-secondary` | `#6B7280` | Meta text, descriptions, labels |
| `--text-tertiary` | `#9CA3AF` | Placeholders, disabled text, timestamps |
| `--accent` | `#2563EB` | Links, "Manage", active pill text, primary icon accents |
| `--accent-bg-soft` | `#DCE7FB` | Pill/badge backgrounds (Environment selector, "Production" badge) |
| `--success` | `#16A34A` | Success check icon, "Connected"/deployed dot |
| `--warning` | `#F59E0B` | "Beta" badge, non-fatal warning triangle |
| `--danger` | `#DC2626` | "Disconnect", delete icon, destructive text |

### Dark theme

| Token | Approx. hex | Used for |
|---|---|---|
| `--bg-page` | `#0B0B0D` | Main content background |
| `--bg-sidebar` | `#0B0B0D` | Same as page — separated by a hairline divider, not a shade |
| `--bg-surface` | `#18191D` | Cards |
| `--bg-surface-hover` | `#1F2024` | Row/list-item hover, selected device row |
| `--bg-inverted-selected` | `#FFFFFF` | Selected segmented-control option (text flips to black) |
| `--border-subtle` | `#27282D` | Card borders, dividers |
| `--border-strong` | `#35363C` | Input borders, hover-state borders |
| `--text-primary` | `#F5F5F6` | Headings, body copy, values |
| `--text-secondary` | `#8A8D93` | Meta text, descriptions |
| `--text-tertiary` | `#5F6169` | Uppercase eyebrow labels, footer/version text |
| `--accent-amber` | `#E3993D` | Primary action button ("Apply changes"), only saturated fill in the UI |
| `--success` | `#22C55E` | "Connected" dot |
| `--danger` | `#E5484D` | Reserved for destructive/error parity with light theme |

**Rule of thumb for building the dark palette from the light one (or vice versa):** page/sidebar background and surface background invert in lightness but keep the *same relative step* between them (sidebar is one step from page in light mode; in dark mode that step becomes a hairline border instead, because pure black has no darker step to spend). Text primary/secondary/tertiary keep the same three-step gray ramp, just flipped. The accent hue can — and here, does — change entirely between themes (blue → amber); it doesn't have to survive the swap, it just has to stay singular.

---

## 4. Type scale (sizes & weights only — pair with SF Pro yourself)

| Role | Size | Weight | Notes |
|---|---|---|---|
| Card big readout (e.g. "1,600 DPI") | 28–32px | Bold/700 | Right-aligned against its card header |
| Card heading (e.g. "Sensitivity", "Build") | 16–18px | Semibold/600 | One per card, top-left |
| Card label w/ underline affordance (e.g. "Build configuration") | 13–14px | Medium/500 | Dotted or solid underline = hints at more info |
| Body / value text | 14px | Regular/400 | Default reading size everywhere |
| Secondary / meta text | 13px | Regular/400 | Gray, sits under a heading or beside a value |
| Uppercase eyebrow label (e.g. "DPI", "SELECTED DEVICE", table headers) | 11–12px | Medium/500 | +4–6% letter-spacing, always the tertiary text color |
| Nav item label | 14px | Regular/Medium | Medium only when active |
| Monospace/tabular data (commit hashes, commands, version strings) | 13px | Regular | Use a mono/tabular-figure fallback so numbers align |

Line-height: 1.4–1.5 for body copy, 1.2 for headings and big readouts.

---

## 5. Spacing, radius, elevation

- **Spacing scale (px):** 4 · 8 · 12 · 16 · 20 · 24 · 32 · 48 — nothing off-scale.
  - Icon-to-label gap: 8px
  - Card internal padding: 20–24px
  - Gap between stacked cards: 16px
  - Sidebar item vertical padding: 8–10px, horizontal 12px
  - Table row vertical padding: 16–20px
- **Radius scale:**
  - `--radius-sm` 6px — inputs, small icon buttons
  - `--radius-md` 8–10px — cards (light theme), buttons
  - `--radius-lg` 12–14px — cards (dark theme reads slightly rounder)
  - `--radius-full` 9999px — pills, badges, segmented-control buttons, dots
- **Elevation:** none, except a soft shadow (`0 4px 12px rgba(0,0,0,.08)` light / `.4` dark) on true floating layers — dropdown menus, popovers. Cards and rows never cast a shadow, only a 1px border.

---

## 6. Component patterns

### 6.1 Sidebar navigation
- Icon (16–18px, ~1.5px stroke, line-style, no fill) + label, single row.
- Ungrouped items first (Account home, Search), then labeled groups ("Observe", "Build") introduced by a small uppercase gray label with no background.
- Active item gets a solid `--bg-active-pill` / `--bg-surface-hover` background that "lifts" it off the sidebar's own shade — this is the *only* nav state that changes background; hover is a lighter version of the same lift.
- Expandable groups (e.g. "Compute") show a chevron and reveal children indented under them; expanded state persists visually via the parent staying highlighted.
- Org/account switcher lives pinned at the very top with a dropdown chevron; global search sits directly under it as a bordered input with a keyboard-shortcut hint right-aligned (`Ctrl K`).

### 6.2 Breadcrumb + underline tabs
- Breadcrumb: icon + label chain separated by `>`; every crumb but the last is `--text-secondary`, the last is `--text-primary` and not a link.
- Tabs sit directly under the breadcrumb, share its left edge, and run along a full-width hairline "track" (`--border-subtle`). Active tab: `--text-primary`, bold, 2px underline in the same color. Inactive tabs: `--text-secondary`, regular, no underline, brightens slightly on hover. Generous horizontal gap between tab labels (~24px) — tabs are never boxed/pill-shaped.
- This exact underline pattern is reused for in-card tab sets (e.g. Overview/Performance/Lighting/…) — it's the single tab component for the whole system, not a dashboard-only pattern.

### 6.3 Cards
- `--bg-surface` fill, 1px `--border-subtle`, radius per §5, internal padding 20–24px.
- Standard header: small uppercase eyebrow label (optional) → bold heading, on one line; if the card exposes a single current value, right-align it opposite the heading, large and bold.
- A settable card gets a small ghost pencil/edit icon pinned top-right — never an always-visible input. Clicking it is what reveals the editable field.
- Cards stack in a single column; they don't form a masonry/grid layout in this system.

### 6.4 Key–value rows
- Label (`--text-secondary`, 13–14px) directly above or beside its value (`--text-primary`), 4–6px gap, no colon unless the pair sits inline on one line ("Build command: `pnpm run build`").
- Inline technical values (commands, paths, versions) render in monospace/tabular so they read as "data," not prose.

### 6.5 Badges & pills
- Two variants only:
  1. **Status/category pill** — soft tinted background + matching saturated text, fully rounded, small (e.g. "Beta," "Production"). Never a solid saturated fill.
  2. **Segmented choice pill** — part of a button group (see 6.7); resting state is bordered/transparent, selected state inverts to a solid fill.
- Pills are compact: ~4px vertical / 10–12px horizontal padding, 12–13px text.

### 6.6 Status indicators
- A filled colored dot (6–8px) always pairs with a short text label: green = success/connected/live, red = error/attention, amber = pending/beta. The dot never appears without its text, and the text never appears without its dot for live/connection states.
- For historical/log status (deployment succeeded/failed), swap the dot for a small icon: green check-circle or red/amber warning-triangle, followed by relative time in `--text-secondary`.

### 6.7 Segmented / preset button groups
- Used for discrete numeric or categorical choice sets (DPI presets, environment selector).
- Grid or inline row of pill-shaped buttons, equal padding. Resting: `--bg-surface` (dark: `--bg-surface`/transparent) + `--border-subtle`. Selected: fully inverted — light theme uses the soft accent background, dark theme flips all the way to a solid white fill with black text (the single "loudest" non-accent element allowed in the dark theme, by design — it's a control, not decoration).
- A one-line caption in `--text-tertiary` under the group confirms the current resolved state in plain language ("Current 1,600 DPI").

### 6.8 Tables / list rows
- No cell borders. Header row: uppercase `--text-tertiary` labels, bottom hairline. Body rows: separated by 1px `--border-subtle` hairlines only, generous vertical padding, background stays `--bg-surface` at rest and steps to `--bg-surface-hover` on hover.
- A row can carry a left-edge 2–3px accent bar (`--accent`) to mark it as "current/active" among siblings (e.g. the live production deployment).
- Row-level actions live at the far right as a ghost icon or a `···` kebab menu — never inline text buttons competing with content.

### 6.9 Forms & inputs
- Inputs: `--bg-surface` fill, `--border-strong` outline, radius `--radius-sm`, same 14px type as body text. Dropdowns match input styling with a trailing chevron.
- Secrets/encrypted values render as a lock icon + italic `--text-tertiary` placeholder text ("Value encrypted") instead of the raw value — never expose sensitive values by default.
- Empty/unconfigured states (e.g. no bindings yet) render as a plain bordered panel, centered `--text-secondary` sentence explaining what would go here — no illustration, no dashed border, just quiet informative text.

### 6.10 Slider
- Full-width horizontal track, flat ends. Track split into a filled segment (light/white in dark theme, accent in light theme) up to the thumb, and an unfilled segment (`--border-subtle`) beyond it.
- Thumb: solid circle, `--text-primary`-colored, no icon inside, subtle border/shadow for depth.
- Tick labels along the bottom edge at fixed intervals, `--text-tertiary`, 11px.
- A caption line below explains persistence/behavior in `--text-tertiary`, sentence case, can include an em-dash aside.

### 6.11 Buttons
- **Primary (filled):** solid accent fill, white/black text for contrast, only ever one per screen/action-bar — this system is stingy with filled buttons on purpose.
- **Secondary (outline/ghost):** `--border-strong` outline or no border at all, `--text-primary` label, background stays transparent until hover.
- **Destructive:** text-only or icon-only in `--danger`, never a solid red fill — red is reserved as a signal color, not a surface color.
- **Icon/ghost button:** no border at rest, `--text-secondary` icon, background tints to `--bg-surface-hover` on hover, no visible boundary otherwise.
- Disabled: entire control drops to ~40–50% opacity and loses its hover response; label stays legible, doesn't disappear.

### 6.12 Sticky bottom action bar
- Appears only while there's an unsaved/pending change; fixed to viewport bottom, `--bg-surface` fill, top `--border-subtle` hairline.
- Left: bold status line ("No pending changes" / "N changes pending") + one line of gray explanatory caption underneath.
- Right: a ghost "Revert" button next to the one filled primary button in the whole screen ("Apply changes"), which may carry a small leading icon.

### 6.13 Pagination
- Plain text meta ("Showing 1–15 of 102") + a separate "Page N of M" indicator, then bordered ghost chevron buttons (first/prev/next/last) and a small numeric stepper input for jumping to a page directly. No numbered page-link list.

### 6.14 Footer
- Small `--text-secondary` links in a single row, generous horizontal gap, no dividers needed if spacing is consistent; a small lock/shield icon precedes privacy-related links; copyright sits at the row's end.

---

## 7. Iconography

- Line icons only, consistent ~1.5–1.75px stroke weight, no fills except: status dots, the check-circle/warning-triangle status icons, and icons inside a selected/inverted segmented button.
- Standard sizes: 14–16px inline with 13–14px text, 18–20px in nav rows, 20–24px for card-level or empty-state icons.
- Icons are never colored for decoration — icon color always equals the text color beside it, except status icons (success/warning/danger) and the single primary-action icon.

## 8. Motion

- Keep it to state transitions only: 120–160ms ease for background/color/opacity changes on hover, active, and selected states. No entrance animation, no scroll-triggered reveals — this is a utility UI, motion should be invisible when it's working correctly.
- Slider thumb and toggle/segmented selection can use a slightly slower transform transition (~180–200ms) so the "snap" to a new value reads as deliberate.

---

## 9. Implementation notes

Define every token in §3 as a CSS custom property at the root, then re-declare the same variable names under a `[data-theme="dark"]` (or `prefers-color-scheme: dark`) scope. No component should ever reference a raw hex value — only the semantic token. That's what makes the two reference screens (one light, one dark) read as the same product: the *structure and token names* never change, only what the tokens resolve to.

```css
:root {
  --bg-page: #FAFAFB;
  --bg-sidebar: #F4F5F7;
  --bg-surface: #FFFFFF;
  --bg-surface-hover: #F3F4F6;
  --border-subtle: #E5E7EB;
  --border-strong: #D1D5DB;
  --text-primary: #18181B;
  --text-secondary: #6B7280;
  --text-tertiary: #9CA3AF;
  --accent: #2563EB;
  --accent-bg-soft: #DCE7FB;
  --success: #16A34A;
  --warning: #F59E0B;
  --danger: #DC2626;

  --radius-sm: 6px;
  --radius-md: 9px;
  --radius-lg: 13px;
  --radius-full: 9999px;

  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-5: 20px; --space-6: 24px; --space-8: 32px; --space-12: 48px;
}

[data-theme="dark"] {
  --bg-page: #0B0B0D;
  --bg-sidebar: #0B0B0D;
  --bg-surface: #18191D;
  --bg-surface-hover: #1F2024;
  --border-subtle: #27282D;
  --border-strong: #35363C;
  --text-primary: #F5F5F6;
  --text-secondary: #8A8D93;
  --text-tertiary: #5F6169;
  --accent: #E3993D;
  --accent-bg-soft: #2A2214;
  --success: #22C55E;
  --warning: #E3993D;
  --danger: #E5484D;
}
```

---

## Appendix — general design-quality guidance

The following is the studio-level guidance I use whenever I'm asked to design or restyle a UI. It's broader than this one system, but it's the lens the rules above were built through — worth keeping alongside them if this file gets handed to someone else (or to me, later) as project context.

### Frontend Design

Approach this as the design lead at a small studio known for giving every client a visual identity that could not be mistaken for anyone else's. This client has already rejected proposals that felt templated, and is paying for a distinctive point of view: make deliberate, opinionated choices about palette, typography, and layout that are specific to this brief, and take one real aesthetic risk you can justify.

**Ground it in the subject.** If the brief does not pin down what the product or subject is, pin it yourself before designing: name one concrete subject, its audience, and the page's single job, and state your choice. The subject's own world — its materials, instruments, artifacts, and vernacular — is where distinctive choices come from. Build with the brief's real content and subject matter throughout.

**Design principles.** For web designs, the hero is a thesis. Open with the most characteristic thing in the subject's world, in whatever form makes sense for it: a headline, an image, an animation, a live demo, an interactive moment. Typography carries the personality of the page — pair display and body faces deliberately, set a clear type scale with intentional weights, widths, and spacing. Structure is information: numbering, eyebrows, dividers, and labels should encode something true about the content, not decorate it (numbered markers like 01/02/03 only belong where the content really is a sequence). Leverage motion deliberately — a page-load sequence, a scroll-triggered reveal, hover micro-interactions, ambient atmosphere — but know that scattered, undirected animation reads as AI-generated. Match complexity to the vision: maximalist directions need elaborate execution, minimal directions need precision in spacing, type, and detail.

**Process: brainstorm, explore, plan, critique, build, critique again.** AI-generated design right now clusters around three defaults: a warm cream background with a high-contrast serif and a terracotta accent; a near-black background with a single acid-green or vermilion accent; or a broadsheet layout with hairline rules, zero radius, and dense newspaper columns. All three are legitimate for the right brief, but they're defaults, not choices, when they show up regardless of subject. Where a brief pins down a direction, follow it exactly. Where it leaves an axis free, don't spend that freedom on autopilot. Work in two passes: first sketch a compact token system (4–6 named hex colors; typefaces for 2+ roles; a layout concept described in prose plus ASCII wireframes; one signature element the page will be remembered by), then review that plan against the brief and revise anything that reads like a generic default before writing any code. Watch CSS selector specificity so type-based and element-based selectors don't silently cancel each other out, especially around section/component padding.

**Restraint and self-critique.** Spend boldness in one place — let the signature element be the one memorable thing, keep everything around it quiet and disciplined, and cut decoration that doesn't serve the brief. Build to a quality floor without announcing it: responsive down to mobile, visible keyboard focus, reduced motion respected. Critique your own work as you build. Before shipping, look once more and remove one accessory.

**Writing in design.** Words exist to make a design easier to understand and use — they're material, not decoration. Write from the end user's side of the screen: name things by what people control and recognize, not by how the system is built. Use active voice; a control names exactly what happens when it's used, and that name stays consistent through the whole flow (a "Publish" button produces a "Published" toast). Treat failure and empty states as moments for direction, not mood — explain what happened and how to fix it, in the interface's voice. Keep the register conversational and tuned: plain verbs, sentence case, no filler, tone matched to the audience.

---

# Design System — Dark Navy / Cyan

This project uses a shared design system for all UI. Do not invent
new button, tab, table, or pagination styles — use the components
below every time one of these elements is needed.

## Source of truth

The stylesheet lives at: `src/styles/design-system.css`

Import/link it once per app, don't inline copies of these rules.

## Palette

- Background: `#090a0f` (`--ds-bg`)
- Panel surface: `#10141c` (`--ds-panel`) (alt surface `#0c0f16` / `--ds-panel-alt`)
- Border: `#1c2430` (`--ds-border`)
- Text: `#eaf2f8` (`--ds-text`) (dim `#97a4b3` / `--ds-text-dim`, faint `#5b6b7d` / `--ds-text-faint`)
- Accent (cyan): `#58c4e0` (`--ds-accent`) / `#86c7e7` (`--ds-accent-strong`)
- Success: `#4ad991` (`--ds-ok`)
- Warning: `#e2685c` (`--ds-warn`)

All of these are exposed as CSS custom properties (`--ds-*`) at
`:root` in design-system.css — reference the variables, don't
hardcode the hex values in new components.

## Components and when to use them

- **`.btn.btn--primary`** — one per view, for the single main action
  (Save, Create, Confirm). Has a metallic bevel + cyan glow on
  hover/focus.
- **`.btn.btn--secondary`** — normal everyday actions. Same bevel
  family, no glow.
- **`.btn.btn--outline`** — quiet action on top of a panel/card that
  already has its own background.
- **`.btn.btn--ghost`** — lowest emphasis (Cancel, Dismiss).
- **`.tabs` / `.tab` / `.tab.is-active`** — section navigation.
- **`.panel` / `.panel__header` / `.panel__footer`** — the
  container for any card or data table.
- **`.pill`** — small status/category tag (e.g. an environment or
  state label).
- **`.pager` / `.pager-btn` / `.pager-page`** — pagination controls.

## Rules

1. When building any button, tab bar, data table, or pagination UI,
   reuse the classes above instead of writing new CSS for the same
   purpose.
2. If a new situation doesn't fit an existing variant, propose a new
   variant that follows the same bevel/gradient recipe rather than a
   one-off style, and add it to `design-system.css` so it's
   reusable next time.
3. Keep this file and `design-system.css` in sync across projects —
   if you improve a component here, apply the same change to the
   canonical copy so other projects can pick it up.
4. Never fall back to default/unstyled browser buttons, tables, or
   inputs in a UI that's meant to ship — always apply the design
   system.

## Keeping projects in sync

This rule file and `design-system.css` should be identical (or a
deliberate superset) across every project that uses this system.
Keep one canonical copy — e.g. a small private repo, gist, or a
`~/design-system/` folder on disk — and copy both files into each
new project from there rather than re-deriving them per-project.

