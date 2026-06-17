# SentinelMind Design System

## Color Strategy: Restrained
One accent (indigo) at under 10%. Everything else is zinc neutrals tinted slightly warm.

## Colors

### Backgrounds
- `--bg-root`: #0a0a0a (page background)
- `--bg-surface`: #141414 (cards, panels)
- `--bg-elevated`: #1a1a1a (hover states, active items)
- `--bg-overlay`: #1f1f1f (modals, dropdowns)

### Text
- `--text-primary`: #fafafa (zinc-50, headings and primary content)
- `--text-secondary`: #a1a1aa (zinc-400, labels and supporting text)
- `--text-tertiary`: #71717a (zinc-500, timestamps, metadata)
- `--text-muted`: #52525b (zinc-600, disabled states)

### Accent
- `--accent`: #6366f1 (indigo-500, interactive elements)
- `--accent-hover`: #818cf8 (indigo-400, hover)
- `--accent-subtle`: rgba(99, 102, 241, 0.1) (indigo backgrounds)

### Semantic
- `--success`: #22c55e (contained, resolved)
- `--danger`: #ef4444 (critical alerts, active threats)
- `--warning`: #f59e0b (amber, timeouts, medium severity)
- `--info`: #6366f1 (same as accent)

### Borders
- `--border`: rgba(255, 255, 255, 0.06)
- `--border-active`: rgba(255, 255, 255, 0.12)

## Typography

### Families
- UI: Inter (weights 400, 500, 600)
- Data: JetBrains Mono (weights 400, 500)

### Scale
- `--text-xs`: 11px / Inter 500 uppercase tracking-wide (labels)
- `--text-sm`: 12px (metadata, timestamps)
- `--text-base`: 13px (body, descriptions)
- `--text-lg`: 14px (section headings)
- `--text-xl`: 18px (page titles)
- `--text-stat`: 28px / JetBrains Mono 500 (stat card values)

### Rules
- All machine-generated data (IPs, scores, timestamps, IDs, percentages) in JetBrains Mono
- All UI labels, headings, descriptions in Inter
- Never mix them within the same semantic role

## Spacing
8px base grid. Multiples: 4, 8, 12, 16, 24, 32, 48.

## Borders
- Radius: 6px for small elements, 8px for cards. Never more than 8px.
- Width: 1px only. Never thicker accent borders.
- Color: rgba(255,255,255,0.06) default.

## Elevation
No box-shadows. Layer through background color differences only.
- Root: #0a0a0a
- Surface: #141414
- Elevated: #1a1a1a

## Motion
- Duration: 150ms for micro-interactions, 200ms for state changes, 400ms for overlays
- Easing: cubic-bezier(0.16, 1, 0.3, 1) (ease-out-expo)
- Never animate layout properties. Transform and opacity only.
- prefers-reduced-motion: disable all non-essential animation

## Components

### Status badges
Small pill shapes. Background color at 10% opacity, text in full color.
- IDLE: zinc-600 text, no background
- RUNNING: indigo text, indigo/10 background
- COMPLETE: green text, green/10 background
- CRITICAL: red text, red/10 background
- TIMEOUT: amber text, amber/10 background

### Stat cards
No borders. Background: var(--bg-surface). Label in --text-xs style (uppercase, zinc-400). Value in --text-stat style (JetBrains Mono). Optional sub-text in --text-sm zinc-500.

### Sidebar
Fixed 240px. Background: var(--bg-root). Items: 13px Inter 500. Active item: indigo text + rgba(99,102,241,0.08) background. Hover: rgba(255,255,255,0.04).
