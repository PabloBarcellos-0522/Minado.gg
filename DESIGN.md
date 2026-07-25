---
version: alpha
name: Minado.gg Design System
description: A playful, colorful multiplayer minesweeper social game. Brand identity built on "Jester + Everyman" archetypes — flat, fun, rounded, with a green primary field color, purple secondary, and gold accent for rewards. Comic Neue + Baloo 2 typography pairing creates an approachable, party-game atmosphere. UI is friendly and bouncy, with generous rounding, subtle shadows, and purposeful micro-interactions that respect reduced-motion preferences.

colors:
    # ── Primary — Verde Campo (minesweeper field) ──
    primary-50: "#ECFDF3"
    primary-100: "#D1FADF"
    primary-200: "#A6F4C5"
    primary-300: "#6CE9A6"
    primary-400: "#32D583"
    primary-500: "#16A34A"
    primary-600: "#128A43"
    primary-700: "#0E6B36"
    primary-800: "#0C552B"
    primary-900: "#0A4523"

    # ── Secondary — Purple ──
    secondary-50: "#F5F3FF"
    secondary-100: "#EDE9FE"
    secondary-200: "#DDD6FE"
    secondary-300: "#C4B5FD"
    secondary-400: "#A78BFA"
    secondary-500: "#8B5CF6"
    secondary-600: "#7C3AED"
    secondary-700: "#6D28D9"
    secondary-800: "#5B21B6"
    secondary-900: "#4C1D95"

    # ── Accent — Reward Gold ──
    accent-50: "#FFFBEB"
    accent-100: "#FEF3C7"
    accent-200: "#FDE68A"
    accent-300: "#FCD34D"
    accent-400: "#FBBF24"
    accent-500: "#F59E0B"
    accent-600: "#D97706"
    accent-700: "#B45309"
    accent-800: "#92400E"
    accent-900: "#78350F"

    # ── Neutral — Slate ──
    neutral-50: "#F8FAFC"
    neutral-100: "#F1F5F9"
    neutral-200: "#E2E8F0"
    neutral-300: "#CBD5E1"
    neutral-400: "#94A3B8"
    neutral-500: "#64748B"
    neutral-600: "#475569"
    neutral-700: "#334155"
    neutral-800: "#1E293B"
    neutral-900: "#0F172A"

    # ── Semantic ──
    success: "#22C55E"
    success-soft: "#DCFCE7"
    warning: "#F59E0B"
    warning-soft: "#FEF3C7"
    error: "#EF4444"
    error-soft: "#FEE2E2"
    error-600: "#DC2626"
    error-700: "#B91C1C"
    on-error: "#FFFFFF"
    info: "#3B82F6"
    info-soft: "#DBEAFE"

    # ── Surface / Background / Text (Light) ──
    bg: "#F8FAFC"
    surface: "#FFFFFF"
    surface-muted: "#F1F5F9"
    input: "#F8FAFC"
    border: "#E2E8F0"
    ink: "#0F172A"
    ink-muted: "#64748B"
    ring: "#16A34A"
    scrim: "color-mix(in srgb, #0F172A 55%, transparent)"

    # ── Chart / Data Palette ──
    chart-1: "#16A34A"
    chart-2: "#8B5CF6"
    chart-3: "#F59E0B"
    chart-4: "#3B82F6"
    chart-5: "#06B6D4"

    # ── Dark Mode Surface ──
    dark-bg: "#0F172A"
    dark-surface: "#1E293B"
    dark-surface-muted: "#243042"
    dark-input: "#243042"
    dark-border: "#334155"
    dark-ink: "#F8FAFC"
    dark-ink-muted: "#94A3B8"
    dark-ring: "#4ADE80"

    # ── Dark Mode Brand (lightened for contrast) ──
    dark-primary-400: "#22C55E"
    dark-primary-500: "#4ADE80"
    dark-secondary-400: "#A78BFA"
    dark-secondary-500: "#B794FF"
    dark-accent-400: "#FBBF24"
    dark-accent-500: "#FCD34D"

    # ── Dark Mode Semantic ──
    dark-success: "#4ADE80"
    dark-success-soft: "#14311F"
    dark-warning: "#FBBF24"
    dark-warning-soft: "#312607"
    dark-error: "#F87171"
    dark-error-soft: "#321515"
    dark-info: "#60A5FA"
    dark-info-soft: "#0F2238"

    # ── Dark Mode Chart ──
    dark-chart-1: "#4ADE80"
    dark-chart-2: "#B794FF"
    dark-chart-3: "#FCD34D"
    dark-chart-4: "#60A5FA"
    dark-chart-5: "#22D3EE"

    # ── Dark Mode Shadows ──
    dark-shadow-sm: "0 2px 6px rgba(0, 0, 0, 0.35)"
    dark-shadow-md: "0 8px 22px rgba(0, 0, 0, 0.45)"
    dark-shadow-lg: "0 18px 44px rgba(0, 0, 0, 0.55)"

    # ── Board Cell Number Colors ──
    cell-number-1: "{colors.info}"          # blue — 1 adjacent mine
    cell-number-2: "{colors.primary-700}"   # dark green — 2 adjacent mines
    cell-number-3: "{colors.error-600}"     # red — 3 adjacent mines
    cell-number-4: "{colors.secondary-600}" # purple — 4 adjacent mines
    cell-number-5: "{colors.accent-600}"    # gold — 5 adjacent mines
    cell-number-6: "{colors.accent-700}"    # dark gold — 6 adjacent mines
    cell-number-7: "{colors.neutral-700}"   # dark slate — 7 adjacent mines
    cell-number-8: "{colors.primary-800}"   # very dark green — 8 adjacent mines

typography:
    # ── Font Families ──
    heading-family: "'Baloo 2', system-ui, sans-serif"
    body-family: "'Comic Neue', system-ui, sans-serif"

    # ── Font Weights ──
    weight-light: 300
    weight-regular: 400
    weight-medium: 600
    weight-bold: 700
    weight-extra: 800

    # ── Display / Headings ──
    h1:
        fontFamily: "{typography.heading-family}"
        fontSize: 48px
        fontWeight: 800
        lineHeight: 1.2
    h2:
        fontFamily: "{typography.heading-family}"
        fontSize: 36px
        fontWeight: 800
        lineHeight: 1.2
    h3:
        fontFamily: "{typography.heading-family}"
        fontSize: 28px
        fontWeight: 800
        lineHeight: 1.2
    h4:
        fontFamily: "{typography.heading-family}"
        fontSize: 22px
        fontWeight: 700
        lineHeight: 1.2
    h5:
        fontFamily: "{typography.heading-family}"
        fontSize: 18px
        fontWeight: 700
        lineHeight: 1.2
    h6:
        fontFamily: "{typography.heading-family}"
        fontSize: 16px
        fontWeight: 700
        lineHeight: 1.2

    # ── Body Copy ──
    lead:
        fontFamily: "{typography.body-family}"
        fontSize: 20px
        fontWeight: 400
        lineHeight: 1.6
    body:
        fontFamily: "{typography.body-family}"
        fontSize: 16px
        fontWeight: 400
        lineHeight: 1.6
    small:
        fontFamily: "{typography.body-family}"
        fontSize: 13px
        fontWeight: 400
        lineHeight: 1.6

rounded:
    sm: 8px
    md: 14px
    lg: 22px
    xl: 30px
    full: 999px

spacing:
    1: 4px
    2: 8px
    3: 12px
    4: 16px
    5: 20px
    6: 24px
    7: 28px
    8: 32px
    9: 36px
    10: 40px
    11: 44px
    12: 48px
    16: 64px
    20: 80px
    24: 96px

elevation:
    sm: "0 2px 6px rgba(15, 23, 42, 0.08)"
    md: "0 8px 22px rgba(15, 23, 42, 0.12)"
    lg: "0 18px 44px rgba(15, 23, 42, 0.16)"

motion:
    duration-fast: 140ms
    duration-base: 220ms
    duration-slow: 420ms
    ease-bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)"
    ease-standard: "cubic-bezier(0.22, 1, 0.36, 1)"

z-index:
    tooltip: 50
    modal: 100
    toast: 150

components:
    button-primary:
        backgroundColor: "{colors.primary-500}"
        textColor: "#FFFFFF"
        typography: "{typography.heading-family}"
        fontWeight: 700
        rounded: "{rounded.full}"
        padding: 12px 24px
        shadow: "{elevation.sm}"
        interaction: "hover:-translate-y-px active:scale-96"
    button-primary-ghost:
        backgroundColor: "transparent"
        textColor: "{colors.primary-600}"
        rounded: "{rounded.full}"
    button-secondary:
        backgroundColor: "{colors.secondary-500}"
        textColor: "#FFFFFF"
        rounded: "{rounded.full}"
        shadow: "{elevation.sm}"
    button-accent:
        backgroundColor: "{colors.accent-500}"
        textColor: "{colors.neutral-900}"
        rounded: "{rounded.full}"
        shadow: "{elevation.sm}"
    button-ghost:
        backgroundColor: "transparent"
        textColor: "{colors.primary-600}"
        rounded: "{rounded.full}"
    button-danger:
        backgroundColor: "{colors.error-600}"
        textColor: "#FFFFFF"
        rounded: "{rounded.full}"
        shadow: "{elevation.sm}"
    button-sm:
        padding: 8px 16px
        fontSize: 13px
    button-md:
        padding: 12px 24px
        fontSize: 16px
    button-lg:
        padding: 16px 32px
        fontSize: 18px

    input:
        backgroundColor: "{colors.input}"
        textColor: "{colors.ink}"
        typography: "{typography.body-family}"
        fontSize: 16px
        border: "1.5px solid {colors.border}"
        rounded: "{rounded.md}"
        padding: 12px 16px
        focusRing: "0 0 0 3px color-mix(in srgb, {colors.ring} 35%, transparent)"
    input-error:
        border: "1.5px solid {colors.error}"
        focusRing: "0 0 0 3px {colors.error-soft}"

    label:
        fontFamily: "{typography.body-family}"
        fontSize: 14px
        fontWeight: 600
        textColor: "{colors.ink}"

    badge-primary:
        backgroundColor: "{colors.primary-100}"
        textColor: "{colors.primary-700}"
        typography: "{typography.heading-family}"
        fontWeight: 700
        rounded: "{rounded.full}"
        padding: "4px 12px"
        fontSize: 13px
    badge-secondary:
        backgroundColor: "{colors.secondary-100}"
        textColor: "{colors.secondary-700}"
    badge-accent:
        backgroundColor: "{colors.accent-100}"
        textColor: "{colors.accent-800}"
    badge-success:
        backgroundColor: "{colors.success-soft}"
        textColor: "{colors.success}"
    badge-warning:
        backgroundColor: "{colors.warning-soft}"
        textColor: "{colors.warning}"
    badge-danger:
        backgroundColor: "{colors.error-soft}"
        textColor: "{colors.error}"

    avatar-sm:
        size: 32px
        border: "3px solid {colors.primary-400}"
        rounded: "{rounded.full}"
        shadow: "{elevation.sm}"
    avatar-md:
        size: 44px
        border: "3px solid {colors.primary-400}"
    avatar-lg:
        size: 64px
        border: "3px solid {colors.primary-400}"
    avatar-default:
        backgroundColor: "{colors.secondary-500}"
        textColor: "#FFFFFF"
    avatar-bomb:
        backgroundColor: "{colors.neutral-800}"
        border: "3px solid {colors.accent-400}"
        textColor: "#FFFFFF"

    card:
        backgroundColor: "{colors.surface}"
        border: "1px solid {colors.border}"
        rounded: "{rounded.lg}"
        padding: 24px
        shadow: "{elevation.sm}"
    card-muted:
        backgroundColor: "{colors.surface-muted}"
        border: "1px solid {colors.border}"
    card-elevated:
        shadow: "{elevation.lg}"

    modal:
        backgroundColor: "{colors.surface}"
        border: "1px solid {colors.border}"
        rounded: "{rounded.lg}"
        padding: 24px
        shadow: "{elevation.lg}"
        maxWidth: 420px
        backdrop: "color-mix(in srgb, {colors.neutral-900} 35%, transparent)"

    tab-trigger:
        fontFamily: "{typography.heading-family}"
        fontWeight: 700
        padding: 12px 20px
        borderBottom: "3px solid transparent"
        textColor: "{colors.ink-muted}"
    tab-trigger-active:
        textColor: "{colors.primary-600}"
        borderBottom: "3px solid {colors.primary-500}"

    navbar:
        backgroundColor: "{colors.surface}"
        border: "1px solid {colors.border}"
        shadow: "{elevation.sm}"
        height: auto
        padding: "16px 20px"
        position: sticky
        zIndex: 40

    room-card:
        backgroundColor: "{colors.surface}"
        border: "1px solid {colors.border}"
        rounded: "{rounded.md}"
        padding: 12px
        interaction: "hover:bg-surface-muted"

    leaderboard:
        backgroundColor: "{colors.surface}"
        border: "1px solid {colors.border}"
        rounded: "{rounded.lg}"
        padding: 16px

    profile-card:
        backgroundColor: "{colors.surface-muted}"
        border: "1px solid {colors.border}"
        rounded: "{rounded.lg}"
        padding: 20px
        maxWidth: 360px

    game-mode-card:
        backgroundColor: "{colors.surface}"
        border: "1px solid {colors.border}"
        rounded: "{rounded.lg}"
        padding: 24px
        interaction: "hover:-translate-y-1 hover:shadow-md"

    match-card:
        backgroundColor: "{colors.surface}"
        border: "1px solid {colors.border}"
        rounded: "{rounded.lg}"
        padding: 16px

    # ── Game-Specific Components ──
    board:
        backgroundColor: "{colors.surface-muted}"
        padding: 8px
        rounded: "{rounded.lg}"
        shadow: "{elevation.sm}"
        gap: 4px
    board-cell:
        size: 44px
        backgroundColor: "{colors.primary-300}"
        border: "2px solid {colors.primary-400}"
        rounded: "{rounded.md}"
        shadow: "0 3px 0 {colors.primary-500}"
        fontFamily: "{typography.heading-family}"
        fontWeight: 800
        textColor: "{colors.neutral-900}"
    board-cell-revealed:
        backgroundColor: "{colors.surface}"
        border: "1px solid {colors.border}"
        shadow: none
        textColor: "{colors.ink-muted}"
    board-cell-safe:
        backgroundColor: "{colors.success-soft}"
        border: "1px solid {colors.success}"
        textColor: "{colors.success}"
    board-cell-flagged:
        backgroundColor: "{colors.accent-100}"
        border: "1px solid {colors.accent-400}"
    board-cell-mine:
        backgroundColor: "{colors.error}"
        border: "1px solid {colors.error}"
        textColor: "{colors.surface}"

    mascot:
        size: 80px
        animation: "bob 2.4s var(--ease-standard) infinite"
    mascot-exploded:
        backgroundColor: "{colors.error}"

    ping-chip:
        backgroundColor: "{colors.surface}"
        border: "1.5px solid {colors.border}"
        rounded: "{rounded.full}"
        padding: "8px 16px"
        fontFamily: "{typography.heading-family}"
        fontWeight: 700
        textColor: "{colors.ink}"
        iconSize: 18px
        interaction: "hover:-translate-y-0.5 hover:scale-104 active:scale-94"

    banner-win:
        background: "linear-gradient(135deg, {colors.success-soft}, {colors.accent-100})"
        border: "2px solid {colors.success}"
        rounded: "{rounded.lg}"
        padding: "32px 24px"
        shadow: "{elevation.lg}"
    banner-lose:
        background: "linear-gradient(135deg, {colors.error-soft}, {colors.primary-100})"
        border: "2px solid {colors.primary-400}"
        rounded: "{rounded.lg}"
        padding: "32px 24px"
        shadow: "{elevation.lg}"

    fx-boom:
        size: 120px
        core: "radial-gradient(circle, {colors.accent-300}, {colors.error})"
        coreSize: 40px
        particleSize: 16px

    fx-confetti:
        height: 120px
        rounded: "{rounded.lg}"
        backgroundColor: "{colors.surface-muted}"
---

## Overview

Minado.gg is a **multiplayer minesweeper social game** built on two brand archetypes: **Jester** (playful, fun, party energy) and **Everyman** (approachable, inclusive, social). The design language is **flat, colorful, and bouncy** — no decorative gradients, no heavy shadows, just friendly rounded shapes with purposeful micro-interactions. The green primary color references the classic minesweeper field, purple adds social/premium depth, and gold marks rewards and achievements. Typography mixes a bold display font (Baloo 2) with a casual body font (Comic Neue) to create a "game night with friends" atmosphere.

**Key Characteristics:**

- Flat, playful, colorful — the minesweeper field green is the hero.
- Two font pairing: **Baloo 2** (headings, bold, extra-bold) + **Comic Neue** (body, casual).
- Generous rounding everywhere: `8px` (sm) → `14px` (md) → `22px` (lg) → `999px` (full/pill).
- Three-tier color system: green primary (field) + purple secondary (social/ranking) + gold accent (rewards/confetti).
- Bouncy micro-interactions: `cubic-bezier(0.34, 1.56, 0.64, 1)` bounce easing, hover lifts, press scale.
- Full dark mode support with lightened brand colors for >=4.5:1 contrast on dark surfaces.
- Semantic feedback colors (success/warning/error/info) with soft variants for backgrounds.
- Game-specific components: board cells with 3D "pop" effect, mascot with states, win/lose banners, FX particles, ping chips.

## Colors

### Brand Palettes

#### Primary — Verde Campo (Minesweeper Field)

The dominant brand color. References the classic green minesweeper grid. Used for primary actions, board cells, focus rings, and interactive elements.

| Token | Hex | Use |
|-------|-----|-----|
| `primary-50` | `#ECFDF3` | Lightest tint, hover backgrounds |
| `primary-100` | `#D1FADF` | Badge backgrounds, soft surfaces |
| `primary-200` | `#A6F4C5` | Cell hover states |
| `primary-300` | `#6CE9A6` | Default board cell fill |
| `primary-400` | `#32D583` | Avatar borders, board cell borders |
| `primary-500` | `#16A34A` | Primary button fill, focus ring, board cell shadow |
| `primary-600` | `#128A43` | Primary button hover, active tab text |
| `primary-700` | `#0E6B36` | Badge text, dark cell number-2 |
| `primary-800` | `#0C552B` | Cell number-8, deep text |
| `primary-900` | `#0A4523` | Deepest accent, rarely used |

#### Secondary — Purple

Social and premium feel. Used for ranking badges, profile elements, cooperative mode, and secondary actions.

| Token | Hex | Use |
|-------|-----|-----|
| `secondary-50` | `#F5F3FF` | Lightest purple tint |
| `secondary-100` | `#EDE9FE` | Badge backgrounds |
| `secondary-200` | `#DDD6FE` | Subtle purple surfaces |
| `secondary-300` | `#C4B5FD` | Light purple accents |
| `secondary-400` | `#A78BFA` | Secondary button hover |
| `secondary-500` | `#8B5CF6` | Secondary button fill, avatar default bg |
| `secondary-600` | `#7C3AED` | Cell number-4, secondary button hover |
| `secondary-700` | `#6D28D9` | Badge text |
| `secondary-800` | `#5B21B6` | Deep purple |
| `secondary-900` | `#4C1D95` | Deepest purple |

#### Accent — Reward Gold

Confetti, rewards, achievement highlights, flagged cells. The "celebration" color.

| Token | Hex | Use |
|-------|-----|-----|
| `accent-50` | `#FFFBEB` | Lightest gold tint |
| `accent-100` | `#FEF3C7` | Flagged cell background, banner win gradient |
| `accent-200` | `#FDE68A` | Light gold accents |
| `accent-300` | `#FCD34D` | Boom FX core gradient |
| `accent-400` | `#FBBF24` | Bomb mascot border, accent button hover |
| `accent-500` | `#F59E0B` | Accent button fill, mascot fuse spark |
| `accent-600` | `#D97706` | Cell number-5, accent button hover |
| `accent-700` | `#B45309` | Cell number-6 |
| `accent-800` | `#92400E` | Badge text |
| `accent-900` | `#78350F` | Deepest gold |

#### Neutral — Slate

UI chrome, text, borders, backgrounds. Cool gray that stays out of the way.

| Token | Hex | Use |
|-------|-----|-----|
| `neutral-50` | `#F8FAFC` | Page background (light), input background |
| `neutral-100` | `#F1F5F9` | Surface-muted, board background |
| `neutral-200` | `#E2E8F0` | Borders, dividers |
| `neutral-300` | `#CBD5E1` | Light borders |
| `neutral-400` | `#94A3B8` | Muted text |
| `neutral-500` | `#64748B` | Secondary text, placeholder text |
| `neutral-600` | `#475569` | Medium text |
| `neutral-700` | `#334155` | Cell number-7, dark mode borders |
| `neutral-800` | `#1E293B` | Bomb mascot body, dark mode surface |
| `neutral-900` | `#0F172A` | Primary text (ink), page background (dark), dark mode page bg |

### Semantic Colors

| Token | Hex | Soft Variant | Use |
|-------|-----|--------------|-----|
| `success` | `#22C55E` | `#DCFCE7` | Win states, safe cells, online badges, cooperative mode |
| `warning` | `#F59E0B` | `#FEF3C7` | Caution, fog-of-war mode, offline badges |
| `error` | `#EF4444` | `#FEE2E2` | Mine hits, explosions, danger mode, loss states |
| `error-600` | `#DC2626` | — | Cell number-3, stronger error |
| `error-700` | `#B91C1C` | — | Deepest error |
| `info` | `#3B82F6` | `#DBEAFE` | Cell number-1, informational |

### Surface / Background (Light Mode)

| Token | Hex | Use |
|-------|-----|-----|
| `bg` | `#F8FAFC` | Page background |
| `surface` | `#FFFFFF` | Cards, modals, inputs, navbar |
| `surface-muted` | `#F1F5F9` | Muted card variants, board background, profile stats |
| `input` | `#F8FAFC` | Input field fill |
| `border` | `#E2E8F0` | All borders |
| `ink` | `#0F172A` | Primary text color |
| `ink-muted` | `#64748B` | Secondary text, placeholder, helper text |
| `ring` | `#16A34A` | Focus ring color |
| `scrim` | `color-mix(in srgb, #0F172A 55%, transparent)` | Modal backdrop |

### Chart / Data Palette

5 distinct hues for leaderboards, stats, and data visualization.

| Token | Hex | Use |
|-------|-----|-----|
| `chart-1` | `#16A34A` | Green — primary data |
| `chart-2` | `#8B5CF6` | Purple — secondary data |
| `chart-3` | `#F59E0B` | Gold — tertiary data |
| `chart-4` | `#3B82F6` | Blue — quaternary data |
| `chart-5` | `#06B6D4` | Cyan — quinary data |

### Dark Mode

Dark mode uses a warm purple-black base (`#0F172A` bg, `#1E293B` surface). Brand colors are lightened for >=4.5:1 contrast on dark surfaces. The primary green inverts its scale (50 becomes darkest, 900 becomes lightest). Controlled via `.dark` class on `<html>`.

| Token | Dark Value | Use |
|-------|------------|-----|
| `dark-bg` | `#0F172A` | Page background |
| `dark-surface` | `#1E293B` | Cards, modals, navbar |
| `dark-surface-muted` | `#243042` | Muted variants, inputs |
| `dark-border` | `#334155` | All borders |
| `dark-ink` | `#F8FAFC` | Primary text |
| `dark-ink-muted` | `#94A3B8` | Secondary text |
| `dark-ring` | `#4ADE80` | Focus ring |

## Typography

### Font Families

- **Display / Headings**: `"Baloo 2", system-ui, sans-serif` — bold, rounded, playful. Weights 700 (bold) and 800 (extra-bold). Used for all headings, card titles, badge labels, button text, board cells, mascot, banners.
- **Body / UI**: `"Comic Neue", system-ui, sans-serif` — casual, approachable, readable. Weight 400 (regular). Used for body copy, helper text, captions, input text, small labels.

### Font Weights

| Token | Value | Use |
|-------|-------|-----|
| `weight-light` | 300 | Rare — reserved for airy moments |
| `weight-regular` | 400 | Body copy, captions |
| `weight-medium` | 600 | Strong emphasis, nav links |
| `weight-bold` | 700 | Card titles, buttons, badges, tabs |
| `weight-extra` | 800 | Headings (h1–h3), board cells, banner titles |

### Type Scale

| Token | Size | Weight | Font | Use |
|-------|------|--------|------|-----|
| `h1` | 48px | 800 | Baloo 2 | Page hero titles |
| `h2` | 36px | 800 | Baloo 2 | Section headings, banner titles |
| `h3` | 28px | 800 | Baloo 2 | Page headings, leaderboard title |
| `h4` | 22px | 700 | Baloo 2 | Card titles, modal titles |
| `h5` | 18px | 700 | Baloo 2 | Sub-card titles, stat values |
| `h6` | 16px | 700 | Baloo 2 | Small headings |
| `lead` | 20px | 400 | Comic Neue | Introductory paragraphs |
| `body` | 16px | 400 | Comic Neue | Default paragraph, input text |
| `small` | 13px | 400 | Comic Neue | Captions, helper text, timestamps |

### Principles

- **Baloo 2 for everything interactive.** Every heading, button, badge, and board cell uses the heading font. This keeps the playful brand voice consistent across all touchpoints.
- **Comic Neue for reading.** Body copy and long-form text use the casual body font to maintain the "game night" feel without sacrificing readability.
- **Weight 800 for big moments.** h1–h3 and board cell numbers use extra-bold for maximum visual punch. These are the "shout" moments.
- **Weight 700 for structure.** Card titles, buttons, badges, and tab triggers use bold to create hierarchy without overwhelming.
- **Weight 400 for calm.** Body text stays at regular weight. No medium (500) or semibold in body copy — the jump from 400 to 700 creates clear hierarchy.
- **Line-height 1.2 for headings, 1.6 for body.** Tight headings feel punchy; relaxed body text feels casual and readable.

## Layout

### Spacing System

- **Base unit:** 4px. All spacing values are multiples of 4.
- **Tokens:** `1` 4px · `2` 8px · `3` 12px · `4` 16px · `5` 20px · `6` 24px · `7` 28px · `8` 32px · `9` 36px · `10` 40px · `11` 44px · `12` 48px · `16` 64px · `20` 80px · `24` 96px.
- **Component padding:** Cards use 24px (`spacing-6`). Modal uses 24px. Navbar uses 16px vertical, 20px horizontal.
- **Board cell gap:** 4px (`spacing-1`). Board padding: 8px (`spacing-2`).
- **Button padding:** 8px/16px (sm), 12px/24px (md), 16px/32px (lg).

### Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `sm` | 8px | Tab trigger top corners, small elements |
| `md` | 14px | Input fields, board cells, room cards, profile stats |
| `lg` | 22px | Cards, modals, board, banners, leaderboard |
| `xl` | 30px | Reserved for large containers |
| `full` | 999px | Buttons (pill), badges, avatars, pings |

### Grid & Container

- **Max content width:** 1200px centered on styleguide pages.
- **Sidebar:** 230px fixed, sticky at top 80px.
- **Card grid:** `repeat(auto-fit, minmax(250px, 1fr))` for responsive card layouts.
- **Board:** CSS Grid with `grid-template-columns: repeat(var(--board-cols, 8), 1fr)`. Cells are 44px × 44px.
- **Gaps:** 4px (board), 8px (tab triggers), 12px (badge groups), 16px (card grids), 24px (section spacing).

## Elevation & Depth

| Level | Treatment | Use |
|-------|-----------|-----|
| `sm` | `0 2px 6px rgba(15, 23, 42, 0.08)` | Cards, buttons, navbar, board |
| `md` | `0 8px 22px rgba(15, 23, 42, 0.12)` | Hover states, elevated cards |
| `lg` | `0 18px 44px rgba(15, 23, 42, 0.16)` | Modals, elevated card variant, banners |

**Shadow philosophy.** Shadows are subtle and functional — they lift interactive elements off the surface without creating visual noise. The board cell has a unique `0 3px 0` colored shadow that creates a 3D "pop" effect, reinforcing the tactile feel of clicking cells.

## Shapes

### Board Cell Geometry

Board cells are the signature visual element: 44px × 44px squares with `14px` rounding, a `2px` solid border, and a `3px` colored box-shadow below that creates a raised/3D effect. On hover, cells lift 3px up (`translateY(-3px)`) and lighten. On press, they push down 1px and the shadow compresses. Revealed cells lose the shadow and become flat. This tactile language makes the board feel like physical buttons you can press.

### Button Shape

All buttons use `rounded-full` (pill shape). This is the signature Minado action signal — every clickable action is a pill. Active state uses `scale(0.96)` for a bouncy press effect.

### Avatar Shape

Always `rounded-full` (circle). 3px solid border in primary-400 (default) or accent-400 (bomb variant).

## Components

### Atomic UI Components

#### Button

Pill-shaped (`rounded-full`) with 5 variants: `primary` (green), `secondary` (purple), `accent` (gold), `ghost` (transparent), `danger` (red). Three sizes: sm (13px text, 8/16 padding), md (16px, 12/24), lg (18px, 16/32). Hover lifts 1px (`-translate-y-px`), active scales to 96%. Loading state shows a spinning border. Focus uses a double-ring: 3px surface + 5px ring color. Disabled state at 50% opacity.

#### Input

1.5px border, `14px` rounding, `16px` font, 12/16 padding. Background `input` color. Focus ring: 3px ring color at 35% opacity. Error state: border switches to `error`, focus ring to `error-soft`. Helper text below in `small` size.

#### Label

14px, weight 600, body font, `ink` color. Used above inputs with 8px gap.

#### Badge

Pill-shaped (`rounded-full`) label chips. 6 variants matching semantic colors. Weight 700, heading font. Two sizes: sm (11px, 4/8 padding) and md (13px, 4/12 padding).

#### Avatar

Circular with 3px solid border. Three sizes: sm (32px), md (44px), lg (64px). Two variants: `default` (purple bg, white text) and `bomb` (dark bg, gold border, white text). Shows initials when no image.

#### Card

`22px` rounded, 24px padding, 1px border. Three variants: `default` (white bg), `muted` (surface-muted bg), `elevated` (lg shadow). Sub-components: `CardHeader`, `CardTitle` (h5, weight 800), `CardContent` (ink-muted text).

#### Modal

Uses native `<dialog>` with `showModal()`. 22px rounded, max-width 420px, 24px padding, lg shadow. Backdrop: neutral-900 at 35% opacity. `ModalActions` row for button groups (flex, end-aligned, 12px gap).

#### Tabs

Tab triggers: weight 700, 12/20 padding, 3px bottom border (transparent by default, primary-500 when active). Active tab text turns primary-600. Content panels render only when active.

#### Switch

Referenced in codebase (not shown in styleguide) — toggle component for settings.

#### Alert

Referenced in codebase — notification component for system messages.

### Composed Blocks

#### Navbar

Sticky top header. White surface bg, 1px bottom border, sm shadow. Left: brand name "Minado.gg" in primary-600 h5 weight-800 + tagline in small muted text. Right: nav links (Lobby, Ranking, Styleguide) in weight-700 with primary-600 hover, theme toggle, and avatar/login button.

#### PlayerRoster

List of players in a room. Each row: avatar (sm) + username (weight-700) + score (small muted) + ready/host badges. Uses the card component as container.

#### ChatPanel

Chat messages in a room. Messages: sender name (weight-700) + text + timestamp (small muted). System messages in muted style. Input field at bottom for new messages.

#### RoomCard

Compact room preview. Left: room name (weight-700) + private badge + mode badge + difficulty text. Right: stacked avatars (sm, -2px overlap) + player count. Rounded 14px, hover changes to surface-muted.

#### Leaderboard

Ranked player list. Each row: rank badge (accent for #1, secondary for #2, primary for #3) + avatar (sm) + username (weight-700) + score (small muted). Container: 22px rounded card.

#### ProfileCard

Player profile summary. Avatar (lg) + username (weight-700) + online/offline badge. Separator line. Three stat boxes: wins, streak, rank — each in a muted rounded box with h5 value + small label.

#### GameModeCard / ModeGrid

Game mode selector. Icon + title (weight-700) + description. Grid layout, 22px rounded cards with hover lift. Four modes: Competitivo, Vários Tabuleiros, Cooperativo, Battle Royale.

#### MatchCard

Active match display. Two teams with avatar stacks, match status badge, progress bar.

### Game-Specific Components

#### Board

CSS Grid container with `surface-muted` background, 8px padding, 22px rounding, sm shadow. Gap: 4px. Columns controlled by `--board-cols` CSS variable (default 8).

#### Board Cell

44px × 44px. Default: `primary-300` fill, `primary-400` border, `0 3px 0 primary-500` shadow (3D pop). Hover: lifts 3px, lightens to `primary-200`. Press: pushes down 1px, shadow compresses. Revealed: flat, surface bg, border, no shadow. States: safe (green-soft), flagged (accent-100), mine (error bg). Numbers 1–8 each have a distinct color for quick recognition.

#### Mascote

SVG bomb character with two states: `happy` (idle bob animation, 2.4s loop, slight rotation) and `exploded` (red body, sad face, scale pop animation). Pure CSS + SVG, no external assets.

#### Banner

Full-width win/lose announcements. Win: green-to-gold gradient, success border. Lose: error-to-primary gradient, primary border. Both: 22px rounding, lg shadow, centered emoji + h2 title + body subtitle. Tone is celebratory even on loss ("zoeiro" — playful teasing).

#### PingRow

Quick-reaction chips for in-game communication. Pill-shaped with icon + label. Default reactions: Haha (gold), Oops (red), GG (green), Coração (purple). Each chip: surface bg, 1.5px border, full rounding, weight-700. Hover lifts and scales.

#### FX — Boom

120px × 120px container. Core: 40px circle with radial gradient (accent-300 → error). 6 particles (16px squares) in brand colors that burst outward on activation. Uses `--duration-slow` (420ms) with bounce easing.

#### FX — Confetti

120px tall overflow-hidden container. 6 confetti pieces (12px × 16px, 3px rounding) in chart palette colors. Fall animation with staggered delays (0–0.5s). Infinite loop when active.

#### FX — Screen Shake

Applied to parent container. 500ms shake animation: alternating translate offsets (-6px/3px, 6px/-3px, -4px/-2px, 4px/2px).

## Motion

### Timing

| Token | Value | Use |
|-------|-------|-----|
| `duration-fast` | 140ms | Micro-interactions: cell hover, button press, ping hover |
| `duration-base` | 220ms | Standard transitions: color changes, border updates, tab switches |
| `duration-slow` | 420ms | Dramatic moments: boom explosion, confetti fall, mascot pop |

### Easing

| Token | Value | Use |
|-------|-------|-----|
| `ease-bounce` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Button press, cell pop, mascot bounce, hover lift |
| `ease-standard` | `cubic-bezier(0.22, 1, 0.36, 1)` | Color transitions, border changes, general movement |

### Key Animations

- **Bob** (mascot idle): `translateY(0→-6px→0)` + `rotate(-2deg→2deg→-2deg)` over 2.4s, standard easing, infinite.
- **Explode Pop** (mascot death): `scale(0.6→1.25→1)` over 420ms, bounce easing.
- **Mine Pop** (cell reveal): `scale(0.7→1.15→1)` over 220ms, bounce easing.
- **Boom Core**: `scale(0.3→1.4→1)` + `rotate(0→20deg→0)` over 420ms, bounce easing.
- **Boom Particles**: Translate outward + fade + rotate 180° over 420ms, standard easing.
- **Confetti Fall**: `translateY(0→130px)` + `rotate(0→360deg)` + fade, 1.6s, standard easing, staggered delays.
- **Screen Shake**: Alternating translate offsets over 500ms, standard easing.

### Reduced Motion

`prefers-reduced-motion: reduce` disables all animations and transitions. Mascot bob stops. All durations set to 0.001ms. Scroll behavior set to auto.

## Do's and Don'ts

### Do

- Use `{colors.primary-500}` (green) for every primary interactive element — buttons, focus rings, active states, board cells. Green IS Minado.
- Use `{rounded.full}` (pill) for all buttons and badges — the pill shape is the signature action grammar.
- Use `{typography.heading-family}` (Baloo 2) for all headings, buttons, badges, and interactive labels.
- Use bounce easing (`ease-bounce`) for hover/press interactions — it creates the playful, bouncy feel.
- Alternate surface colors (white ↔ surface-muted) to create section rhythm without borders.
- Use `{colors.accent-500}` (gold) for rewards, confetti, and celebration moments.
- Keep board cells at exactly 44px × 44px with 14px rounding — the 3D pop effect is the signature game interaction.
- Respect `prefers-reduced-motion` — all animations must gracefully degrade.
- Use soft color variants (`success-soft`, `error-soft`) for backgrounds; save full saturation for text and borders.

### Don't

- Don't use decorative gradients as backgrounds — atmosphere comes from the color system and photography.
- Don't add shadows to text — elevation is for surfaces and interactive elements only.
- Don't use Comic Neue for headings — the casual body font loses punch at display sizes.
- Don't mix rounding grammars — pills for buttons/badges, 14px for inputs/cells, 22px for cards/modals.
- Don't use `primary-500` green on dark surfaces without lightening — use `dark-primary-400` or `dark-primary-500` instead.
- Don't make loss states feel punitive — the banner tone is "zoeiro" (playful teasing), not shameful.
- Don't skip the 3D shadow on board cells — the `0 3px 0` colored shadow IS the tactile game feel.
- Don't use weight 500 or 600 for body copy — body stays at 400, headings jump to 700/800.

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile | ≤ 640px | Single column, navbar collapses links, board cells scale down, sidebar hidden |
| Tablet | 641–1024px | Two-column layouts, sidebar visible, card grids 2-col |
| Desktop | ≥ 1025px | Full layout, 3-col card grids, 1200px max-width centered |

### Touch Targets

- Minimum 44px × 44px for all interactive elements.
- Board cells are exactly 44px × 44px — touch-optimized by default.
- Buttons in sm size: ~36px height (with padding) — acceptable for secondary actions.
- Ping chips: ~36px height — acceptable for quick reactions during gameplay.

### Collapsing Strategy

- **Navbar**: horizontal links on desktop → hamburger menu on mobile (≤640px).
- **Sidebar** (styleguide): visible on desktop, hidden on mobile (max-lg:hidden).
- **Card grids**: 3-col → 2-col → 1-col via `auto-fit` with `minmax()`.
- **Board**: scales via CSS custom property `--board-cols`, cells maintain 44px.
- **Hero typography**: scales proportionally via CSS variables (h1 at 48px desktop, smaller on mobile via responsive classes).

## Iteration Guide

1. Focus on ONE component at a time. Reference its component key directly (`{components.button-primary}`, `{components.board-cell}`).
2. Use `{token.refs}` everywhere — never inline hex values.
3. The three brand colors (green/purple/gold) each have a clear job: green = field/actions, purple = social/ranking, gold = rewards/celebration. Don't cross the streams.
4. Bouncy interactions are non-negotiable — `ease-bounce` on hover/press is part of the brand personality.
5. Board cells are the most important visual element — get the 3D pop effect right and the whole game feels right.
6. Dark mode must work — test every component in both light and dark before shipping.
7. The lose banner tone is "zoeiro" (playful teasing), not punitive. Copy and visuals should feel fun even on defeat.

## Known Gaps

- Form validation and error states need expansion — only basic error styling exists on Input.
- Switch component exists but is not documented in the styleguide.
- Alert component exists but is not documented in the styleguide.
- Board cell right-click (flag) interaction needs visual documentation.
- Chat input and message composition UI needs full specification.
- Mobile hamburger menu animation and layout not documented.
- Sound/haptic feedback tokens not defined (game feel extends beyond visual).
- Custom cursor states for different game modes not documented.
- Achievement and mission UI components not yet designed.
- Replay viewer interface not designed.
