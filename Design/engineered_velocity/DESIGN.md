---
name: Engineered Velocity
colors:
  surface: '#0e131e'
  surface-dim: '#0e131e'
  surface-bright: '#343946'
  surface-container-lowest: '#090e19'
  surface-container-low: '#171b27'
  surface-container: '#1b1f2b'
  surface-container-high: '#252a36'
  surface-container-highest: '#303541'
  on-surface: '#dee2f2'
  on-surface-variant: '#bacbb8'
  inverse-surface: '#dee2f2'
  inverse-on-surface: '#2b303c'
  outline: '#849584'
  outline-variant: '#3b4b3c'
  surface-tint: '#00e46d'
  primary: '#c9ffcd'
  on-primary: '#003916'
  primary-container: '#02f576'
  on-primary-container: '#006b2f'
  inverse-primary: '#006d31'
  secondary: '#c9beff'
  on-secondary: '#30009b'
  secondary-container: '#4f00f1'
  on-secondary-container: '#c5baff'
  tertiary: '#dff5ff'
  on-tertiary: '#003543'
  tertiary-container: '#8be1ff'
  on-tertiary-container: '#00657c'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#65ff90'
  primary-fixed-dim: '#00e46d'
  on-primary-fixed: '#00210a'
  on-primary-fixed-variant: '#005323'
  secondary-fixed: '#e6deff'
  secondary-fixed-dim: '#c9beff'
  on-secondary-fixed: '#1b0062'
  on-secondary-fixed-variant: '#4600d8'
  tertiary-fixed: '#b6ebff'
  tertiary-fixed-dim: '#47d6ff'
  on-tertiary-fixed: '#001f28'
  on-tertiary-fixed-variant: '#004e60'
  background: '#0e131e'
  on-background: '#dee2f2'
  surface-variant: '#303541'
  surface-charcoal: '#141B2D'
  surface-border: '#232D42'
  text-muted: '#A1A6B4'
  risk-amber: '#FFB800'
  risk-crimson: '#FF3366'
typography:
  display-hero:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
  display-hero-mobile:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Montserrat
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Montserrat
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-code:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-audit:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  margin: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system translates high-velocity digital engineering into an enterprise-grade loan document management platform. It combines corporate precision with modern, high-contrast digital vibrancy. Designed for credit underwriters, compliance officers, and loan operations teams, the experience balances speed, rigorous compliance, and cognitive clarity.

The visual style merges **Corporate / Modern** discipline with **High-Contrast / Precision Tech** execution. Deep navy and charcoal architectural containers frame crisp, clinical data planes, punctuated by electric kinetic signals for document validation, risk scores, and signature workflows. Data-dense loan matrices and document pipelines feel agile rather than burdensome, inspiring confidence through structured contrast and decisive operational feedback.

## Colors

The palette operates primarily in a sleek, high-efficiency dark canvas (`#0B101B`) engineered for high-density document inspection, document indexing, and review sessions. 

- **Primary (`#02F576`)**: High-luminance hyper-green reserved for primary verification events, compliant approval actions, complete document tags, and active system success statuses.
- **Secondary (`#5F2CFF`)**: Precision royal violet used for executive navigation bars, AI-assisted extraction badges, and systemic workflows.
- **Tertiary (`#00D2FF`)**: Electric cyan accenting file links, live cursor collaboration, real-time OCR telemetry, and hover highlights.
- **Neutral (`#0B101B`)**: Deep obsidian base foundation ensuring minimal eye fatigue during prolonged document audits.
- **Functional Semantics**: `risk-crimson` (`#FF3366`) flags missing disclosures and fraud alerts, `risk-amber` (`#FFB800`) governs audit warnings and trailing stipulations, while `text-muted` (`#A1A6B4`) anchors secondary metadata and table headers without visual noise.

## Typography

The typographic hierarchy establishes clear distinction between architectural framing and operational data density:

- **Display & Headings (Montserrat)**: Bold, structural geometric weight mirrors modern engineering leadership. Used in section titles, loan pipeline summaries, and analytical dashboard anchors.
- **Body & Data Grid (Inter)**: Clean, neutral workhorse typography providing maximum legibility for borrower disclosures, compliance clauses, and dense data tables.
- **Audit & Metadata (JetBrains Mono)**: Monospaced treatment for loan IDs, checksum values, e-signature hashes, and OCR confidence scores, ensuring unmistakable character distinction and tabular alignment.

## Layout & Spacing

The system enforces a flexible 12-column engineering grid tailored for multi-pane loan file workflows:

- **Desktop (>=1280px)**: 12-column grid, 2rem margins, 1.5rem gutters. Supports a three-pane layout: Navigation Tree (column width 2), PDF Document Preview & Annotation Canvas (column width 6), and Extracted Field Inspector / Underwriting Checklist (column width 4).
- **Tablet (768px - 1279px)**: 8-column layout, 1.5rem margins and gutters. Side panels collapse into off-canvas drawers; the preview canvas and data fields toggle via split tabs.
- **Mobile (<768px)**: 4-column layout, 1rem margins, 0.75rem gutters. Stacks the document verification stream into linear card-based approvals with sticky bottom action controls.
- **Rhythm**: Component spacing strictly adheres to the 4px baseline. Compact padding (`space-xs` and `space-sm`) is preserved for dense metadata matrices, while `space-lg` and `space-xl` insulate major regulatory modules.

## Elevation & Depth

Visual hierarchy rejects heavy skeuomorphic drop shadows in favor of **structural tonal layering** and **subtle luminous back-glows**:

- **Ground Level (Base Canvas)**: `#0B101B` background hosting overarching pipeline views.
- **Surface Layer 1 (Panels & Toolbars)**: `#141B2D` with a razor-thin border (`1px solid #232D42`).
- **Surface Layer 2 (Cards, Dropdowns & Modals)**: `#1B243D` with a crisp high-tech highlight (`1px solid #2D3A55`).
- **Luminous Interaction Elevation**: Primary CTAs and active validation flags emit an ambient neon fluor-glow (`0px 0px 16px rgba(2, 245, 118, 0.25)`), creating clear visual priority without disturbing dark-mode ergonomics.
- **Overlays**: Translucent modal backdrops utilize `rgba(11, 16, 27, 0.85)` with `backdrop-filter: blur(8px)` to keep context visible while locking focus onto critical validation alerts.

## Shapes

The design system maintains a **Soft (`1`)** shape language, reflecting precision engineering and enterprise stability:

- Standard input fields, table rows, and actionable controls maintain a disciplined `0.25rem` (4px) corner radius.
- Cards, file preview frames, and floating drawers utilize `0.5rem` (8px).
- Status tags, compliance pills, and avatar badges use subtle semi-curved edges rather than full circles to preserve an engineered, non-casual posture.

## Components

### Buttons
- **Primary ("Approve / Validate")**: Solid `#02F576` background, `#0B101B` bold text, 4px border radius. Hover introduces ambient green outer glow (`box-shadow: 0 0 14px rgba(2, 245, 118, 0.4)`).
- **Secondary ("Execute AI Review")**: Deep purple `#5F2CFF` surface with crisp white text. Active states trigger subtle inset borders.
- **Ghost / Outlined ("Reject / Re-route")**: `#141B2D` background with `1px solid #232D42` border, shifting to `#00D2FF` border on hover with cyan text.

### Chips & Status Badges
- **Compliant / Verified**: Monospaced text in `#02F576` against a subtle `rgba(2, 245, 118, 0.1)` background with `1px solid rgba(2, 245, 118, 0.3)` border.
- **Requires Audit**: Monospaced text in `#FFB800` over `rgba(255, 184, 0, 0.1)`.
- **Missing / Rejected**: Monospaced text in `#FF3366` over `rgba(255, 51, 102, 0.1)`.

### Lists & Tables
- Sticky table headers rendered in `#141B2D` with `#A1A6B4` uppercase monospaced labels.
- Rows separated by fine `1px solid #232D42` rules; hover state transitions the entire row background to `rgba(95, 44, 255, 0.08)` with a 2px `#00D2FF` left indicator border.

### Input Fields & OCR Form Controls
- Inputs feature `#0E1422` interior fills with `#232D42` perimeter borders.
- Focus state invokes a crisp `#00D2FF` border and `0 0 8px rgba(0, 210, 255, 0.2)` ring.
- Machine-extracted fields display an AI confidence meter badge nestled within the right trailing slot.

### Cards & Document Nodes
- Document packet containers utilize `#141B2D` with sharp divider tracks and quick-action menu icon triggers.
- Active selected document card gains a high-contrast top accent line in `#02F576`.

### Specialized Domain Components
- **Document Split-Screen Viewer**: Dual-viewport synchronizing annotated loan contracts against structured field outputs, complete with jump-to-source bounding box indicators.
- **Signature Audit Trail Rail**: Chronological timeline displaying notary status, encryption hashes, and timestamp verification badges.