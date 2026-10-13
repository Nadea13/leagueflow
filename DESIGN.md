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
  default: "sm"
  sm: "6px"
  md: "8px"
  lg: "10px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
icons:
  micro: "size-4" # 16px (inputs, buttons, dropdowns, table rows, badges)
  medium: "size-6" # 24px (empty states, feature highlights, stat cards)
  large: "size-8" # 32px (brand logo, modal illustrations, prominent hero/auth icons)
components:
  card:
    backgroundColor: "bg-card"
    rounded: "{rounded.sm}"
    border: "1px solid {colors.border}"
  card-items:
    container: "single-card"
    backgroundColor: "bg-card"
    rounded: "{rounded.sm}"
    border: "1px solid {colors.border}"
    divider: "1px solid {colors.border}"
    dividerClass: "divide-y divide-border"
    itemPadding: "16px"
    itemPaddingClass: "p-4"
    actionIconSize: "icon-sm"
  table-header:
    backgroundColor: "bg-card"
    borderBottom: "1px solid {colors.border}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "#00a380"
  dialog:
    backgroundColor: "bg-card"
    rounded: "{rounded.sm}"
    border: "1px solid {colors.border}"
    header:
      padding: "16px"
      borderBottom: "1px solid {colors.border}"
      icon: false
    content:
      padding: "16px"
      backgroundColor: "transparent"
      spacing: "16px"
      header:
        component: "@/components/ui/header"
        level: 4
        icon: false
        marginBottom: "8px"
      avatar:
        shape: "circle"
        rounded: "full"
---

# Design System: League Flow

## 1. Overview

**Creative North Star: "The Modern Athletic Arena"**

League Flow is designed for professional sports tournament managers. The interface is clean, professional, and easy to use, ensuring that organizers can manage complex brackets and schedules without high cognitive load. It explicitly rejects cluttered 2000s-style tables and overly aggressive, flashing gaming themes.

**Key Characteristics:**
- High readability and crisp contrast for outdoor/on-field usage.
- Progressive disclosure of complex bracket structures and node configurations.
- Minimal decoration: depth and hierarchy are driven by functional spacing and borders, not heavy shadows.
- Cohesive single-card architecture with crisp, clean divider lines.

## 2. Colors

The color palette is anchored by a professional athletic green/teal primary accent, set against high-contrast off-whites and dark grays.

### Primary
- **Athletic Teal** (#00C49A / oklch(0.73 0.16 167)): The brand's signature accent. Used sparingly for primary buttons, active states, and highlights.

### Neutral
- **Background** (#ffffff / oklch(1 0 0)): Pure white surface for maximum clarity and contrast.
- **Card Background** (`bg-card`): Flat surface color for all cards, containers, and table headers.
- **Foreground** (#252525 / oklch(0.145 0 0)): Dark ink color for text to ensure high readability.
- **Muted** (#f7f7f7 / oklch(0.97 0 0)): Soft background fills for secondary elements and subtle hover states.
- **Border** (#ebebeb / oklch(0.922 0 0)): Thin borders for separating sections, rows, and cells.

### Named Rules
**The 10% Accent Rule.** The primary Athletic Teal color must not cover more than 10% of any screen. It is an accent to draw attention, not a background fill.

**The Unified Card & Header Color Rule.** Section headers, card headers, and table headers (`thead`, `th`) must share the exact same background color as the card (`bg-card`) rather than using contrasting fills.

## 3. Typography & Internationalization

**Display Font:** Geist (with system fallback)
**Body Font:** Noto Sans Thai (with system fallback)

### Single-Language Header Rule
- **Strict Active Language:** All section headers, card titles, and labels must be written strictly in the active language without bilingual parenthetical additions (e.g. use "ข้อมูลโปรไฟล์" for Thai, "Profile Information" for English; **never** use "ข้อมูลโปรไฟล์ (Profile Information)").

### Hierarchy
- **Display** (900, clamp(2rem, 5vw, 3.5rem), 1.1): Used for page titles and large heroes.
- **Headline** (800, 24px, 1.2): Used for sections.
- **Title** (600, 18px, 1.3): Used for cards and sub-sections.
- **Body** (400, 14px, 1.5): Used for general reading and form labels. Max line length capped at 70ch.
- **Label** (500, 12px, 1.2): Used for helper text, statuses, and badges.

## 4. Border Radius & Elevation

League Flow uses a flat-by-default visual strategy with a consistent, compact border radius.

### Border Radius
- **Default Radius:** `sm` (`rounded-sm` / 6px radius) across all components (cards, dialogs, inputs, buttons, tables, badges).
- **Subtle Radius:** `sm` prevents bulky/bubble-like elements and delivers a sharp, modern professional look.

### Elevation & Shadows
- **The Flat Canvas Rule:** Surfaces must remain flat and inline with a 1px border (`border-border`). Shadows are only allowed on active, floating elements like tooltips, popovers, and dropdown menus.
- **Interactive Hover:** Soft shadow (0 4px 12px oklch(0 0 0 / 5%)) or subtle background hover transition (`hover:bg-muted/30`).

## 5. Components

### Cards & Containers
- **Corner Style:** Default `rounded-sm` (6px radius).
- **Background:** `bg-card` in both light and dark mode.
- **Border:** Thin 1px border (`border-border`).
- **Single Card Layout Architecture:** When displaying related lists or multiple items (e.g. Connected Accounts, Setting sections, Player rosters), prefer a single unified card container with row dividers (`divide-y divide-border`) over multiple fragmented mini-cards.

### Card Items / List of Items / Feed Rows
- **Unified Single Card Pattern:** When displaying multiple items (cards/list items/feed rows), do **NOT** render them as separate floating cards/boxes with individual margins. Instead, combine them into a single unified parent card (`bg-card border border-border rounded-sm overflow-hidden shadow-xs`) and separate each item using divider lines (`divide-y divide-border`).
- **Item Row Structure & Padding:** Each row/item within the card must have strictly `p-4` padding (16px), smooth hover states (`hover:bg-muted/30 transition-colors`), and clean inline alignments.
- **Feed & Card Hover Rule:** When hovering over interactive rows/cards in feeds or inboxes (`bg-card`), they must use `hover:bg-muted/30` with `transition-colors` for a subtle, consistent feedback cue. (When an item is actively expanded, the hover state can be disabled to keep reading clean).
- **Action / Icon Buttons:** Any action button that is an icon or a `...` (more options / MoreHorizontal / dropdown trigger) button within card items must use `size="icon-sm"`.

### Card & Section Headers
- **No Underline Rule:** Card headers do NOT have an underline/bottom border (`border-b`).
- **Spacing to Content:** The card header is separated from the content below with a spacing of `space-y-2` (or `mb-2` / 8px vertical gap).
- **Typography:** Bold title (`text-sm md:text-base font-bold text-foreground`) with small helper text (`text-xs text-muted-foreground`).

### Tables & Table Headers
- **Header Background:** Match card surface (`bg-card`).
- **Header Borders:** `border-b border-border` with subtle padding (`py-2 px-3` or `py-3 px-4`).
- **Header Typography:** Medium/Semi-bold, uppercase where appropriate, clear muted foreground (`text-muted-foreground`).
- **Corner Style:** Rounded outer wrapper with `rounded-sm overflow-hidden`.

### Buttons
- **Shape:** Rounded `rounded-sm` (6px radius).
- **Primary:** Athletic Teal background with white text.
- **Hover:** Darkened teal background transition (`#00a380`).
- **Button Icon Standard & Usage:**
  - **Primary CTA / Creation Buttons (With Leading Icon):** Buttons that create, add, or initiate major new workflows should include a leading icon (e.g. `<Plus className="size-4" />` for adding tournaments, teams, athletes, or announcements).
  - **Special Utility / Navigation / Export / Danger (With Leading Icon):** Actions like downloading/exporting (`Download`), viewing public pages (`ExternalLink` / `Eye`), sharing (`Share2`), or standalone destructive actions (`Trash2`) should include a leading icon.
  - **Dialog Action & Form Submit Buttons (Text Only / No Icon):** Standard dialog footer and form submission buttons (e.g. `Save`, `Submit`, `Confirm`, `Cancel`, `Close`) must be **text-only without leading icons** to avoid visual noise. *(Exception: An animated loading spinner `<Loader2 className="animate-spin" />` is shown during async processing).*
  - **Alert Dialog Buttons (Size SM Standard):** Action and Cancel buttons inside `<AlertDialog>` (`<AlertDialogAction>` and `<AlertDialogCancel>`) must strictly use `size="sm"` (`h-8 text-xs font-semibold` / 32px height) to maintain a compact, clean confirmation footprint.
  - **Row / In-line Actions (Icon Only):** Secondary actions within list rows or table cells (such as `...` More Options, Quick Edit, Delete) must be icon-only buttons using `size="icon-sm"`.

### Icons & Sizing System (Strict 3-Tier Standard)
All icons across the application must strictly adhere to the following 3 standardized tiers:
- **Micro (`size-4` / `h-4 w-4` / 16px):**
  - **Inputs:** Leading & trailing icons inside fields (`Mail`, `Lock`, `Eye`, `EyeOff`, `Search`).
  - **Buttons:** Action and CTA button icons (`Plus`, `Download`, `Share2`, `Trash2`, `Loader2`).
  - **Navigation & Menus:** Dropdown/ActionMenu items, Sidebar items, Tabs, Breadcrumbs.
  - **Inline Status:** Table row actions, list indicators, Badges, and tooltips.
- **Medium (`size-6` / `h-6 w-6` / 24px):**
  - **Empty States:** Empty illustration icons and center placeholders.
  - **Feature Cards:** Feature highlight badges and sport category emblems.
  - **Dashboard Cards:** Stat card indicators, overview icons, and status alert icons.
- **Large (`size-8` / `h-8 w-8` / 32px):**
  - **Brand & Logo:** Application brand mark (`Logo className="size-8"`).
  - **Dialog Hero Illustrations:** Authentication and verification icons (e.g. `MailCheck`, `KeyRound` in OTP / Sign-Up).
  - **Full-Screen States:** Major page header icons and full-screen loading indicators.

### Inputs / Fields
- **Style:** Clean 1px border with `rounded-sm`.
- **Focus:** Highlighted with a primary color outline/ring.

### Dialogs / Modals
- **Surface & Radius:** Background `bg-card`, border `border-border`, rounded `rounded-sm` (6px radius on sm screens and up; flush on mobile).
- **Header Structure & Spacing:**
  - **Padding:** Strictly `p-4` (16px padding all around).
  - **No Header Icon:** Dialog titles and headers must **NOT** include decorative icons (e.g. no `<Shield />`, `<Users />`, `<Trophy />`, or `<Settings />` next to `<DialogTitle>`). Keep the title clean and text-only.
  - **Divider:** Clean bottom border (`border-b border-border`).
  - **Typography:** `<DialogTitle>` uses bold/heavy tracking (`text-lg md:text-xl font-black tracking-tighter text-foreground leading-none`).
  - **Description:** Optional `<DialogDescription>` below title with `text-sm text-muted-foreground mt-1`.
- **Content / Body:**
  - **Container Padding:** Scrollable container with strictly `p-4` padding (16px), and `space-y-4` between sub-sections (gap of 4 / 16px).
  - **Sub-section Spacing:** Each sub-section or card within the content is separated by `space-y-4` (or `gap-4`).
  - **Section Headers in Content:**
    - **Header Component:** Must import and use `<Header level={4}>` from `@/components/ui/header` (e.g. `<Header level={4}>{locale === 'th' ? "รายชื่อนักกีฬา" : "Roster"}</Header>`).
    - **Header to Content Spacing:** The distance between the `<Header level={4}>` and the content/list beneath it must be strictly **2 units (`space-y-2` or `mb-2` / 8px)**.
    - **No Content Header Icon:** Sub-headers within the dialog content must **NOT** have icons (e.g. no `<Users />` or other decorative icons in front of section titles). Keep them text-only.
  - **Images & Avatars:** All images and avatars in dialog content (e.g. team logo, athlete photo) must be **circular** (`rounded-full`, `rounded-full overflow-hidden`, or `<Avatar className="rounded-full">`).
  - **No Background Colors Rule (Content Items):** All internal cards, sections, rows, or list wrappers inside the dialog content must **NOT** have background colors (e.g. no `bg-muted`, `bg-muted/30`, `bg-card`, `bg-background`). Keep them transparent (`bg-transparent`) with clean thin borders (`border border-border rounded-sm`). **Only Badges (`<Badge>`) are permitted to have background colors.**
- **Close Button:** Built-in standard Radix `<DialogPrimitive.Close>` positioned at top-right (`top-4 right-4`).
- **Footer:** Optional `<DialogFooter>` with `p-4 border-t border-border bg-card` (omit footer entirely if dialog is view-only with no action buttons).

## 6. Do's and Don'ts

### Do:
- **Do** display headers strictly in the active language without English in parentheses.
- **Do** keep card headers clean without underlines (`border-b`), separated from content by `space-y-2`.
- **Do** use default `rounded-sm` consistently across cards, dialogs, buttons, inputs, and tables.
- **Do** use `size-4` (`h-4 w-4`) for micro/standard icons (inputs, buttons, dropdowns, table cells, badges).
- **Do** use `size-6` (`h-6 w-6`) for medium icons (empty states, feature cards, stat cards).
- **Do** use `size-8` (`h-8 w-8`) for large icons (brand logo, modal illustrations, hero OTP icons).
- **Do** format dialog headers with clean text-only titles (no icons) and `p-4` padding.
- **Do** apply `p-4` padding and `space-y-4` spacing between sub-sections in dialog content/body.
- **Do** keep spacing between `<Header level={4}>` and its content to strictly 2 (`space-y-2` or `mb-2`).
- **Do** style all images and avatars inside dialog content as circles (`rounded-full`).
- **Do** keep cards and containers inside dialog content transparent (no background color except for badges).
- **Do** use `<Header level={4}>` from `@/components/ui/header` with text-only styling (no icons) for sub-headers/section titles inside dialog content.
- **Do** format card items as a single unified card (`bg-card border border-border rounded-sm overflow-hidden`) and separate each item using divider lines (`divide-y divide-border`) with `p-4` padding per item.
- **Do** apply `hover:bg-muted/30 transition-colors` when hovering over feed rows or interactive card items.
- **Do** set action buttons that are icons or `...` (more options) in card items to `size="icon-sm"`.
- **Do** include leading icons on primary CTA / creation buttons (`Plus`, `Upload`) and utility actions (`Download`, `Share2`).
- **Do** keep dialog footer buttons (`Save`, `Cancel`, `Confirm`) text-only without decorative leading icons.
- **Do** ensure all `<AlertDialogAction>` and `<AlertDialogCancel>` buttons use `size="sm"` (`h-8 text-xs font-semibold`).
- **Do** make table and card headers use the same background color as the card (`bg-card`).
- **Do** group related rows into a single card container using `divide-y divide-border`.
- **Do** use Athletic Teal strictly for interactive highlights and primary call-to-actions.

### Don't:
- **Don't** use arbitrary icon sizes (e.g. `size-3.5`, `size-5`, `size-7`, `size-10`); strictly adhere to the 3-tier standard: micro (`size-4`), medium (`size-6`), and large (`size-8`).
- **Don't** render multiple card items as separate disconnected floating boxes; always group them into a single card with divider lines (`divide-y divide-border`).
- **Don't** use arbitrary padding for card items; maintain strictly `p-4` padding for each item.
- **Don't** add decorative icons to standard dialog footer buttons like Save / Cancel / Close (keep them text-only).
- **Don't** use default or oversized buttons for icon/more actions within list items; use `size="icon-sm"`.
- **Don't** add decorative icons to `<DialogTitle>`, `<DialogHeader>`, or section headers (`<Header level={4}>`) inside dialog content.
- **Don't** use square or rounded-box shapes for images/avatars inside dialog content; always use circular (`rounded-full`).
- **Don't** use arbitrary spacing between sub-sections in dialogs; maintain `space-y-4` between sections and `space-y-2` between header and content.
- **Don't** add background colors (e.g. `bg-muted`, `bg-card`, `bg-background`) to internal cards, sections, or rows inside dialog content; keep them transparent (only `<Badge>` can have background color).
- **Don't** use custom or inconsistent padding for dialog headers or dialog content; always maintain `p-4`.
- **Don't** use raw HTML tags or other header levels (e.g. `<h2>`, `<h3>`, or `<Header level={2}>`) for sub-sections inside dialog body; use `<Header level={4}>`.
- **Don't** append bilingual parenthetical translations in headers (e.g. "หัวข้อ (Header Title)").
- **Don't** add underline borders (`border-b`) under card header titles.
- **Don't** use large/pill border radius (`rounded-xl`, `rounded-2xl`, `rounded-3xl`) for cards and tables.
- **Don't** use high-contrast or mismatched dark/light background fills on table headers.
- **Don't** fragment grouped list items into disconnected floating boxes when a single divided card is cleaner.
- **Don't** use neon, glowing gradients or heavy drop shadows on static boxes.
