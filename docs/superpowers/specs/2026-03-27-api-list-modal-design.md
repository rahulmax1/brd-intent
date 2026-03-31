# API Endpoints List View Modal Design

**Date:** 2026-03-27
**Status:** Approved
**Context:** Add a plain text list view of all API endpoints accessible via modal, and scope AI editor to Intent Model pages only

## Problem

The API endpoints page currently shows endpoints as filterable cards, which is great for exploration and detail. However, users need a way to quickly see and copy a complete plain text list of all endpoints grouped by domain (similar to the Slack message format). Additionally, the AI editor should only appear on Intent Model pages, not on the API endpoints page.

## Solution

### 1. Add "Show All" Modal

Add a "Show All" button in the page header that opens a modal dialog displaying all 52 endpoints in a formatted plain text list with a copy button.

**Why:** A modal provides focused access to the full list without disrupting the main card-based interface. It's a reference/utility tool that doesn't need to coexist with the filter controls.

### 2. Scope AI Editor to Intent Model Pages

Remove the AI editor from the API endpoints page. Keep it visible only on Intent Model-related pages (IA, data model, journeys, etc.).

**Why:** The AI editor is designed for iterating on the business requirements model. API endpoints are technical specifications that don't benefit from the same conversational editing workflow.

## Design Details

### Modal Structure

**Trigger Button:**
- Location: Page header, to the right of "API Endpoints" heading
- Text: "Show All"
- Icon: List icon (from lucide-react)
- Style: Clean text button with icon, #0081F2 color, hover state
- Placement: `<h2>API Endpoints</h2> <button>Show All</button>`

**Modal Layout:**
```
┌───────────────────────────────────────────────────────┐
│  52 API Endpoints                          [Copy] [X] │ ← Header (sticky)
├───────────────────────────────────────────────────────┤
│                                                       │
│  Broken down by domain:                               │
│                                                       │
│  HBLs/Shipments (4)                                   │
│  1. GET /api/hbls – list with filtering (status...)  │
│  2. GET /api/hbls/:id – get single HBL details       │
│  3. PATCH /api/hbls/:id – update HBL (ACFS: edit...) │
│  4. GET /api/hbls/:id/audit-trail – full hop history │
│                                                       │
│  Bookings (6)                                         │
│  5. GET /api/bookings – list (filter by status...)   │
│  ...                                                  │
│                                                       │ ← Scrollable
│  [Full list continues]                                │
│                                                       │
└───────────────────────────────────────────────────────┘
```

**Modal Specifications:**
- Max-width: 800px
- Height: 80vh (80% of viewport height)
- Background: #F8F8F7 (warm off-white)
- Border-radius: 12px
- Shadow: 0 8px 32px rgba(0,0,0,0.12)
- Backdrop: rgba(0,0,0,0.4) with backdrop-blur(4px)
- Position: Centered viewport
- Z-index: 50

**Modal Header:**
- Sticky at top of modal
- Contains: Title + Copy button + Close button
- Height: 56px
- Border-bottom: 1px solid var(--border-default)
- Background: #FFFFFF
- Padding: 16px 24px

**Copy Button:**
- Position: Top-right, before close button
- Style: Blue (#0081F2) with icon
- States:
  - Default: "Copy" with Copy icon
  - Copied: "Copied!" with Check icon, green (#10B981)
  - Transition: 200ms
- Functionality: Copies entire formatted list to clipboard
- Success feedback: Button changes color/text for 2 seconds

**Close Button:**
- Position: Top-right corner
- Icon: X (lucide-react)
- Size: 20px
- Color: var(--text-muted)
- Hover: var(--text-primary)

**Content Area:**
- Padding: 24px
- Overflow-y: auto
- Custom scrollbar styling
- Font: DM Sans

### Text Format Specification

The modal displays a plain text formatted list:

```
52 API endpoints total

Broken down by domain:

HBLs/Shipments (4)
1. GET /api/hbls – list with filtering (status, site, milestone, LSP)
2. GET /api/hbls/:id – get single HBL details
3. PATCH /api/hbls/:id – update HBL (ACFS: edit details, milestones)
4. GET /api/hbls/:id/audit-trail – full hop history

Bookings (6)
5. GET /api/bookings – list (filter by status, site, date, company)
6. GET /api/bookings/:id – get booking details
7. POST /api/bookings – create booking
8. POST /api/bookings/calculate-fees – fee calculation before booking
9. PATCH /api/bookings/:id – modify slot/driver/truck/HBLs
10. POST /api/bookings/:id/cancel – cancel booking

[Continue for all domains...]
```

**Format Rules:**
- Total count on first line
- Blank line, then "Broken down by domain:"
- Blank line before each domain
- Domain name with count: `Domain Name (N)`
- Endpoints: `N. METHOD /path – description`
- Use em-dash (–) between path and description
- Numbers run continuously across all domains (1-52)
- Descriptions shortened to fit single line, key info preserved

**Typography:**
- Title: 17px, semibold, #002C61 (ACFS navy)
- Total count: 15px, regular, var(--text-primary)
- Domain headers: 17px, semibold, var(--text-primary)
- Domain counts: 14px, regular, var(--text-muted), in parentheses
- Endpoint lines: 14px, regular, var(--text-secondary)
- Line height: 1.6
- METHOD and path: font-mono, slightly bolder
- Description: regular weight

### Interaction Behavior

**Opening Modal:**
1. User clicks "Show All" button
2. Modal fades in (200ms ease-out)
3. Backdrop appears simultaneously
4. Focus moves to modal
5. Body scroll locked
6. List scrolled to top

**Closing Modal:**
1. User clicks X button, backdrop, or presses ESC
2. Modal fades out (150ms ease-in)
3. Focus returns to "Show All" button
4. Body scroll unlocked

**Copy Action:**
1. User clicks "Copy" button
2. Entire formatted text copied to clipboard
3. Button shows "Copied!" with green checkmark
4. After 2 seconds, button reverts to "Copy"
5. If copy fails, show error toast (edge case)

**Keyboard Navigation:**
- ESC: Close modal
- Tab: Cycle through Copy button → Close button → back to Copy
- Enter/Space on buttons: Activate
- Focus trap: Can't tab outside modal while open

### AI Editor Scoping

**Current Behavior:**
The AI editor (chat panel) appears on all review pages, including API endpoints.

**New Behavior:**
The AI editor should only appear on Intent Model pages:
- `/review/ia` - Information Architecture
- `/review/[section]` - Dynamic intent model sections (actors, entities, journeys, rules)
- `/review/data-model` - Data model view
- Any other pages focused on business requirements

**Hidden on:**
- `/review/api-endpoints` - API Endpoints (this page)
- `/review/brd` - BRD document view
- `/review/docs` - Documentation view
- Other technical specification pages

**How to Apply:**
Locate where the AI editor is rendered (likely in a shared layout component or wrapper). Add route detection:

```typescript
const showAIEditor = pathname.includes('/review/ia') ||
                     pathname.includes('/review/data-model') ||
                     (pathname.startsWith('/review/') &&
                      !pathname.includes('/api-endpoints') &&
                      !pathname.includes('/brd') &&
                      !pathname.includes('/docs'))
```

## Implementation Plan

### Components to Create

**1. `api-list-modal.tsx`**
- Modal dialog component
- Props: `open: boolean`, `onClose: () => void`
- Renders formatted list from `endpointsByDomain`
- Handles copy-to-clipboard
- Manages copy success state
- Implements keyboard shortcuts
- Focus trap

**2. Helper function: `generateEndpointsList()`**
- Location: `lib/api-endpoints-data.ts` or new `lib/format-endpoints-list.ts`
- Input: `endpointsByDomain` array
- Output: Formatted string ready for clipboard
- Generates numbered list with proper formatting
- Handles text truncation for descriptions

### Components to Modify

**1. `src/app/review/api-endpoints/page.tsx`**
- Add state: `const [showListModal, setShowListModal] = useState(false)`
- Add "Show All" button next to heading
- Import and render `<ApiListModal>` component
- Pass open state and close handler

**2. Layout component (wherever AI editor lives)**
- Add route detection logic
- Conditionally render AI editor based on route
- Ensure clean mounting/unmounting

### Data Flow

1. User clicks "Show All" button
2. `setShowListModal(true)` called
3. Modal component mounts and renders
4. Modal fetches data from `endpointsByDomain` (already imported)
5. Helper function formats data into text string
6. Modal displays formatted text
7. User clicks "Copy"
8. `navigator.clipboard.writeText(formattedText)` called
9. Success state shown
10. User closes modal
11. `setShowListModal(false)` called
12. Modal unmounts

## Technical Considerations

### Accessibility
- Modal has `role="dialog"` and `aria-modal="true"`
- Modal title in `aria-labelledby`
- Focus trap implemented (using focus-trap-react or manual)
- ESC key closes modal
- Focus returns to trigger button on close
- All interactive elements keyboard accessible

### Performance
- Modal component lazy-loaded (React.lazy) since it's not used on initial render
- Text formatting memoized with useMemo
- No performance concerns (52 endpoints = ~3KB of text)

### Browser Compatibility
- `navigator.clipboard.writeText()` works in all modern browsers
- Fallback not needed (project targets modern browsers)
- backdrop-blur may not work in older browsers (graceful degradation)

### Responsive Design
- Modal width: 800px max, 90vw on smaller screens
- Modal height: 80vh, adjusts on mobile
- Text size maintains readability on mobile
- Copy button doesn't overlap text on narrow screens

### Edge Cases
- What if clipboard API fails? Show error toast: "Copy failed. Please try again."
- What if user has very tall screen? Modal max-height ensures it doesn't stretch
- What if user opens modal, applies filters, then opens modal again? Modal always shows all endpoints (filters don't affect it)

## Design System Alignment

**Color Palette:**
- Primary blue: #0081F2 (interactive elements)
- Navy: #002C61 (ACFS brand, headers)
- Success green: #10B981 (copy confirmation)
- Neutrals: var(--text-primary), var(--text-secondary), var(--text-muted)
- Backgrounds: #F8F8F7 (warm off-white), #FFFFFF (white)

**Typography:**
- Font family: DM Sans Variable
- Scales: 14px, 15px, 17px
- Weights: Regular (400), Medium (500), Semibold (600)
- Line height: 1.6 for readability

**Spacing:**
- Consistent with existing page: 16px, 24px base units
- Modal padding: 24px
- Header padding: 16px 24px
- Line spacing: 1.6 line-height provides visual rhythm

**Interactions:**
- Transitions: 200ms ease-out (open), 150ms ease-in (close)
- Hover states: Subtle color shifts
- Focus states: Ring with ring-ring color
- Button active states: Slight scale/opacity change

## Open Questions

None - design is approved and ready for implementation.

## Success Criteria

- [ ] "Show All" button appears in API endpoints page header
- [ ] Clicking button opens modal with all 52 endpoints
- [ ] Modal shows formatted list grouped by domain with counts
- [ ] Endpoints numbered 1-52 across all domains
- [ ] Copy button copies entire formatted list to clipboard
- [ ] Copy button shows success state for 2 seconds
- [ ] Modal closes on X, backdrop click, or ESC key
- [ ] AI editor no longer appears on API endpoints page
- [ ] AI editor still appears on Intent Model pages
- [ ] Modal is keyboard accessible and focus-trapped
- [ ] Design matches Linear aesthetic (clean, minimal, purposeful)
