# Design System Strategy: The Fertile Horizon

## 1. Overview & Creative North Star: "The Digital Agronomist"
The Creative North Star for this system is **The Digital Agronomist**. We are moving away from the "industrial spreadsheet" look and toward a sophisticated, high-end editorial experience that feels as organic as the soil and as precise as a satellite.

To break the "template" look, we employ **Organic Functionalism**. This means prioritizing extreme legibility under harsh sunlight (high contrast, generous scale) while using intentional asymmetry in dashboard layouts. We don't just align boxes; we create a rhythmic flow of information using overlapping "paper" layers and varying tonal depths. The interface should feel like a premium tool—utilitarian yet undeniably refined.

---

## 2. Colors: Tonal Earth & Atmospheric Clarity
The palette is rooted in the earth but optimized for high-visibility outdoor use. We avoid "pure" colors in favor of complex, naturalistic tones.

### The "No-Line" Rule
**Explicit Instruction:** Traditional 1px solid borders are strictly prohibited for sectioning. Boundaries must be defined solely through background color shifts. A `surface-container-low` section sitting on a `surface` background provides all the definition needed. If you feel the urge to draw a line, use white space instead.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of materials. 
- **Base Layer:** `surface` (#f8faf9)
- **Primary Content Blocks:** `surface-container-lowest` (#ffffff) for maximum "pop" and clarity.
- **Secondary Utility Zones:** `surface-container` (#eceeed) or `surface-container-high` (#e6e9e8) to create recession.
- **Nesting:** Always place a "lighter" surface on a "darker" background to create a natural lift without shadows.

### The "Glass & Gradient" Rule
To elevate the primary actions (Orange/Brown tones), use subtle radial gradients transitioning from `primary` (#793c00) to `primary_container` (#9d4f00). This adds a "soul" to the action buttons, making them feel tactile rather than flat. For floating mobile navigation or weather overlays, use **Glassmorphism**: `surface_variant` at 70% opacity with a `backdrop-filter: blur(12px)`.

---

## 3. Typography: Editorial Precision
We utilize a dual-font strategy to balance character with utility.

*   **Display & Headlines (Manrope):** A modern sans-serif with geometric roots. Used for `display-lg` through `headline-sm`. Its wide apertures ensure that even under direct sunlight, "8"s don't look like "0"s.
*   **Body & Labels (Inter):** The workhorse. Inter is used for all data-heavy contexts (`body-md`, `label-sm`). It provides maximum legibility for coordinates, crop yields, and sensor data.

**The Editorial Scale:** Use extreme contrast in size. A `display-md` header next to a `label-md` caption creates a sophisticated, magazine-like hierarchy that guides the eye instantly to the most important metric.

---

## 4. Elevation & Depth: Tonal Layering
Depth is a functional tool for sunlight visibility, not just an aesthetic choice.

*   **The Layering Principle:** Avoid drop shadows for standard cards. Instead, "stack" tiers. A `surface-container-lowest` card placed on a `surface-dim` background creates a sharp, high-contrast edge that is easier to see outdoors than a soft shadow.
*   **Ambient Shadows:** Use only for "Critical Overlays" (e.g., a modal or a floating action button). Shadows must be huge and faint: `blur: 40px`, `y: 12px`, `opacity: 6%` using a tint of `on_surface` (#191c1c).
*   **The "Ghost Border" Fallback:** If a divider is essential for accessibility in complex data tables, use the `outline_variant` token at **15% opacity**. It should be a whisper, not a statement.

---

## 5. Components: Tactile & High-Visibility

### Buttons
*   **Primary (The Sun-Drenched Orange):** Background: Gradient `primary` to `primary_container`. Color: `on_primary`. Shape: `xl` (1.5rem) roundedness. These are large-format (minimum 56px height) to ensure easy tapping for gloved or moving hands.
*   **Secondary (The Earth Green):** Background: `secondary_container`. Color: `on_secondary_container`. No border.

### Cards & Lists
*   **The No-Divider Rule:** Forbid 1px dividers between list items. Use 12px or 16px of vertical padding and alternating background tones (`surface` vs `surface-container-low`) if necessary.
*   **Data Visualization Chips:** Use `tertiary_container` for neutral status and `error_container` for alerts. Use the `full` (9999px) roundedness scale for chips to contrast against the `lg` (1rem) roundedness of containers.

### Input Fields
*   **The "Sun-Safe" Input:** Avoid "line-only" inputs. Use a solid `surface-container-highest` background with a `md` (0.75rem) corner radius. The high contrast between the field and the page background ensures the hit area is unmistakable in bright light.

### Specialized Agricultural Components
*   **Field Health Indicators:** Large, circular progress rings using `secondary` (Green) and `primary` (Orange) to denote moisture or nutrient levels.
*   **The "Status Bar" Navigation:** A bottom-docked navigation bar using Glassmorphism (`surface` at 80% with blur) to keep the "Light Mode" feel while providing a persistent anchor for the thumb.

---

## 6. Do's and Don'ts

### Do
*   **Do** use `surface-container-lowest` (#ffffff) for the main dashboard cards to maximize contrast against the `background`.
*   **Do** leverage the `xl` (1.5rem) roundedness for large structural elements to give a friendly, modern "App" feel.
*   **Do** use `tertiary` (Blue-Grey) for data-heavy secondary information like timestamps or coordinates.

### Don'ts
*   **Don't** use pure black (#000000) for text. Always use `on_surface` (#191c1c) to maintain a natural, premium look.
*   **Don't** use "Standard" 8px gutters. Use a generous 24px or 32px spacing scale to provide "Breathing Room" that prevents the interface from feeling cluttered.
*   **Don't** use high-contrast borders. If you can't see the container, your background color shift isn't strong enough.