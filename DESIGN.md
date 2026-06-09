---
name: League Flow
description: Clean and professional sports tournament management system
colors:
  primary: "#00C49A"
  neutral-bg: "#ffffff"
  neutral-fg: "#252525"
  muted: "#f7f7f7"
  border: "#ebebeb"
typography:
  display:
    fontFamily: "Geist, var(--font-noto-sans-thai), sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.5rem)"
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: "-0.04em"
  body:
    fontFamily: "Geist, var(--font-noto-sans-thai), sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "8px"
  md: "10px"
  lg: "12px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "#00a380"
---

# Design System: League Flow

## 1. Overview

**Creative North Star: "The Modern Athletic Arena"**

League Flow is designed for professional sports tournament managers. The interface is clean, professional, and easy to use, ensuring that organizers can manage complex brackets and schedules without high cognitive load. It explicitly rejects cluttered 2000s-style tables and overly aggressive, flashing gaming themes.

**Key Characteristics:**
- High readability and crisp contrast for outdoor/on-field usage.
- Progressive disclosure of complex bracket structures and node configurations.
- Minimal decoration: depth and hierarchy are driven by functional spacing and borders, not heavy shadows.

## 2. Colors

The color palette is anchored by a professional athletic green/teal primary accent, set against high-contrast off-whites and dark grays.

### Primary
- **Athletic Teal** (#00C49A / oklch(0.73 0.16 167)): The brand's signature accent. Used sparingly for primary buttons, active states, and highlights.

### Neutral
- **Background** (#ffffff / oklch(1 0 0)): Pure white surface for maximum clarity and contrast.
- **Foreground** (#252525 / oklch(0.145 0 0)): Dark ink color for text to ensure high readability.
- **Muted** (#f7f7f7 / oklch(0.97 0 0)): Soft background fills for panels and secondary controls.
- **Border** (#ebebeb / oklch(0.922 0 0)): Thin borders for separating sections and cells.

### Named Rules
**The 10% Accent Rule.** The primary Athletic Teal color must not cover more than 10% of any screen. It is an accent to draw attention, not a background fill.

## 3. Typography

**Display Font:** Geist (with system fallback)
**Body Font:** Noto Sans Thai (with system fallback)

### Hierarchy
- **Display** (900, clamp(2rem, 5vw, 3.5rem), 1.1): Used for page titles and large heroes.
- **Headline** (800, 24px, 1.2): Used for sections.
- **Title** (600, 18px, 1.3): Used for cards and sub-sections.
- **Body** (400, 14px, 1.5): Used for general reading and form labels. Max line length capped at 70ch.
- **Label** (500, 12px, 1.2): Used for helper text, statuses, and badges.

## 4. Elevation

League Flow uses a flat-by-default visual strategy. Hierarchy is conveyed through subtle borders, background fills, and clean spacing rather than layers of drop shadows.

### Shadow Vocabulary
- **Interactive Hover** (0 4px 12px oklch(0 0 0 / 5%)): A very soft shadow used on hover for interactive cards.

### Named Rules
**The Flat Canvas Rule.** Surfaces must remain flat and inline. Shadows are only allowed on active, floating elements like tooltips, popovers, and dropdown menus.

## 5. Components

### Buttons
- **Shape:** Rounded corners (8px radius)
- **Primary:** Athletic Teal background with white text.
- **Hover:** Darkened teal background transition.

### Cards / Containers
- **Corner Style:** Rounded corners (12px radius)
- **Background:** Pure white in light mode, dark gray in dark mode.
- **Border:** Thin light-gray border (1px).

### Inputs / Fields
- **Style:** Clean border with rounded corners (8px radius).
- **Focus:** Highlighted with a ring of primary color.

## 6. Do's and Don'ts

### Do:
- **Do** use Athletic Teal strictly for interactive highlights and primary call-to-actions.
- **Do** ensure all text contrast hits at least WCAG AA standards.
- **Do** use responsive flex/grid layouts to accommodate managers using tablets and mobile phones on-site.

### Don't:
- **Don't** use neon, glowing gradients or loud cyberpunk visuals.
- **Don't** use dense, unpadded tables that look like raw spreadsheets.
- **Don't** use heavy drop shadows on static boxes.
