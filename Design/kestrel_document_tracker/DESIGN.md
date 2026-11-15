---
name: Kestrel Document Tracker
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434655'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#747686'
  outline-variant: '#c4c5d7'
  surface-tint: '#2151da'
  primary: '#0037b0'
  on-primary: '#ffffff'
  primary-container: '#1d4ed8'
  on-primary-container: '#cad3ff'
  inverse-primary: '#b7c4ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#7f2500'
  on-tertiary: '#ffffff'
  tertiary-container: '#a73400'
  on-tertiary-container: '#ffc9b7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001551'
  on-primary-fixed-variant: '#0039b5'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#ffdbcf'
  tertiary-fixed-dim: '#ffb59c'
  on-tertiary-fixed: '#390c00'
  on-tertiary-fixed-variant: '#832700'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: -0.005em
  body-default:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.25rem
  body-compact:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.125rem
  tabular-data:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '500'
    lineHeight: 1.125rem
  label-default:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '600'
    lineHeight: 1rem
    letterSpacing: 0.025em
  label-compact:
    fontFamily: Inter
    fontSize: 0.6875rem
    fontWeight: '600'
    lineHeight: 0.875rem
    letterSpacing: 0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-compact: 0.75rem
  margin: 1.5rem
  margin-compact: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system delivers a high-velocity, rigorous internal desktop workstation tailored specifically for underwriting operations, credit risk managers, and operations officers handling high-volume sub-₹25L Indian SME loans.

### Personality & Emotional Response
The visual tone communicates absolute institutional precision, calm reliability, and operational certainty. Loan document operations in high-throughput lending environments leave no room for ambiguity: officers process hundreds of verification artifacts daily (GST returns, ITRs, bank statements, Udyam certificates, and collateral proofs). The UI instills emotional control, reduces cognitive load over sustained 8-hour processing sessions, and highlights critical risks without generating false panic.

### Design Movement
**Dense Corporate Modernism with Utilitarian Restraint.** The interface strips away all non-functional ornamentation, gradients, and soft floating shadows in favor of a crisp tabular workspace, structured master-detail panels, explicit dividing lines, and micro-metric clarity. Data legibility and instant keyboard-driven workflow efficiency dictate every layout decision.

## Colors

The palette is engineered around high typographic contrast, structural framing, and deterministic status communication compliant with WCAG 2.1 AA across all states.

### Core Architecture
- **Master Header & Primary Navigation Canvas:** `#0F172A` (Slate 900) grounding chrome, with secondary toolbars and flyout drawers at `#1E293B` (Slate 800).
- **Workspace Backgrounds:** Baseline canvas sits on `#F8FAFC` (Slate 50), grouping containers at `#FFFFFF` (Pure White), and active row/filter segments at `#F1F5F9` (Slate 100).
- **Structural Dividers & Form Borders:** Default borders use `#CBD5E1` (Slate 300); subtle cell dividers use `#E2E8F0` (Slate 200); focused bounds escalate to `#1D4ED8`.
- **Primary Interactive Brand:** Primary CTA and critical pathway activations use `#1D4ED8` (Blue 700), hovering to `#2563EB` (Blue 600), with focused outline rings using `rgba(29, 78, 216, 0.35)`.

### Semantic Status Tokens
Every status pill and badge pairs explicit text labels with dedicated triple-token sets (Background, 1px Border, Text) guaranteeing minimum 4.5:1 contrast:
- **On Track / Received / Complete (Emerald):** Background `#ECFDF5`, Border `#A7F3D0`, Text `#065F46`.
- **Due Today / Pending Review (Amber):** Background `#FFFBEB`, Border `#FDE68A`, Text `#92400E`.
- **Overdue / Blocked / Flagged (Coral/Brick):** Background `#FEF2F2`, Border `#FECACA`, Text `#991B1B`.
- **Waived / Not Applicable (Slate):** Background `#F1F5F9`, Border `#E2E8F0`, Text `#475569`.

## Typography

The type stack is locked to **Inter** with native OS fallbacks (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`). It prioritizes dense vertical cadence, sharp distinction between labels and values, and absolute alignment in multi-column numerical grids.

### Numeric Display & Tabular Alignment
- All amounts (₹ Indian Rupee currency formats), application IDs, GSTINs, PANs, and dates must be rendered using `font-variant-numeric: tabular-nums` or OpenType feature `"tnum" 1`.
- Amounts use Indian numbering format standard (e.g., `₹24,50,000.00` rather than western millions grouping).
- Column headers for tabular numbers align to the right, matching cell content.

### Hierarchy & Scale Guidelines
- **Document Titles / File Names:** Render at `body-default` (`14px / 0.875rem`), Medium (500) weight to establish quick scanning down document lists.
- **Micro Metadata & Section Tags:** Render at `label-compact` (`11px / 0.6875rem`), Semi-Bold (600), uppercase with `letter-spacing: 0.04em` for category tags, document mandatory flags, and verification stages.
- **Table Headers:** Render at `label-default` (`12px / 0.75rem`), Semi-Bold (600), colored in `#475569` (Slate 600) to keep them strictly subordinate to user data rows.

## Layout & Spacing

The workstation layout is calibrated for standard enterprise monitors (1440px target, responsive down to 1024px minimum).

### Grid & Layout Engine
- **Layout Model:** Fixed top chrome (48px height) with a persistent narrow utility sidebar (56px collapsed / 220px expanded), framing a fluid dual-pane master-detail workflow canvas.
- **Master-Detail Splitting:** 
  - Left Data Grid (Queue / Case List): Spans 60% width at 1440px (min-width 580px).
  - Right Contextual Drawer / Verification Panel: Spans 40% width (min-width 420px).
  - At `<= 1024px`, the layout shifts to a tabbed overlay model where the verification panel covers the active master queue with explicit breadcrumb return paths.

### Spacing Principles
- Density is prioritized: internal padding for standard table rows is clamped to `6px` vertical and `12px` horizontal.
- Control spacing uses multiples of `4px` (`0.25rem`). Component inputs, inline search filters, and status toggles strictly preserve a `32px` touch/click target height to prevent excess vertical sprawl.

## Elevation & Depth

This system intentionally rejects floating, blurred, or decorative drop shadows to prevent visual noise in data-heavy screens. Visual plane separation is achieved exclusively through tonal stratification and high-precision border framing.

### Structural Depth Principles
- **Base Canvas:** `#F8FAFC`. Houses passive layout gutters and container backgrounds.
- **Raised Panels & Active Work Areas:** `#FFFFFF`. Crisp surfaces with a single 1px solid `#CBD5E1` boundary.
- **Top Utility Navigation:** `#0F172A`. Deep tonal anchor visually sitting underneath all active operational modules.
- **Popovers, Select Menus & Verification Tooltips:** Flat surface `#FFFFFF` bounded by a 1px solid `#94A3B8` border and a crisp utility edge: `box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.06)`. No colored or soft ambient glows.
- **Master Row Hover & Selection:** 
  - Hover: `#F8FAFC`.
  - Selected / Active Document: `#EFF6FF` with a 2px solid `#1D4ED8` inset left-indicator edge.

## Shapes

The interface embraces a compact, structured geometry with subtle softening (Level 1 - Soft) to balance technical precision with modern tool ergonomics.

### Corner Radius System
- **Base Components (`rounded` / 4px / `0.25rem`):** Applied uniformly to inputs, table action buttons, inline search fields, filter pills, and alert badges. This maintains architectural alignment with table gridlines.
- **Panels & Containers (`rounded-lg` / 8px / `0.5rem`):** Applied to top-level card containers, document preview viewports, verification modal dialogs, and verification summary trays.
- **Pill Badges (`9999px`):** Reserved exclusively for status indicators (e.g., "Received", "Overdue") to instantly separate metadata tokens from rectangular interactive buttons and input boxes.

## Components

### Buttons
- **Primary CTA:** Background `#1D4ED8`, text `#FFFFFF`, font weight 500, height 32px, horizontal padding `12px`, corner radius 4px. Focus state: 2px offset with `#1D4ED8` ring.
- **Secondary / Action Button:** Background `#FFFFFF`, border 1px solid `#CBD5E1`, text `#0F172A`, hover background `#F8FAFC`.
- **Destructive Action (e.g., Reject Document):** Background `#FFFFFF`, border 1px solid `#FECACA`, text `#991B1B`, hover background `#FEF2F2`.

### Status Badges
Status badges are pill-shaped (`border-radius: 9999px`), 20px in height, with `8px` horizontal padding and `11px` uppercase/semi-bold typography:
- **Received / Complete:** `#ECFDF5` background, `#A7F3D0` border, `#065F46` label.
- **Pending Review / Due Soon:** `#FFFBEB` background, `#FDE68A` border, `#92400E` label.
- **Overdue / Missing:** `#FEF2F2` background, `#FECACA` border, `#991B1B` label.
- **Waived:** `#F1F5F9` background, `#E2E8F0` border, `#475569` label.

### Data Tables
- Header row fixed at 32px height, uppercase `12px` font `#475569`, tracking `0.025em`, background `#F8FAFC`, bottom border 1px solid `#CBD5E1`.
- Data rows fixed at 36px height (compact density), alternating hover background `#F8FAFC`, bottom border 1px solid `#E2E8F0`.
- All financial sums and reference codes right-aligned with monospace/tabular digits.

### Input Fields & Search Bars
- Standard height: 32px.
- Background `#FFFFFF`, border 1px solid `#CBD5E1`, text `#0F172A`, placeholder `#94A3B8`.
- Focus state: border color `#1D4ED8`, outline 2px solid `rgba(29, 78, 216, 0.2)`.

### Checkboxes & Selection Controls
- 16px × 16px square, 3px border radius, border 1.5px solid `#94A3B8`.
- Checked state: `#1D4ED8` fill with crisp white internal check icon.

### Cards & Document Inspection Containers
- Framing border 1px solid `#E2E8F0`, zero drop shadow, solid white background.
- Header bars partitioned by a solid bottom divider (`#E2E8F0`) with 12px vertical padding, housing case numbers, SME trade names, and aggregate verified % metrics.