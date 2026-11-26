---
name: kumo-primitives-migration
description: Guidance for applying Cloudflare Kumo design system principles to TrackXpense while preserving its signature metallic button aesthetic.
---

# Kumo Primitives Migration & Hybrid Styling Guidelines

This guide establishes the rules for applying Cloudflare's **Kumo Design System** across TrackXpense while preserving TrackXpense's signature **metallic button design**.

## 1. Core Visual Principles

### 1.1 Signature Metallic Buttons (Preserved)
TrackXpense uses a distinctive dark-metal button aesthetic with warm orange accents. Always preserve these visual characteristics:
- **Primary Metallic Gradient**: Multi-stop linear gradient (`--btn-primary-bg`) with dark metal hues.
- **Top Specular Light Lip**: Crisp 1px inset highlight (`inset 0 1px 0 rgba(255, 255, 255, 0.35)`).
- **Bottom Bevel**: Inset dimensional shadow (`inset 0 -1.5px 0 var(--btn-accent-dim)`).
- **Subtle Glow**: Focused/active state with orange accent ring (`0 0 0 1px var(--btn-accent-ring)`).
- **Instant Hover Response**: Unlike standard CSS transitions, hover response must be **immediate** (`transition: transform 0.06s ease;` with zero color delay) to keep interactions snappy and responsive.
- **Kumo Typography Standard**: All button text must be **14px** (`font-size: 14px`), `font-medium` (weight 500), and **Sentence case**.

### 1.2 Strict Typography Rules
- **Content Text Size**: All interactive text, table cells, form labels, data readouts, and body copy must be **14px** (`text-sm`). 16px+ is reserved strictly for headings and subheadings.
- **Heading Casing**: Always use **Sentence case** for titles, headings, and kicker text (`Transactions ledger`, not `TRANSACTIONS LEDGER` or `Transactions Ledger`). Never use `uppercase` on titles.
- **Zero Tracking**: Never modify letter-spacing on body or headings. Remove all `tracking-tight`, `tracking-wider`, and `tracking-widest` classes.
- **No Font Bold**: Never use `font-bold` (700). Use `font-semibold` (600) for headings and `font-medium` (500) for emphasized inline text and buttons.
- **Inline Monospaced Figures**: Currency figures and code identifiers should be rendered with `font-mono text-[0.9em]` or `tabular-nums`.

### 1.3 Optical Spacing & Concentric Radii
- **Optical Padding**: Vertical padding must be slightly smaller than horizontal padding to optically balance text line-height (e.g. `px-5 py-4` or `px-4 py-3` on cards and containers).
- **Related Text Proximity**: Keep headings and their subtitles close together using tight spacing (`gap-1.5`).
- **Concentric Radii**: When nested elements are within 8px of each other, outer radius = inner radius + padding (e.g. `rounded-[8px]` outer card wrapping `rounded-[6px]` controls).

### 1.4 Flat Separation & Shadow Elimination
- **Crisp 1px Borders**: Separate cards and structural surfaces using 1px borders (`border border-[var(--border-default)]`) and background shade steps.
- **No Drop Shadows on Cards**: Avoid blurry ambient box-shadows (`shadow-md`, `shadow-2xl`) on cards. Use `ring-1 ring-[var(--border-strong)]` or crisp 1px borders. Reserve soft shadows exclusively for true floating overlays (dropdown menus, popovers).

### 1.5 Dialog & Popover Lifecycle
- **Unconditional Rendering**: Render dialogs and modal overlays with the `open` prop (`<Dialog.Root open={open}>`) rather than conditional mounting (`open && <Modal>`), preserving entry/exit animations and focus restoration.
