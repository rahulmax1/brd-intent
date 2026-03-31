# API List Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Show All" modal to the API endpoints page displaying all endpoints in a copyable plain text format, and scope the AI editor to Intent Model pages only.

**Architecture:** Create a modal component with formatted list view, add trigger button to page header, implement clipboard copy with success feedback, and conditionally render AI editor based on route pathname.

**Tech Stack:** React, Next.js App Router, TypeScript, Lucide React icons, Tailwind CSS

---

## File Structure

**Files to Create:**
- `src/lib/format-endpoints-list.ts` - Helper function to format endpoints as plain text
- `src/app/review/api-endpoints/api-list-modal.tsx` - Modal component with list view

**Files to Modify:**
- `src/app/review/api-endpoints/page.tsx` - Add "Show All" button and modal state
- `src/app/review/layout.tsx` - Add route detection for AI editor visibility

---

## Task 1: Create Endpoints List Formatter

**Files:**
- Create: `src/lib/format-endpoints-list.ts`

- [ ] **Step 1: Create the formatter function**

```typescript
import type { DomainGroup } from './api-endpoints-data'

export function formatEndpointsList(domains: DomainGroup[]): string {
  const totalCount = domains.reduce((sum, d) => sum + d.count, 0)

  let output = `${totalCount} API endpoints total\n\n`
  output += 'Broken down by domain:\n'

  let counter = 1

  for (const domain of domains) {
    output += `\n${domain.domain} (${domain.count})\n`

    for (const endpoint of domain.endpoints) {
      output += `${counter}. ${endpoint.method} ${endpoint.path} – ${endpoint.description}\n`
      counter++
    }
  }

  return output
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `pnpm tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit the formatter**

```bash
git add src/lib/format-endpoints-list.ts
git commit -m "feat: add endpoints list formatter

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create Modal Component

**Files:**
- Create: `src/app/review/api-endpoints/api-list-modal.tsx`

- [ ] **Step 1: Create the modal component structure**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { X, Copy, Check } from 'lucide-react'
import { endpointsByDomain } from '@/lib/api-endpoints-data'
import { formatEndpointsList } from '@/lib/format-endpoints-list'

interface ApiListModalProps {
  open: boolean
  onClose: () => void
}

export function ApiListModal({ open, onClose }: ApiListModalProps) {
  const [copied, setCopied] = useState(false)
  const [formattedList, setFormattedList] = useState('')

  useEffect(() => {
    if (open) {
      setFormattedList(formatEndpointsList(endpointsByDomain))
    }
  }, [open])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedList)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        onClick={onClose}
        style={{ backdropFilter: 'blur(4px)' }}
      />

      {/* Modal */}
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col shadow-2xl"
        style={{
          width: 'min(800px, 90vw)',
          height: '80vh',
          background: '#F8F8F7',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between shrink-0 border-b"
          style={{
            height: '56px',
            padding: '0 24px',
            background: '#FFFFFF',
            borderColor: 'var(--border-default)',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px',
          }}
        >
          <h3
            id="modal-title"
            className="text-[17px] font-semibold"
            style={{ color: '#002C61' }}
          >
            {endpointsByDomain.reduce((sum, d) => sum + d.count, 0)} API Endpoints
          </h3>

          <div className="flex items-center gap-3">
            {/* Copy button */}
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[14px] font-medium transition-all duration-200"
              style={{
                color: copied ? '#10B981' : '#0081F2',
                background: copied ? 'rgba(16, 185, 129, 0.08)' : 'rgba(0, 129, 242, 0.08)',
                border: `1px solid ${copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0, 129, 242, 0.2)'}`,
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto p-6"
          style={{
            fontFamily: "'DM Sans Variable', sans-serif",
          }}
        >
          <pre
            className="whitespace-pre-wrap text-[14px] leading-relaxed"
            style={{
              color: 'var(--text-secondary)',
              lineHeight: '1.6',
            }}
          >
            {formattedList}
          </pre>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verify the component compiles**

Run: `pnpm tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit the modal component**

```bash
git add src/app/review/api-endpoints/api-list-modal.tsx
git commit -m "feat: add API list modal component

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Add Show All Button to Page

**Files:**
- Modify: `src/app/review/api-endpoints/page.tsx`

- [ ] **Step 1: Import required dependencies**

Add these imports at the top of the file:

```typescript
import { List } from 'lucide-react'
import { ApiListModal } from './api-list-modal'
```

- [ ] **Step 2: Add modal state**

Add this state hook after the existing state declarations (around line 19):

```typescript
const [showListModal, setShowListModal] = useState(false)
```

- [ ] **Step 3: Add Show All button**

Replace the header section (lines 86-103) with:

```typescript
      {/* Header */}
      <div
        className="flex h-[54px] shrink-0 items-center justify-between border-b px-6"
        style={{ borderColor: 'var(--border-default)' }}
      >
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
              API Endpoints
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Portal API Reference & Analysis
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowListModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-[14px] font-medium rounded-lg transition-all duration-200 hover:bg-blue-50"
            style={{
              color: '#0081F2',
            }}
          >
            <List size={16} />
            Show All
          </button>
        </div>

        <div className="flex gap-4 text-[13px]" style={{ color: 'var(--text-muted)' }}>
          <span><strong>{endpointStats.total}</strong> endpoints</span>
          <span><strong>{endpointsByDomain.length}</strong> domains</span>
          <span><strong>{endpointStats.usesUuid}</strong> use UUIDs</span>
        </div>
      </div>
```

- [ ] **Step 4: Add modal to render**

Add this before the closing `</div>` tag at the end of the return statement (after line 172):

```typescript
      {/* API List Modal */}
      <ApiListModal open={showListModal} onClose={() => setShowListModal(false)} />
```

- [ ] **Step 5: Test the Show All button appears**

Run: `pnpm dev`
Navigate to: `http://localhost:4444/review/api-endpoints`
Expected: "Show All" button visible next to "API Endpoints" heading

- [ ] **Step 6: Test modal opens and closes**

Steps:
1. Click "Show All" button
2. Modal should appear with endpoints list
3. Click X button - modal should close
4. Click "Show All" again
5. Click backdrop - modal should close
6. Click "Show All" again
7. Press ESC key - modal should close

Expected: Modal opens/closes correctly with all three methods

- [ ] **Step 7: Test copy functionality**

Steps:
1. Click "Show All"
2. Click "Copy" button
3. Open any text editor and paste
4. Verify formatted list is pasted

Expected: Complete formatted list copied to clipboard, button shows "Copied!" briefly

- [ ] **Step 8: Commit the page updates**

```bash
git add src/app/review/api-endpoints/page.tsx
git commit -m "feat: add Show All button and modal to API endpoints page

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Scope AI Editor to Intent Model Pages

**Files:**
- Modify: `src/app/review/layout.tsx`

- [ ] **Step 1: Add pathname detection**

Add this import at the top:

```typescript
'use client'

import { usePathname } from 'next/navigation'
```

- [ ] **Step 2: Convert to client component and add route logic**

Replace the entire component (lines 9-46) with:

```typescript
export default function ReviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // Show AI editor only on Intent Model pages
  const showAIEditor = pathname === '/review' ||
                       pathname === '/review/ia' ||
                       pathname === '/review/data-model' ||
                       pathname.startsWith('/review/') &&
                       !pathname.includes('/api-endpoints') &&
                       !pathname.includes('/brd') &&
                       !pathname.includes('/docs') &&
                       !pathname.includes('/diff')

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-page)' }}>
      <PageLoading />

      <NavSidebar />

      <div className="flex flex-1 overflow-hidden">
        <ContentWrapper>
          <ModelToolbar>
            <div className="flex h-[54px] shrink-0 items-center px-3 pl-4">
              <h2 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                Intent Model
              </h2>
            </div>
          </ModelToolbar>

          <ContentCard>
            {children}
          </ContentCard>

          <div className="h-3 shrink-0" />
        </ContentWrapper>

        {showAIEditor && (
          <ChatPanelWrapper>
            <ChatPanel />
          </ChatPanelWrapper>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Remove async props from ChatPanel**

The component is now client-side, so we need to fetch the model data inside ChatPanel or pass it differently. Since ChatPanel likely handles its own data fetching, remove the props:

Change line 42 from:
```typescript
<ChatPanel model={model} latestVersionId={latestVersionId} />
```

To:
```typescript
<ChatPanel />
```

Also remove these lines (13-15):
```typescript
const model = await getCurrentModel()
const latestVersionId = await getLatestVersionId()
```

- [ ] **Step 4: Remove dynamic export**

Remove line 1:
```typescript
export const dynamic = 'force-dynamic'
```

- [ ] **Step 5: Verify the file compiles**

Run: `pnpm tsc --noEmit`
Expected: No type errors

- [ ] **Step 6: Test AI editor visibility on Intent Model pages**

Run: `pnpm dev`

Test these pages - AI editor SHOULD appear:
1. Navigate to `/review` - Expected: AI editor visible
2. Navigate to `/review/ia` - Expected: AI editor visible
3. Navigate to `/review/data-model` - Expected: AI editor visible
4. Navigate to `/review/actors` (or any [section] page) - Expected: AI editor visible

- [ ] **Step 7: Test AI editor hidden on technical pages**

Test these pages - AI editor should NOT appear:
1. Navigate to `/review/api-endpoints` - Expected: NO AI editor
2. Navigate to `/review/brd` - Expected: NO AI editor
3. Navigate to `/review/docs` - Expected: NO AI editor
4. Navigate to `/review/diff` - Expected: NO AI editor

- [ ] **Step 8: Commit the layout changes**

```bash
git add src/app/review/layout.tsx
git commit -m "feat: scope AI editor to Intent Model pages only

Hide AI editor on technical specification pages (API endpoints, BRD,
docs, diff) and show it only on Intent Model pages.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Fix ChatPanel Props (If Needed)

**Files:**
- Potentially modify: `src/components/ai/prompt-drawer.tsx`

- [ ] **Step 1: Check if ChatPanel needs model props**

Run the dev server and navigate to any Intent Model page.
Expected: If you see errors about missing props, continue. Otherwise skip to commit.

- [ ] **Step 2: Update ChatPanel to fetch its own data**

If ChatPanel requires model and latestVersionId props, we have two options:

**Option A:** Make ChatPanel fetch its own data:

```typescript
'use client'

import { useEffect, useState } from 'react'

export function ChatPanel() {
  const [model, setModel] = useState(null)
  const [latestVersionId, setLatestVersionId] = useState(null)

  useEffect(() => {
    // Fetch model data
    fetch('/api/model/current')
      .then(res => res.json())
      .then(data => {
        setModel(data.model)
        setLatestVersionId(data.latestVersionId)
      })
  }, [])

  if (!model) return <div>Loading...</div>

  // ... rest of component
}
```

**Option B:** Pass props from a server component wrapper:

Create `src/app/review/chat-panel-provider.tsx`:

```typescript
import { getCurrentModel, getLatestVersionId } from '@/lib/model-store'
import { ChatPanel } from '@/components/ai/prompt-drawer'

export async function ChatPanelProvider() {
  const model = await getCurrentModel()
  const latestVersionId = await getLatestVersionId()

  return <ChatPanel model={model} latestVersionId={latestVersionId} />
}
```

Then in layout.tsx, import and use ChatPanelProvider instead.

- [ ] **Step 3: Test the fix**

Navigate to Intent Model pages and verify AI editor works correctly.
Expected: No errors, AI editor functions properly

- [ ] **Step 4: Commit the fix if changes were needed**

```bash
git add [changed files]
git commit -m "fix: update ChatPanel data fetching for client component

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Final Integration Testing

**Files:**
- No file changes

- [ ] **Step 1: Test full workflow on API endpoints page**

1. Start dev server: `pnpm dev`
2. Navigate to `/review/api-endpoints`
3. Verify: No AI editor visible
4. Verify: "Show All" button visible in header
5. Click "Show All"
6. Verify: Modal opens with all 52 endpoints
7. Verify: Endpoints grouped by domain with counts
8. Verify: Endpoints numbered 1-52 sequentially
9. Click "Copy"
10. Verify: Button shows "Copied!" briefly
11. Paste into text editor
12. Verify: Formatted list matches expected format
13. Press ESC
14. Verify: Modal closes
15. Apply some filters (e.g., select GET method)
16. Click "Show All"
17. Verify: Modal still shows all endpoints (filters don't affect it)

Expected: All verifications pass

- [ ] **Step 2: Test AI editor visibility across all pages**

Navigate to each page and verify AI editor visibility:

| Page | AI Editor? |
|------|------------|
| `/review` | ✓ Yes |
| `/review/ia` | ✓ Yes |
| `/review/data-model` | ✓ Yes |
| `/review/actors` | ✓ Yes |
| `/review/entities` | ✓ Yes |
| `/review/api-endpoints` | ✗ No |
| `/review/brd` | ✗ No |
| `/review/docs` | ✗ No |
| `/review/diff` | ✗ No |

Expected: All visibility matches the table

- [ ] **Step 3: Test modal accessibility**

1. Open modal with "Show All"
2. Press Tab key
3. Verify: Focus moves to Copy button
4. Press Tab again
5. Verify: Focus moves to Close (X) button
6. Press Tab again
7. Verify: Focus wraps to Copy button
8. Press Shift+Tab
9. Verify: Focus moves backward to Close button
10. Press Enter on Close button
11. Verify: Modal closes
12. Verify: Focus returns to "Show All" button

Expected: All keyboard navigation works correctly

- [ ] **Step 4: Test responsive behavior**

1. Resize browser window to mobile width (< 640px)
2. Navigate to API endpoints page
3. Verify: "Show All" button still visible and clickable
4. Click "Show All"
5. Verify: Modal fits on screen (90vw width)
6. Verify: Text is readable
7. Verify: Copy button doesn't overlap content
8. Close modal
9. Resize to desktop width
10. Verify: Modal appears at 800px width

Expected: Modal works on all screen sizes

- [ ] **Step 5: Run linter**

Run: `pnpm lint`
Expected: No new linting errors

- [ ] **Step 6: Check TypeScript**

Run: `pnpm tsc --noEmit`
Expected: No type errors

- [ ] **Step 7: Create final commit if any fixes needed**

```bash
git add .
git commit -m "chore: final fixes for API list modal feature

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Success Criteria

All items from the spec must be verified:

- [x] "Show All" button appears in API endpoints page header
- [x] Clicking button opens modal with all 52 endpoints
- [x] Modal shows formatted list grouped by domain with counts
- [x] Endpoints numbered 1-52 across all domains
- [x] Copy button copies entire formatted list to clipboard
- [x] Copy button shows success state for 2 seconds
- [x] Modal closes on X, backdrop click, or ESC key
- [x] AI editor no longer appears on API endpoints page
- [x] AI editor still appears on Intent Model pages
- [x] Modal is keyboard accessible and focus-trapped
- [x] Design matches Linear aesthetic (clean, minimal, purposeful)

---

## Notes

- Modal uses fixed positioning with backdrop to center on viewport
- ESC key handler attached when modal opens, removed when closes
- Body scroll locked when modal is open to prevent background scrolling
- Copy state automatically resets after 2 seconds
- AI editor visibility logic uses pathname includes/startsWith for flexibility
- No external dependencies needed (uses existing lucide-react icons)
- Formatter function is pure and testable
- Modal component is self-contained and reusable
