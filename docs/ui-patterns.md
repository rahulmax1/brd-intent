# UI Patterns — VBS Intent Model Review

Design system reference for consistent UI implementation.

## Brand Colors

```typescript
// Tailwind config in use
colors: {
  brand: {
    navy: '#002C61',      // ACFS corporate color
    blue: '#0081F2',      // Interactive accent
  },
  neutral: {
    50: '#F8F8F7',        // Warm off-white background
    100: '#E8E8E6',
    200: '#D1D1CE',
    // ... standard neutral scale
  }
}
```

## Typography

**Font**: DM Sans Variable (weights 400, 500, 600, 700)

**Scale**:
- Headings: `text-2xl font-semibold` → `text-lg font-medium`
- Body: `text-base` (16px)
- Labels: `text-sm text-neutral-600`
- Captions: `text-xs text-neutral-500`

## Spacing Scale

Use consistent spacing: `2, 3, 4, 6, 8, 12, 16, 24`

**Common patterns**:
- Card padding: `p-6`
- Section gaps: `space-y-8`
- Form fields: `space-y-4`
- Inline elements: `gap-3`

## Component Patterns

### Cards

```tsx
// Standard card
<div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
  {children}
</div>

// Glass card (3D overlays)
<div className="rounded-lg bg-white/80 backdrop-blur-sm border border-neutral-200/50 p-4">
  {children}
</div>
```

### Status Colors

```typescript
// Use semantic colors
status: {
  success: 'text-emerald-600 bg-emerald-50',
  warning: 'text-amber-600 bg-amber-50',
  error: 'text-red-600 bg-red-50',
  info: 'text-blue-600 bg-blue-50',
}
```

### Buttons

Use ShadCN Button variants:
- `default` — primary actions (brand blue)
- `outline` — secondary actions
- `ghost` — tertiary/icon buttons
- `link` — text links

### Transitions

Standard: `transition-all duration-200 ease-out`

```tsx
// Hover states
"hover:bg-neutral-50 hover:border-neutral-300 transition-colors"

// Focus states (keyboard nav)
"focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
```

## 3D Scene Constants

Located in `src/components/explorer/views-3d/shared/constants.ts`:

```typescript
CARD_OPACITY: 0.95
TEXT_COLOR: '#1F2937'  // neutral-800
FONT_SIZE: 14
LINE_HEIGHT: 1.4
```

## Anti-Patterns

**Don't**:
- Use random spacing values (stick to scale)
- Add decoration without purpose
- Nest cards in cards
- Use dark mode colors (light mode primary)
- Add animations without reason

**Do**:
- Use ShadCN components first
- Keep consistent with Linear aesthetic
- Test keyboard navigation
- Verify color contrast (WCAG AA minimum)

## Layout

**Main layout**: Sidebar (model tree) + Canvas (3D view) + Chat panel (AI)

**Responsive breakpoints**:
- Desktop-first (users need space for 3D views)
- Minimum width: 1280px
- Hide chat panel on narrow screens

---

*Refer to CLAUDE.md for additional code style guidelines*
