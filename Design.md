# AquaPure — Design System

**Product:** WaterPurifierCommerce  
**Design version:** 1.0  
**Applies to:** React Native + Expo Android app and React + Vite admin panel  
**Visual direction:** premium, warm, modern, clean-water commerce  
**Palette:** Demo 2 — deep purple, peach, coral, and yellow

---

## 1. Design Principles

1. **Trust first:** clear prices, understandable statuses, accurate product imagery, and predictable checkout behavior.
2. **Warm and distinctive:** deep purple creates brand depth; peach and coral create friendly surfaces; yellow highlights important actions.
3. **Product-led:** product photography and product information should be more prominent than decoration.
4. **Consistent, not identical:** mobile is optimized for shopping with one-handed interaction; the admin panel is optimized for reviewing and managing records.
5. **Accessible:** readable text, clear focus states, comfortable tap targets, and status labels that do not rely on color alone.
6. **Honest states:** loading, empty, unavailable, failed, pending, and demo states must be visually distinct.

## 2. Brand Palette

### 2.1 Core brand colors

| Token | HEX | Primary use |
|---|---|---|
| `brand.primary` | `#210440` | Primary brand color, app header accents, dark hero panels, key headings, primary dark buttons |
| `brand.peach` | `#FDB095` | Soft promotional panels, category cards, secondary highlights |
| `brand.coral` | `#E5958E` | Supporting surfaces, decorative shapes, secondary emphasis |
| `brand.yellow` | `#FFBA00` | High-priority CTAs, offers, discount accents, selected states |

These four colors are the identity. Do not substitute aqua/blue or an unrelated palette.

### 2.2 Supporting neutrals and semantic colors

| Token | HEX | Use |
|---|---|---|
| `neutral.white` | `#FFFFFF` | Cards, forms, modals, main content surfaces |
| `neutral.background` | `#FFF4F0` | Main light-mode background |
| `neutral.text` | `#210440` | Main text on light backgrounds |
| `neutral.textSecondary` | `#646464` | Secondary labels and supporting copy |
| `neutral.border` | `#F0DAD5` | Dividers, field borders, card outlines |
| `neutral.surfaceMuted` | `#FBE8E1` | Subtle tinted sections and disabled surfaces |
| `semantic.success` | `#16803D` | Confirmed/completed/success states |
| `semantic.warning` | `#B45309` | Pending/attention states |
| `semantic.error` | `#B42318` | Errors, failed payments, destructive warnings |
| `semantic.info` | `#4F46A5` | Informational states when needed |

Semantic colors provide status meaning; they must not replace the four-color brand identity.

### 2.3 Color balance

As a rough page-level guide:

- 55–65% light neutral backgrounds and white cards.
- 20–30% deep purple for brand anchors, headings, navigation, and contrast.
- 10–15% peach/coral for warm surfaces and secondary accents.
- Yellow is used sparingly for the most important action or offer on a screen.

Avoid painting every card a different bright color. Keep the interface calm and product-focused.

### 2.4 Contrast rules

- Use **white text on deep purple** (`#210440`).
- Use **deep purple text on yellow** (`#FFBA00`) and peach (`#FDB095`) buttons/surfaces.
- Use deep purple or the defined text color on white/off-white surfaces.
- Do not use white text on yellow for essential small text.
- Do not use peach/coral text on white for small body copy.
- Status always includes a text label or icon; never communicate status by color alone.

## 3. Typography

- Prefer a clean system sans-serif to avoid font-loading overhead. Use the platform system font unless a bundled font is intentionally approved.
- Use a clear scale rather than custom sizes on every screen.

| Token | Suggested size | Weight | Use |
|---|---:|---|---|
| `display` | 28–32 px | Bold | Short hero headline, only when space permits |
| `heading1` | 24 px | Bold/Semibold | Screen title or major section |
| `heading2` | 20 px | Semibold | Product/section heading |
| `heading3` | 16–18 px | Semibold | Card title and subsection |
| `body` | 14–16 px | Regular | Standard body text |
| `bodySmall` | 12–13 px | Regular | Metadata and helper text |
| `label` | 12–14 px | Medium/Semibold | Input labels and controls |
| `price` | 18–24 px | Bold | Prominent product price |

Avoid using very small text for product specifications, form errors, or order statuses. Product prices should be visually prominent but never obscure discounts or terms.

## 4. Spacing, Shape, and Elevation

### 4.1 Spacing scale

Use an 8-point base grid, with 4 px used for very tight icon/text gaps when necessary.

| Token | Size |
|---|---:|
| `space.1` | 4 px |
| `space.2` | 8 px |
| `space.3` | 12 px |
| `space.4` | 16 px |
| `space.5` | 20 px |
| `space.6` | 24 px |
| `space.8` | 32 px |
| `space.10` | 40 px |
| `space.12` | 48 px |

### 4.2 Radius

- Small inputs/chips: 8–10 px.
- Buttons: 10–12 px.
- Product cards and content cards: 16 px.
- Hero banners and large promotional panels: 20–24 px.
- Pills: fully rounded only for compact chips/status labels.

### 4.3 Elevation and borders

- Prefer subtle border and light shadow combinations over heavy shadows.
- Use `neutral.border` for light-mode card edges and dividers.
- Avoid adding shadow to every nested component.
- Keep cards visually distinct from the background without looking skeuomorphic.

## 5. Component Standards

### Buttons

**Primary button**
- Background: `brand.primary`.
- Text/icon: `neutral.white`.
- Use for primary form submissions and high-priority navigation actions.

**Accent CTA**
- Background: `brand.yellow`.
- Text/icon: `brand.primary`.
- Use for key shopping CTAs such as “Shop Now” or “Add to Cart”, while ensuring there is not more than one competing dominant action in a viewport.

**Secondary button**
- White or transparent background, deep purple text, subtle border.

**Destructive button**
- Use semantic error styling and explicit confirmation for consequential actions.

Buttons must show disabled, loading, success, and failure feedback as appropriate. Avoid inert buttons that look interactive.

### Inputs and forms

- Use visible labels; placeholders are supplementary, not the only label.
- Use white surfaces with a soft border and deep purple focus state.
- Keep validation messages near the relevant field.
- Show password visibility controls where helpful.
- Preserve entered form values when a recoverable provider/network error occurs.

### Product cards

Every catalog product card should present, where applicable:

1. Correct product image.
2. Product name and concise category/descriptor.
3. Customer or dealer price according to the user's authorized role.
4. Optional original price/discount where the data is intentionally supplied.
5. Stock/availability indicator.
6. Add-to-cart action.

Use a consistent image aspect ratio within a catalog grid. Fit the product without distorting it; prefer a light/white image background and contained image scaling. Do not use one unrelated image for multiple products simply to fill the catalog.

### Status badges

- Pair each color with text, e.g. `Pending`, `Approved`, `Rejected`, `Payment failed`, `Completed`.
- Use semantic success/warning/error colors only for status meaning.
- Make status text readable in both the mobile app and admin panel.

### Icons

- Use one consistent icon family (Lucide-compatible on web; an Expo-compatible icon package on mobile).
- Default to simple outline icons.
- Pair unfamiliar actions with text.
- Give icon-only buttons accessible labels.

## 6. Mobile App Screen Guidance

### 6.1 Global mobile navigation

Bottom navigation should contain:

- Home
- Categories
- Cart
- Orders
- Profile

Use deep purple for the active destination and muted gray for inactive icons/labels. The cart may show a small count badge. Respect device safe areas and keyboard behavior.

### 6.2 Home screen

Suggested order:

1. Header with AquaPure wordmark, search access, notifications, and cart.
2. Promotional hero using deep purple as the base, peach/coral accents, and a yellow CTA.
3. Horizontal category shortcuts for purifiers, dispensers, filters, pumps, and spare parts.
4. Best Deals/Popular Products sections with product cards.
5. Service booking/maintenance banner.
6. Bottom navigation.

Suggested sample hero copy: **“Pure Water for a Healthier Tomorrow.”** Do not introduce unsupported claims that a product cures/prevents health conditions.

### 6.3 Catalog and category screens

- Use a responsive 2-column product grid on typical phones when width permits.
- Provide search, category filtering, sorting, loading skeletons, no-results, and retry states.
- Avoid excessive decoration behind product photos.

### 6.4 Product details

- Large gallery/image at the top.
- Product name, rating only when sample/real review data exists, price, and availability.
- Specifications, features, included items, and installation details in scannable groups.
- Persistent or easy-to-reach quantity and add-to-cart actions.
- Display dealer pricing only for an authenticated, approved dealer.

### 6.5 Cart and checkout

- Clear item rows, quantity controls, remove actions, price breakdown, address selection, and primary checkout CTA.
- Use an explicit `Test payment` or equivalent context where appropriate so reviewers understand no real payment is taken.
- Visually distinguish `Payment pending`, `Test payment successful`, `Payment failed`, and `Cancelled`.
- Never state `Paid` until the configured trusted verification path confirms the result.

### 6.6 Dealer screens

- Use the same brand design as the customer experience, with a clear dealer context indicator.
- Show wholesale price/label only for approved dealer accounts.
- Make quantity increments and bulk-order totals easy to inspect.
- Pending/rejected approval states should explain the next step and must not expose dealer-order actions.

### 6.7 Service booking

- A short, step-by-step form for service type, address, appointment preference, and notes.
- Clearly display confirmation and status.
- If live map/geocoding fails, manual address entry remains available.

## 7. Admin Dashboard Guidance

The admin panel uses the same brand identity with a more functional layout.

### Global shell

- Deep-purple sidebar or compact navigation rail.
- Light off-white page canvas.
- White content cards with thin borders.
- Header with page title, admin account menu, and relevant actions.
- Responsive sidebar collapse for narrow widths.

### Overview

- KPI cards for order count/status, pending dealer applications, and open service requests.
- Use yellow as a small highlight rather than filling all KPI cards.
- Any metric must come from data or be clearly marked as demo/sample.

### Orders

- Search/filter controls and readable order table/list.
- Visible order reference, buyer type, date, total, payment state, and order state.
- Detail view for line items and address, with sensitive data shown only to authorized admins.
- Status actions use confirmation/feedback and handle concurrent/stale updates gracefully.

### Dealer applications

- List pending/approved/rejected dealers and their status.
- Approve/reject actions require an appropriate admin role and clear confirmation.
- Update the actual record and show failure/success feedback.

### Service desk

- Table/list with booking reference, request type, preferred slot, service status, and available actions.
- Provide a focused detail view and status updates.

### Table behavior

- Use readable spacing and sticky headers only where useful.
- Include loading, error, empty, and pagination states as appropriate.
- Avoid very small fonts or excessive grid lines.

## 8. Imagery and Content

- Product images should look like clean, realistic product photography with consistent framing and lighting.
- Ensure the image matches the named item: purifier images for purifiers, dispenser images for dispensers, pump images for pumps, and correct filter/cartridge imagery for replacement parts.
- Use Cloudinary or another approved host and optimize image dimensions/compression.
- Provide a neutral branded fallback for unavailable images.
- Hero artwork may use decorative water shapes, soft curves, and restrained gradients, but product imagery must remain legible.
- Use Indian rupee currency formatting (`₹`) in sample/demo prices.
- All sample prices, offers, ratings, and reviews must be identifiable as demo content unless verified data is supplied.

## 9. Motion and Feedback

- Use short, subtle transitions for navigation and state changes.
- Avoid motion that delays primary actions or distracts from product selection.
- Provide immediate feedback for add-to-cart, quantity updates, booking submission, and status changes.
- Use skeletons for meaningful loading periods and concise retry messages for recoverable errors.
- Respect reduced-motion preferences where practical.

## 10. Accessibility and Responsive Rules

- Aim for WCAG AA contrast for text and controls wherever applicable; verify key foreground/background combinations rather than relying on intuition.
- Don't rely on color alone to communicate states.
- Provide accessible names for icons, meaningful image descriptions, keyboard navigation and focus indication on web, and readable screen-reader labels on mobile.
- Ensure controls have comfortable touch targets (target around 44–48 dp where practical).
- Support small Android screens without horizontal overflow.
- Admin tables should adapt to narrow widths using responsive layout, horizontal scrolling only when necessary, or stacked records.
- Test keyboard overlap, safe areas, font scaling, empty data, and long product names.

## 11. Theme Implementation

Create central tokens and make components consume them. Example TypeScript base object:

```ts
export const colors = {
  primary: "#210440",
  peach: "#FDB095",
  coral: "#E5958E",
  yellow: "#FFBA00",
  white: "#FFFFFF",
  background: "#FFF4F0",
  text: "#210440",
  textSecondary: "#646464",
  border: "#F0DAD5",
  surfaceMuted: "#FBE8E1",
  success: "#16803D",
  warning: "#B45309",
  error: "#B42318",
  info: "#4F46A5",
} as const;
```

For web, mirror the tokens in CSS custom properties rather than inventing a second palette:

```css
:root {
  --color-primary: #210440;
  --color-peach: #FDB095;
  --color-coral: #E5958E;
  --color-yellow: #FFBA00;
  --color-white: #FFFFFF;
  --color-background: #FFF4F0;
  --color-text: #210440;
  --color-text-secondary: #646464;
  --color-border: #F0DAD5;
  --color-surface-muted: #FBE8E1;
  --color-success: #16803D;
  --color-warning: #B45309;
  --color-error: #B42318;
  --color-info: #4F46A5;
}
```

Use these snippets as the starting source of truth. Do not copy them into each screen. If a token changes, update the central definition and verify both apps.

## 12. Visual QA Checklist

Before accepting a screen, verify:

- [ ] Uses the approved palette; no unrelated primary colors introduced.
- [ ] Text and button contrast are readable.
- [ ] Spacing, radius, typography, and icons are consistent.
- [ ] Product image matches the product name and is not stretched.
- [ ] Primary action is visually clear and actually works.
- [ ] Loading, empty, and error states exist where data is asynchronous.
- [ ] No horizontal overflow, clipped labels, or keyboard overlap.
- [ ] Cart/order/booking statuses accurately reflect data.
- [ ] Role-specific elements do not leak private dealer/admin information.
- [ ] Screen remains usable at small mobile widths and typical desktop widths.
