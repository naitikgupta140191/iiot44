---
name: Tata Motors Sales Intelligence Platform
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#424751'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#727782'
  outline-variant: '#c2c6d3'
  surface-tint: '#1b5faa'
  primary: '#003c75'
  on-primary: '#ffffff'
  primary-container: '#00539e'
  on-primary-container: '#a8c9ff'
  inverse-primary: '#a7c8ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#662a00'
  on-tertiary: '#ffffff'
  tertiary-container: '#8a3c00'
  on-tertiary-container: '#ffb790'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#a7c8ff'
  on-primary-fixed: '#001b3b'
  on-primary-fixed-variant: '#004788'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdbca'
  tertiary-fixed-dim: '#ffb68e'
  on-tertiary-fixed: '#331200'
  on-tertiary-fixed-variant: '#773300'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  data-point:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 32px
  xl: 48px
  gutter: 24px
  margin: 32px
  sidebar_width: 260px
---

## Brand & Style

The design system is engineered for high-performance sales analytics, balancing the heritage of a global automotive giant with the precision of modern data science. The brand personality is **Authoritative, Analytical, and Premium**. 

The visual style follows a **Corporate Modern** aesthetic. It prioritizes clarity and cognitive ease to help sales managers navigate complex datasets. The interface uses a generous white-space strategy to reduce "dashboard fatigue," ensuring that critical KPIs and market trends remain the focal point. The emotional response should be one of confidence and reliability, achieved through a structured grid, refined typography, and a "less but better" approach to decorative elements.

## Colors

The palette is anchored by a **Sophisticated Corporate Blue**, derived from the Tata Motors brand identity, signifying stability and institutional trust. 

- **Primary Blue:** Used for key actions, active navigation states, and primary data series.
- **Neutrals:** A range of cool grays (Slate) provides a clean canvas. The background is a pure white (#FFFFFF), while secondary surfaces and sidebar backgrounds use a subtle off-white to create soft containment.
- **Semantic Colors:** Success (Green), Warning (Amber), and Error (Red) are optimized for data visualization, ensuring they are distinct enough to be accessible while maintaining a professional saturation level.
- **Borders:** Extremely subtle #E2E8F0 is used for table dividers and card strokes to maintain structure without adding visual noise.

## Typography

This design system utilizes **Inter** as a systematic, utilitarian typeface that excels in high-density data environments. 

The typographic hierarchy is strictly enforced to guide the user's eye from high-level summaries to granular details. **Display and Headline** styles use tighter letter spacing and heavier weights for a premium feel. **Data Points** are emphasized with semi-bold weights to ensure numbers are legible at a glance. **Labels** utilize a slightly smaller, uppercase treatment to differentiate metadata from primary content.

## Layout & Spacing

The layout employs a **12-column Fluid Grid** system for the main content area, anchored by a fixed left-hand navigation sidebar.

- **Grid:** Uses 24px gutters to allow data-heavy cards enough room to "breathe."
- **Margins:** 32px outer margins ensure content does not feel cramped against the edges of the viewport.
- **Rhythm:** A 4px baseline grid ensures consistent vertical alignment across disparate components like tables, charts, and forms.
- **Sidebar:** A consistent 260px width provides ample space for descriptive menu labels and icons without encroaching on the dashboard workspace.

## Elevation & Depth

Visual hierarchy is established through **Tonal Layers** and **Ambient Shadows**. 

The design avoids heavy outlines in favor of soft, diffused drop shadows (0px 4px 20px rgba(0,0,0,0.05)) that lift cards off the background. This creates a clear physical metaphor of stacked information. 

- **Level 0 (Background):** Pure white or the lightest gray for the main canvas.
- **Level 1 (Cards):** White background with a soft shadow and a 1px border (#F1F5F9).
- **Level 2 (Modals/Overlays):** Stronger shadow (0px 10px 30px rgba(0,0,0,0.1)) to focus user attention.
- **Interactive States:** Buttons and clickable cards exhibit a subtle "lift" on hover to signal interactivity.

## Shapes

The shape language is **Soft (Level 1)**, utilizing a 4px (0.25rem) base border-radius for most UI elements. This approach maintains a professional, crisp corporate look while avoiding the harshness of sharp corners.

- **Standard Elements (Buttons, Inputs):** 4px radius.
- **Large Containers (Cards):** 8px (0.5rem) radius for a slightly more modern, approachable feel.
- **Pills (Status Tags):** Full rounding for semantic chips to distinguish them from interactive buttons.

## Components

### Buttons
- **Primary:** Solid Corporate Blue with white text. High emphasis.
- **Secondary:** Ghost style with a subtle border (#E2E8F0) and blue text.
- **Tertiary:** Text-only for low-priority actions like "Cancel" or "Clear Filters."

### Cards
- The fundamental building block. Every card should have a clear title in `headline-sm` and use the 8px border radius. Content inside should be padded by at least 24px.

### Navigation
- Vertical sidebar using "light" icons (2px stroke) paired with `body-md` labels. Active state indicated by a left-hand accent bar and a subtle color shift in the background.

### Data Tables
- Minimalist design with no vertical borders. Horizontal dividers are 1px #F1F5F9. Row hover states use a subtle #F8FAFC fill. Headers are in `label-sm` with a light gray text color.

### Charts
- Utilize the primary blue as the lead series color. Use a palette of desaturated secondary colors (Teal, Indigo, Slate) for multi-series data to ensure the UI remains professional and not overly vibrant.

### Form Inputs
- Clear, labeled fields with a 1px #E2E8F0 border. On focus, the border transitions to Primary Blue with a 2px outer glow (ring).