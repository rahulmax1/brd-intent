# Simplify Review UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip the review UI down to comment thread + status change (approved/disputed). Remove reviewer identity system, structured resolve/defer modals, consensus computation, and content hashing.

**Architecture:** Keep the existing section card layout and renderers. Replace the reviewer-gated review controls with an anonymous comment thread + approve/dispute buttons. Simplify the dashboard to a section list with status + comment count. Update review state to reflect current model (v0.6.0, most OQs resolved).

**Tech Stack:** Next.js 16, React 19, Tailwind v4, Zod, Zustand (remove reviewer store)

---

### Task 1: Simplify Review Types

**Files:**
- Modify: `src/domain/intent-model/types.ts:105-144`

- [ ] **Step 1: Replace review types with simplified versions**

Remove `Reviewer`, `Review`, `ConsensusStatus` types. Simplify `ReviewState`, `SectionReview`:

```typescript
// --- Review State Types ---

export type SectionType = 'actor' | 'entity' | 'journey' | 'business_rule' | 'constraint' | 'open_question'

export type ReviewState = {
  modelVersion: string
  sections: SectionReview[]
}

export type Comment = {
  text: string
  timestamp: string
}

export type SectionReview = {
  targetId: string
  targetType: SectionType
  status: 'pending' | 'approved' | 'disputed'
  comments: Comment[]
}
```

Remove the old `ConsensusStatus` type entirely.

- [ ] **Step 2: Verify no type errors cascade**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Errors in files that import removed types (we'll fix those next)

---

### Task 2: Simplify Review Schemas

**Files:**
- Modify: `src/lib/review-schemas.ts`

- [ ] **Step 1: Simplify the schema**

```typescript
import { z } from 'zod'

export const ReviewActionSchema = z.object({
  targetId: z.string().regex(/^[a-z_]+:.+$/, 'targetId must be in format "type:id"'),
  action: z.enum(['approve', 'dispute', 'comment']),
  comment: z.string().optional(),
})

export type ReviewAction = z.infer<typeof ReviewActionSchema>
```

Remove `ReviewerSchema` entirely. Remove `reviewerId` from action schema. Add `'comment'` action for comment-only submissions.

---

### Task 3: Simplify Review Utils

**Files:**
- Modify: `src/lib/review-utils.ts`

- [ ] **Step 1: Strip to essentials**

Remove hashing, enrichment, consensus computation. Keep only `getAllModelItems`, `buildTargetId`, and structural diff (used by diff page). Remove `EnrichedSectionReview` type.

```typescript
import type {
  IntentModel,
  SectionReview,
  SectionType,
} from '@/domain/intent-model/types'
import { MODEL_KEY_TO_SECTION_TYPE } from '@/domain/intent-model/types'

type ModelItem = { id: string; [key: string]: unknown }

export function getAllModelItems(model: IntentModel): Array<{ item: ModelItem; type: SectionType }> {
  const items: Array<{ item: ModelItem; type: SectionType }> = []
  const { meta, ...sections } = model

  for (const [key, value] of Object.entries(sections)) {
    const sectionType = MODEL_KEY_TO_SECTION_TYPE[key]
    if (!sectionType || !Array.isArray(value)) continue
    for (const item of value) {
      items.push({ item: item as ModelItem, type: sectionType })
    }
  }

  return items
}

export function buildTargetId(type: SectionType, id: string): string {
  return `${type}:${id}`
}

export function getReviewForTarget(sections: SectionReview[], targetId: string): SectionReview {
  return sections.find(s => s.targetId === targetId) ?? {
    targetId,
    targetType: targetId.split(':')[0] as SectionType,
    status: 'pending',
    comments: [],
  }
}

// --- Structural diff (kept for diff page) ---

export type DiffItem = {
  targetId: string
  targetType: SectionType
  change: 'added' | 'removed' | 'modified' | 'unchanged'
  current?: ModelItem
  previous?: ModelItem
}

export function computeStructuralDiff(
  current: IntentModel,
  previous: IntentModel
): DiffItem[] {
  const currentItems = getAllModelItems(current)
  const previousItems = getAllModelItems(previous)
  const diffs: DiffItem[] = []

  const previousMap = new Map(
    previousItems.map(({ item, type }) => [buildTargetId(type, item.id), { item, type }])
  )

  for (const { item, type } of currentItems) {
    const targetId = buildTargetId(type, item.id)
    const prev = previousMap.get(targetId)

    if (!prev) {
      diffs.push({ targetId, targetType: type, change: 'added', current: item })
    } else {
      const currentJson = JSON.stringify(item)
      const prevJson = JSON.stringify(prev.item)
      diffs.push({
        targetId,
        targetType: type,
        change: currentJson === prevJson ? 'unchanged' : 'modified',
        current: item,
        previous: prev.item,
      })
      previousMap.delete(targetId)
    }
  }

  for (const [targetId, { item, type }] of previousMap) {
    diffs.push({ targetId, targetType: type, change: 'removed', previous: item })
  }

  return diffs
}
```

---

### Task 4: Simplify API Route

**Files:**
- Modify: `src/app/api/review/route.ts`

- [ ] **Step 1: Rewrite POST handler**

Remove reviewer validation, content hashing, per-reviewer status aggregation. Support three actions: `approve` (sets status), `dispute` (sets status), `comment` (adds comment without changing status).

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getReviewState, setReviewState } from '@/lib/review-store'
import { ReviewActionSchema } from '@/lib/review-schemas'
import { getAllModelItems, buildTargetId } from '@/lib/review-utils'
import { getCurrentModel } from '@/lib/model-store'

export async function GET() {
  const reviewState = await getReviewState()
  return NextResponse.json(reviewState)
}

export async function POST(request: NextRequest) {
  const intentModel = await getCurrentModel()
  const body = await request.json()
  const parsed = ReviewActionSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { targetId, action, comment } = parsed.data
  const reviewState = await getReviewState()

  let section = reviewState.sections.find(s => s.targetId === targetId)

  if (!section) {
    const modelItems = getAllModelItems(intentModel)
    const [type, id] = targetId.split(':')
    const modelItem = modelItems.find(mi => mi.type === type && mi.item.id === id)

    if (!modelItem) {
      return NextResponse.json({ error: 'Model item not found' }, { status: 404 })
    }

    section = {
      targetId,
      targetType: modelItem.type,
      status: 'pending',
      comments: [],
    }
    reviewState.sections.push(section)
  }

  // Add comment if provided
  if (comment?.trim()) {
    section.comments.push({
      text: comment.trim(),
      timestamp: new Date().toISOString(),
    })
  }

  // Update status for approve/dispute actions
  if (action === 'approve') {
    section.status = 'approved'
  } else if (action === 'dispute') {
    section.status = 'disputed'
  }
  // 'comment' action doesn't change status

  await setReviewState(reviewState)
  return NextResponse.json({ success: true, section })
}
```

---

### Task 5: Update Review Store & State

**Files:**
- Modify: `src/lib/review-store.ts` — remove `reviewers` references
- Modify: `src/domain/intent-model/review-state.json` — reset with simplified structure

- [ ] **Step 1: Update review-state.json**

```json
{
  "modelVersion": "0.6.0",
  "sections": []
}
```

- [ ] **Step 2: Review store stays the same** — it just reads/writes JSON, types flow through

---

### Task 6: Delete Unnecessary Files

**Files:**
- Delete: `src/stores/reviewer-store.ts`
- Delete: `src/components/review/reviewer-selector.tsx`
- Delete: `src/components/review/identity-modal.tsx`
- Delete: `src/components/review/open-question-controls.tsx`

- [ ] **Step 1: Delete the four files**

```bash
rm src/stores/reviewer-store.ts
rm src/components/review/reviewer-selector.tsx
rm src/components/review/identity-modal.tsx
rm src/components/review/open-question-controls.tsx
```

---

### Task 7: Simplify Review Layout

**Files:**
- Modify: `src/app/review/layout.tsx`

- [ ] **Step 1: Remove identity modal, reviewer selector, reviewer state import**

```tsx
export const dynamic = 'force-dynamic'

import { getCurrentModel, getLatestVersionId } from '@/lib/model-store'
import { NavSidebar } from '@/components/review/nav-links'
import { ChatPanel } from '@/components/ai/prompt-drawer'
import { PageLoading } from '@/components/review/page-loading'
import { ChatPanelWrapper, ModelToolbar, ContentWrapper, ContentCard } from '@/components/review/layout-shell'

export default async function ReviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const model = await getCurrentModel()
  const latestVersionId = await getLatestVersionId()

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-page)' }}>
      <PageLoading />

      {/* Left Nav Sidebar */}
      <NavSidebar />

      {/* Main Area */}
      <div className="flex flex-1 overflow-hidden">

        {/* Model Panel */}
        <ContentWrapper>
          {/* Model toolbar */}
          <ModelToolbar>
            <div className="flex h-[54px] shrink-0 items-center px-3 pl-4">
              <h2 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                Intent Model
              </h2>
            </div>
          </ModelToolbar>

          {/* Content card */}
          <ContentCard>
            {children}
          </ContentCard>

          {/* Bottom spacer */}
          <div className="h-3 shrink-0" />
        </ContentWrapper>

        {/* Chat Panel */}
        <ChatPanelWrapper>
          <ChatPanel model={model} latestVersionId={latestVersionId} />
        </ChatPanelWrapper>
      </div>
    </div>
  )
}
```

---

### Task 8: Rewrite Review Controls as Comment Thread

**Files:**
- Modify: `src/components/review/review-controls.tsx`

- [ ] **Step 1: Rewrite as comment thread + approve/dispute**

Replace the old reviewer-gated controls with a simple comment thread and status buttons. Comments are always visible. Textarea for new comment. Approve and Dispute buttons below.

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Textarea } from '@/components/ui/textarea'
import type { SectionReview } from '@/domain/intent-model/types'

type ReviewControlsProps = {
  section: SectionReview
}

function CommentThread({ comments }: { comments: SectionReview['comments'] }) {
  if (comments.length === 0) return null
  return (
    <div className="space-y-3 mb-4">
      {comments.map((c, i) => (
        <div key={i} className="text-sm">
          <p style={{ color: 'var(--text-primary)' }}>{c.text}</p>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {new Date(c.timestamp).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

export function ReviewControls({ section }: ReviewControlsProps) {
  const router = useRouter()
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(action: 'approve' | 'dispute' | 'comment') {
    if (action === 'comment' && !comment.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: section.targetId,
          action,
          comment: comment || undefined,
        }),
      })
      if (res.ok) {
        setComment('')
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <CommentThread comments={section.comments} />

      <Textarea
        placeholder="Add a comment..."
        value={comment}
        onChange={e => setComment(e.target.value)}
        className="min-h-[72px] text-sm"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => submit('approve')}
          disabled={loading}
          className="rounded-[10px] px-4 py-2 text-sm font-medium transition-colors duration-200 disabled:opacity-50"
          style={{ background: 'var(--acfs-navy)', color: 'var(--text-white)' }}
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => submit('dispute')}
          disabled={loading}
          className="rounded-[10px] px-4 py-2 text-sm font-medium transition-colors duration-200 disabled:opacity-50"
          style={{ background: 'transparent', color: '#BE123C', border: '1px solid #E11D48' }}
        >
          Dispute
        </button>
        {comment.trim() && (
          <button
            type="button"
            onClick={() => submit('comment')}
            disabled={loading}
            className="rounded-[10px] px-4 py-2 text-sm font-medium transition-colors duration-200 disabled:opacity-50"
            style={{ color: 'var(--text-secondary)' }}
          >
            Comment only
          </button>
        )}
      </div>
    </div>
  )
}
```

---

### Task 9: Update Section Renderer (SectionCard)

**Files:**
- Modify: `src/components/review/section-renderer.tsx`

- [ ] **Step 1: Remove reviewer dependency, use simplified ReviewControls for all types**

Key changes:
- Remove `currentReviewerId` prop from `SectionCard` and `SectionRendererProps`
- Remove `OpenQuestionControls` import
- Remove `ReviewHistory` component (replaced by `CommentThread` inside `ReviewControls`)
- Always show `ReviewControls` (no reviewer gate)
- Use same `ReviewControls` for open questions too

Update `SectionRendererProps`:
```typescript
type SectionRendererProps = {
  item: Actor | Entity | Journey | BusinessRule | Constraint | OpenQuestion
  type: SectionType
  review: SectionReview
}
```

Update `SectionCard`:
```tsx
export function SectionCard({ item, type, review }: SectionRendererProps) {
  const [isOpen, setIsOpen] = useState(false)
  const displayId = 'name' in item ? (item as { name: string }).name : item.id
  const description = 'description' in item ? (item as { description: string }).description : ''
  return (
    <div
      id={review.targetId}
      className="mb-3 overflow-hidden rounded-xl transition-shadow"
      style={{ background: 'var(--bg-white)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-subtle)' }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen(!isOpen) } }}
        className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left transition-colors duration-200"
        style={{ background: isOpen ? 'var(--bg-card-gray)' : 'var(--bg-white)', borderBottom: isOpen ? '1px solid var(--border-default)' : 'none' }}
      >
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />}
          <h3 className="m-0 text-sm font-bold" style={{ color: 'var(--acfs-navy)' }}>{displayId}</h3>
          {review.comments.length > 0 && (
            <span className="text-xs rounded-full px-1.5 py-0.5" style={{ background: 'var(--bg-card-gray)', color: 'var(--text-muted)' }}>
              {review.comments.length}
            </span>
          )}
        </div>
        <StatusBadge status={review.status} />
      </div>

      {isOpen && (
        <div className="p-4">
          {renderItem(item, type)}
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-default)' }}>
            <ReviewControls section={review} />
          </div>
        </div>
      )}
    </div>
  )
}
```

---

### Task 10: Update Section Page Client

**Files:**
- Modify: `src/components/review/section-page-client.tsx`

- [ ] **Step 1: Remove reviewer store dependency**

```tsx
'use client'

import { SectionCard } from './section-renderer'
import type { SectionReview, SectionType } from '@/domain/intent-model/types'

type ModelItem = { id: string; [key: string]: unknown }

type SectionPageClientProps = {
  items: Array<{
    item: ModelItem
    type: SectionType
    review: SectionReview
  }>
}

export function SectionPageClient({ items }: SectionPageClientProps) {
  return (
    <div className="space-y-4">
      {items.map(({ item, type, review }) => (
        <SectionCard
          key={review.targetId}
          item={item as any}
          type={type}
          review={review}
        />
      ))}
    </div>
  )
}
```

---

### Task 11: Simplify Dashboard

**Files:**
- Modify: `src/components/review/consensus-dashboard.tsx`

- [ ] **Step 1: Rewrite as simple section list with status + comment count**

```tsx
'use client'

import Link from 'next/link'
import { StatusBadge } from './status-badge'
import type { SectionReview, SectionType } from '@/domain/intent-model/types'
import { SECTION_TYPE_TO_URL_PARAM } from '@/domain/intent-model/types'

type DashboardProps = {
  sections: SectionReview[]
  modelVersion: string
}

const sectionTypeLabels: Record<SectionType, string> = {
  actor: 'Actors',
  entity: 'Entities',
  journey: 'Journeys',
  business_rule: 'Business Rules',
  constraint: 'Constraints',
  open_question: 'Open Questions',
}

const sectionTypeOrder: SectionType[] = [
  'actor', 'entity', 'journey', 'business_rule', 'constraint', 'open_question',
]

export function ConsensusDashboard({ sections, modelVersion }: DashboardProps) {
  return (
    <div className="space-y-4">
      {sectionTypeOrder.map(type => {
        const typeSections = sections.filter(s => s.targetType === type)
        if (typeSections.length === 0) return null

        const approved = typeSections.filter(s => s.status === 'approved').length
        const disputed = typeSections.filter(s => s.status === 'disputed').length
        const totalComments = typeSections.reduce((sum, s) => sum + s.comments.length, 0)

        return (
          <Link key={type} href={`/review/${SECTION_TYPE_TO_URL_PARAM[type]}`}>
            <div
              className="rounded-xl px-5 py-4 transition-all duration-200 hover:shadow-md mb-2"
              style={{
                background: 'var(--bg-white)',
                border: '1px solid var(--border-default)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--acfs-navy)' }}>
                    {sectionTypeLabels[type]}
                  </span>
                  <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
                    {typeSections.length} items
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs font-medium">
                  {approved > 0 && <span style={{ color: 'var(--accent-green)' }}>{approved} approved</span>}
                  {disputed > 0 && <span style={{ color: '#E11D48' }}>{disputed} disputed</span>}
                  {totalComments > 0 && <span style={{ color: 'var(--text-muted)' }}>{totalComments} comments</span>}
                </div>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
```

---

### Task 12: Update Dashboard & Section Pages

**Files:**
- Modify: `src/app/review/page.tsx`
- Modify: `src/app/review/[section]/page.tsx`

- [ ] **Step 1: Simplify dashboard page**

```tsx
import { getReviewState } from '@/lib/review-store'
import { getCurrentModel } from '@/lib/model-store'
import { getAllModelItems, buildTargetId, getReviewForTarget } from '@/lib/review-utils'
import { ConsensusDashboard } from '@/components/review/consensus-dashboard'

export const dynamic = 'force-dynamic'

export default async function ReviewDashboard() {
  const intentModel = await getCurrentModel()
  const reviewState = await getReviewState()

  // Build sections for all model items
  const modelItems = getAllModelItems(intentModel)
  const sections = modelItems.map(({ item, type }) => {
    const targetId = buildTargetId(type, item.id)
    return getReviewForTarget(reviewState.sections, targetId)
  })

  return (
    <div className="pb-16">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--acfs-navy)' }}>
          {intentModel.meta.project}
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          v{intentModel.meta.version} — {intentModel.meta.status}
        </p>
      </div>
      <ConsensusDashboard
        sections={sections}
        modelVersion={intentModel.meta.version}
      />
    </div>
  )
}
```

- [ ] **Step 2: Simplify section page**

```tsx
import { notFound } from 'next/navigation'
import { getReviewState } from '@/lib/review-store'
import { getCurrentModel } from '@/lib/model-store'
import { buildTargetId, getReviewForTarget } from '@/lib/review-utils'
import { SectionPageClient } from '@/components/review/section-page-client'
import type { SectionType } from '@/domain/intent-model/types'
import { URL_PARAM_TO_SECTION_TYPE, SECTION_TYPE_TO_MODEL_KEY } from '@/domain/intent-model/types'

export const dynamic = 'force-dynamic'

const sectionLabels: Record<SectionType, string> = {
  actor: 'Actors',
  entity: 'Entities',
  journey: 'Journeys',
  business_rule: 'Business Rules',
  constraint: 'Constraints',
  open_question: 'Open Questions',
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const { section } = await params
  const sectionType = URL_PARAM_TO_SECTION_TYPE[section]
  if (!sectionType) notFound()

  const intentModel = await getCurrentModel()
  const reviewState = await getReviewState()

  const modelKey = SECTION_TYPE_TO_MODEL_KEY[sectionType] as keyof typeof intentModel
  const modelItems = intentModel[modelKey] as Array<{ id: string; [key: string]: unknown }>

  const items = modelItems.map(item => {
    const targetId = buildTargetId(sectionType, item.id)
    const review = getReviewForTarget(reviewState.sections, targetId)
    return { item, type: sectionType, review }
  })

  return (
    <div className="pb-32">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{sectionLabels[sectionType]}</h1>
        <p className="text-base text-muted-foreground">
          {items.length} items
        </p>
      </div>
      <SectionPageClient items={items} />
    </div>
  )
}
```

---

### Task 13: Update StatusBadge

**Files:**
- Modify: `src/components/review/status-badge.tsx`

- [ ] **Step 1: Remove 'revised' status variant**

The `StatusBadge` component currently supports `'revised'` as an effective status. Remove it — only `'pending' | 'approved' | 'disputed'` remain. Check the component and remove the revised case.

---

### Task 14: Verify & Fix

- [ ] **Step 1: Run type check**

Run: `npx tsc --noEmit`
Expected: Clean compile

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: Clean or minor warnings only

- [ ] **Step 3: Test in browser**

1. Open `localhost:4444/review` — dashboard should show section list with status + comment count
2. Click into a section — cards should be expandable with content + comment thread + approve/dispute
3. Add a comment — should appear in thread
4. Approve a section — status badge should update
5. No identity modal should appear
6. Chat panel should still work
