# Design System Document: The Institutional Architect

## 1. Overview & Creative North Star
The design system for this platform is guided by the Creative North Star: **"The Institutional Architect."** 

To fulfill the mandate of being "The Digital Authority for Grants," the UI must move beyond the generic, boxed aesthetics of standard fintech. We reject the "template" look in favor of a high-end editorial experience. The system communicates state-level reliability through rock-solid structural logic, while signaling modern efficiency through "breathing" layouts. 

We achieve this through:
*   **Intentional Asymmetry:** Utilizing unbalanced white space to guide the eye toward critical calls-to-action.
*   **Massive Typographic Contrast:** Using exaggerated scales between display headers and functional body text.
*   **Tonal Authority:** Replacing structural lines with sophisticated color shifts that mimic the layering of physical, high-quality stationery.

---

## 2. Colors: Tonal Depth & The "No-Line" Rule
The palette is anchored in `primary` (#6575ad) for absolute authority and `tertiary_fixed` (#069e7c) for the "flow" of capital. The `color_mode` is **dark**.

### The "No-Line" Rule
To maintain a premium, seamless aesthetic, **the use of 1px solid borders for sectioning is strictly prohibited.** Boundaries must be defined solely through:
1.  **Background Shifts:** Placing a `surface_container_lowest` card on a `surface_container_low` background.
2.  **Tonal Transitions:** Using subtle shifts between `surface` and `surface_variant`.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. 
*   **Base:** `surface` (#737688) is the canvas.
*   **Sectioning:** Use `surface_container_low` (#637c74) for large structural blocks.
*   **Interaction/Cards:** Use `surface_container_lowest` (#737688) to make interactive elements "pop" without shadows.

### The "Glass & Gradient" Rule
For floating elements (modals, navigation bars), use Glassmorphism:
*   Apply `surface` color at 80% opacity with a 20px backdrop-blur.
*   **Signature Textures:** Main CTAs should use a subtle linear gradient from `primary` (#6575ad) to `primary_container` (#6575ad) at a 135-degree angle to add "soul" and depth to the authority of the brand.

---

## 3. Typography: Editorial Authority
We use a dual-font strategy to balance character with legibility.

*   **Display & Headlines (Manrope):** This is our "Voice of Authority." The geometric nature of Manrope feels engineered and precise. Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) for hero sections to create a "government-editorial" feel.
*   **Body & Labels (Inter):** The "Workhorse." Inter provides maximum clarity for complex grant data. 
*   **Hierarchy as Identity:** By maintaining a large gap between `headline-lg` (2rem) and `body-md` (0.875rem), we create a sense of scale and importance. Titles should always be high-contrast, using `on_surface` (#ffffff) against dark backgrounds.

---

## 4. Elevation & Depth: The Layering Principle
We convey importance through **Tonal Layering** rather than traditional drop shadows.

*   **The Layering Principle:** Depth is achieved by "stacking." For example, a grant application form (`surface_container_lowest`) sits atop a background (`surface_container_low`). This creates a soft, natural lift that feels sophisticated.
*   **Ambient Shadows:** When an element must float (e.g., a dropdown), use an extra-diffused shadow: `box-shadow: 0 10px 40px rgba(101, 117, 173, 0.06);`. Note the tint—we use a fraction of the `primary` color instead of pure black to mimic natural light.
*   **The "Ghost Border" Fallback:** If a divider is functionally required, use `outline_variant` (#737688) at 20% opacity. Never use 100% opaque lines.

---

## 5. Components

### Buttons (The Anchor)
*   **Primary:** Background `primary` (#6575ad), text `on_primary` (#ffffff). Shape: `subtle roundedness` (1). Use for the main "Apply Now" or "Submit" actions.
*   **Secondary:** Background `tertiary_fixed` (#069e7c), text `on_tertiary_fixed` (#000000). Use specifically for "Success" paths or "Funds Available" indicators.
*   **Tertiary (Ghost):** No background, `primary` text. Used for "Cancel" or "Learn More."

### Input Fields (The Ledger)
*   Fields should not be boxes, but "containers." Use `surface_container_high` with a `subtle roundedness` (1) radius. 
*   **State:** On focus, the background shifts to `surface_container_lowest` with a 1px `primary` ghost border (20% opacity).

### Cards & Lists (The Narrative)
*   **Forbid Dividers:** Separate list items using vertical white space (16px/24px) or subtle alternating background shifts (`surface` to `surface_container_low`).
*   **Grant Cards:** Use a `surface_container_lowest` container. The header of the card should use `title-lg` in Manrope to emphasize the grant's name.

### Progress Steppers (Institutional Flow)
Given the context of grants, use a "heavy" stepper component. Completed steps should use `tertiary` (#069e7c) to symbolize "Money/Success/Proceed."

---

## 6. Do’s and Don’ts

### Do:
*   **DO** use whitespace as a functional tool to separate complex data.
*   **DO** use `tertiary` (#069e7c) accents for data points representing growth or approval.
*   **DO** utilize the `subtle roundedness` (1) corner radius consistently to maintain the "Modern Beständigkeit" (Modern Stability) feel.

### Don’t:
*   **DON'T** use pure black (#000000) for text; always use `on_surface` (#ffffff).
*   **DON'T** use 1px borders to separate content; use background color tiers.
*   **DON'T** use high-saturation reds for errors. Use the sophisticated `error` (#ba1a1a) and `error_container` (#ffdad6) tokens to maintain a professional atmosphere even during friction.