# Evolv UI Design System & Architecture

This document describes the design system tokens, layout blueprints, and visual components defining Evolv's **Terminal-Cyber Design System** (cyber-brutalist aesthetic).

---

## 1. Visual Theme & Philosophy

Evolv adopts a **Brutalist / Cyber-Terminal** design theme. The core philosophy centers on high contrast, strict structural lines, monospace status readouts, and vibrant functional color accents on a dark grid backdrop:

- **Monospace Priority**: System statuses, parameters, and time slots use monospaced fonts to evoke a compiler output feed.
- **Flat Surfaces & Sharp Corners**: Avoid rounded corners (`rounded-none`) and soft shadows. Structural separation relies on precise, thin borders (`border-[var(--color-outline-variant)]`).
- **Interactive Micro-animations**: Subtle transitions (e.g. `press-scale`, `glow-card`, and `fade-up` line expansions) denote premium physical/tactile reactivity.

---

## 2. Color Palette Tokens

Evolv supports a dark mode theme (default) and a clean light mode theme. Colors are declared as CSS custom variables in the root namespace:

```css
@theme {
  /* System Core Backgrounds */
  --color-background: #0e0e12;
  --color-surface-dim: #0e0e12;
  --color-surface: #121216;
  --color-surface-container-lowest: #09090c;
  --color-surface-container-low: #16161a;
  --color-surface-container: #1a1a1f;
  --color-surface-container-high: #282a30;
  --color-surface-container-highest: #33343a;

  /* Accent Highlight Scales */
  --color-primary: #d2bbff;                  /* Violet (System primary highlight) */
  --color-secondary: #5adace;                /* Teal (Secondary highlight/success) */
  --color-error: #ffb4ab;                    /* Coral/Red (Urgent/Errors/High Priority) */
  --color-outline: #6e6878;                  /* Muted Gray (Borders and subtext) */
  --color-outline-variant: #3a3640;          /* Darker Muted Gray (Gridlines) */
}
```

---

## 3. Typography Hierarchy

The system maps readable typography across two font families:
- **Headings & Body**: *Outfit* (contemporary sans-serif) for smooth, modern reading.
- **Data Labels & Stats**: *JetBrains Mono* (highly legible monospace) for numbers, categories, statuses, and badges.

### Typographic Utility Classes
* **`.text-label-sm`**: `font-size: 11px; letter-spacing: 0.12em; font-family: monospace;` (Used for metadata tags, headers, ETAs).
* **`.text-display-lg`**: `font-size: 40px; font-weight: 700;` (Used for analytics and hero counts).
* **`.text-title-md`**: `font-size: 18px; font-weight: 600;` (Used for sidebar cards).
* **`.text-body-md`**: `font-size: 14px; line-height: 1.5;` (Used for standard body description text).

---

## 4. Primary UI Components

### 4.1. Flat Brutalist Panel (`.panel`)
Replaces traditional rounded container designs. Rendered with a solid dark grey base and a sharp, thin border.
```html
<div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-6">
  <!-- Content -->
</div>
```

### 4.2. Priority Badge
Uses monospace font styling and borders matching the task's corresponding priority index:
- **P0 (High)**: Coral text (`--color-error`), 10% opacity coral background.
- **P1 (Medium)**: Teal text (`--color-secondary`), 10% opacity teal background.
- **P2 (Low)**: Gray text (`--color-outline`), 10% opacity gray background.

---

## 5. Page Layout Blueprints

### 5.1. Priority Queue: 2x2 Eisenhower Matrix
The Eisenhower prioritize view partitions tasks inside a rigid 2-column, 2-row grid.
- **Layout Grid**: `grid grid-cols-1 lg:grid-cols-2 gap-6`
- **Dynamic Action**: Dragging, updating, or toggling properties instantly slides the row to its new quadrant container via client-side state hooks.

```
+---------------------------------------+---------------------------------------+
|  Q1: URGENT & IMPORTANT (Red Accent)  |  Q2: IMPORTANT, NOT URGENT (Teal)     |
|  "Do First"                           |  "Plan & Schedule"                    |
+---------------------------------------+---------------------------------------+
|  Q3: URGENT, NOT IMPORTANT (Violet)   |  Q4: NOT URGENT / IMPORTANT (Gray)    |
|  "Delegate / Fast-track"              |  "Eliminate / Postpone"               |
+---------------------------------------+---------------------------------------+
```

### 5.2. Dashboard: Energy Check-in Widget
Designed as a compact interactive block on the right panel. It features a horizontal button scale for battery tracking:
- **Layout**: `flex gap-2`
- **Battery Scale**: Numbers `1` to `5`.
- **Accent Gradients**:
  - Button `1`: Coral Red (`hover:bg-red-500/20 text-red-500/50`)
  - Button `2`: Orange (`hover:bg-orange-500/20 text-orange-500/50`)
  - Button `3`: Yellow (`hover:bg-yellow-500/20 text-yellow-500/50`)
  - Button `4`: Teal Success (`hover:bg-teal-500/20 text-teal-500/50`)
  - Button `5`: Cyan Max (`hover:bg-cyan-500/20 text-cyan-500/50`)
