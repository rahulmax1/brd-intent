# Review Step Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Review phase between Draft and Consensus so users can explore the intent model visually (2D graph, 3D, intent diagram, diffs) before voting.

**Architecture:** Insert a REVIEW phase into the project stepper and phase flow. Create a new page at `/projects/[projectId]/review` that reuses existing `ExplorerTabs` components (Graph, Intent, 3D, Model, Source) plus the `SideBySideDiff` component for version diffs. Update Draft to transition to Review instead of Consensus.

**Tech Stack:** Next.js, React, TypeScript, TailwindCSS, ReactFlow, three.js/3d-force-graph, existing explorer components

---

### Task 1: Update Project Stepper — Add REVIEW Phase

**Files:**
- Modify: `src/components/project-stepper.tsx:19-26`

- [ ] **Step 1: Add REVIEW to steps array and phaseOrder**

In `src/components/project-stepper.tsx`, update the `steps` array and `phaseOrder`:

```typescript
const steps: Step[] = [
  { id: 'upload', label: 'Upload', href: '/upload', phase: 'UPLOAD' },
  { id: 'draft', label: 'Draft', href: '/draft', phase: 'DRAFT' },
  { id: 'review', label: 'Review', href: '/review', phase: 'REVIEW' },
  { id: 'consensus', label: 'Consensus', href: '/consensus', phase: 'CONSENSUS' },
  { id: 'export', label: 'Export', href: '/export', phase: 'EXPORT' },
]

const phaseOrder = ['UPLOAD', 'DRAFT', 'REVIEW', 'CONSENSUS', 'EXPORT']
```

- [ ] **Step 2: Verify stepper renders correctly**

Run: `pnpm lint`

- [ ] **Step 3: Commit**

```bash
git add src/components/project-stepper.tsx
git commit -m "feat: add REVIEW phase to project stepper"
```

---

### Task 2: Update Phase Redirect — Handle REVIEW

**Files:**
- Modify: `src/app/projects/[projectId]/page.tsx:32-38`

- [ ] **Step 1: Add REVIEW route to phaseRoutes map**

In `src/app/projects/[projectId]/page.tsx`, add the REVIEW entry to `phaseRoutes`:

```typescript
const phaseRoutes: Record<string, string> = {
  UPLOAD: `/projects/${projectId}/upload`,
  DRAFT: `/projects/${projectId}/draft`,
  REVIEW: `/projects/${projectId}/review`,
  CONSENSUS: `/projects/${projectId}/consensus`,
  EXPORT: `/projects/${projectId}/export`,
  ARCHIVED: '/projects',
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/projects/[projectId]/page.tsx
git commit -m "feat: handle REVIEW phase in project redirect"
```

---

### Task 3: Update Draft Page — Transition to REVIEW Instead of CONSENSUS

**Files:**
- Modify: `src/app/projects/[projectId]/draft/page.tsx:109-122,196-205`

- [ ] **Step 1: Rename handler and update transition target**

In `src/app/projects/[projectId]/draft/page.tsx`, rename `handleMoveToConsensus` to `handleMoveToReview` and change the phase/route:

```typescript
async function handleMoveToReview() {
  if (!projectId) return

  try {
    await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase: 'REVIEW' }),
    })
    router.push(`/projects/${projectId}/review`)
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to move to review')
  }
}
```

- [ ] **Step 2: Update the button text and handler reference**

Replace the button section (around line 196):

```tsx
<button
  onClick={handleMoveToReview}
  className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
>
  Move to Review
</button>
<p className="mt-2 text-xs text-gray-500">
  Explore and review the model before sharing for consensus.
</p>
```

- [ ] **Step 3: Run lint**

Run: `pnpm lint`

- [ ] **Step 4: Commit**

```bash
git add src/app/projects/[projectId]/draft/page.tsx
git commit -m "feat: draft transitions to review instead of consensus"
```

---

### Task 4: Create Review Page

**Files:**
- Create: `src/app/projects/[projectId]/review/page.tsx`

This is the main new file. It's a client component that:
1. Fetches the project and latest model version
2. Renders the project header, stepper, and a tabbed view
3. Tabs: Graph, Intent, 3D, Diff, Model, Source
4. Footer with "Move to Consensus" button

- [ ] **Step 1: Create the review page**

Create `src/app/projects/[projectId]/review/page.tsx`:

```tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Network,
  Workflow,
  Box,
  GitCompare,
  BookOpen,
  Code2,
} from 'lucide-react'
import { ProjectStepper } from '@/components/project-stepper'
import { ExplorerCanvas } from '@/components/explorer/explorer-canvas'
import { IntentDiagram } from '@/components/explorer/intent-diagram'
import { Graph3D } from '@/components/explorer/graph-3d'
import { ModelReader } from '@/components/explorer/model-reader'
import { ModelSource } from '@/components/explorer/model-source'
import { SideBySideDiff } from '@/components/review/side-by-side-diff'
import type { IntentModel } from '@/domain/intent-model/types'
import type { ExplorerPositions } from '@/lib/explorer-positions-store'

type Project = {
  id: string
  name: string
  description: string | null
  phase: string
}

type ModelVersion = {
  id: string
  versionNumber: number
  modelData: IntentModel
  createdAt: string
}

const tabs = [
  { id: 'graph', label: 'Graph', icon: Network },
  { id: 'intent', label: 'Intent', icon: Workflow },
  { id: '3d', label: '3D', icon: Box },
  { id: 'diff', label: 'Diff', icon: GitCompare },
  { id: 'model', label: 'Model', icon: BookOpen },
  { id: 'source', label: 'Source', icon: Code2 },
] as const

type TabId = (typeof tabs)[number]['id']

type Props = {
  params: Promise<{ projectId: string }>
}

export default function ReviewPage({ params }: Props) {
  const router = useRouter()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [model, setModel] = useState<IntentModel | null>(null)
  const [versions, setVersions] = useState<ModelVersion[]>([])
  const [positions, setPositions] = useState<ExplorerPositions>({})
  const [modelSource, setModelSource] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('graph')

  useEffect(() => {
    async function init() {
      const { projectId: id } = await params
      setProjectId(id)
      fetchData(id)
    }
    init()
  }, [params])

  async function fetchData(id: string) {
    try {
      const res = await fetch(`/api/projects/${id}`)
      if (!res.ok) {
        if (res.status === 404) {
          router.push('/projects')
          return
        }
        throw new Error('Failed to fetch project')
      }
      const data = await res.json()
      setProject(data.project)

      const modelVersions = data.project.intentModelVersions ?? []
      setVersions(modelVersions)

      if (modelVersions.length > 0) {
        setModel(modelVersions[0].modelData as IntentModel)
      }

      // Fetch explorer positions
      try {
        const posRes = await fetch('/api/explorer/positions')
        if (posRes.ok) {
          const posData = await posRes.json()
          setPositions(posData.positions ?? {})
        }
      } catch {
        // Positions are optional — graph will use auto-layout
      }

      // Fetch model source
      try {
        const srcRes = await fetch('/api/model/current')
        if (srcRes.ok) {
          const srcData = await srcRes.json()
          setModelSource(srcData.source ?? '')
        }
      } catch {
        // Source is optional
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleMoveToConsensus() {
    if (!projectId) return

    try {
      await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: 'CONSENSUS' }),
      })
      router.push(`/projects/${projectId}/consensus`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move to consensus')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8F8F7]">
        <div className="text-center">
          <Loader2 className="inline-block h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-4 text-sm text-gray-600">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!model) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8F8F7]">
        <div className="text-center">
          <p className="text-gray-600">No intent model found. Generate a draft first.</p>
          <Link
            href={`/projects/${projectId}/draft`}
            className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-700"
          >
            Go to Draft
          </Link>
        </div>
      </div>
    )
  }

  // For diff tab: need at least 2 versions
  const hasDiff = versions.length >= 2
  const previousModel = hasDiff
    ? (versions[1].modelData as IntentModel)
    : null

  return (
    <div className="flex flex-col h-screen bg-[#F8F8F7]">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white shrink-0">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {project?.name}
            </h1>
            {project?.description && (
              <p className="mt-1 text-sm text-gray-600">
                {project.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="shrink-0">
        <ProjectStepper
          projectId={projectId!}
          currentPhase={project?.phase || 'REVIEW'}
          currentStep="review"
        />
      </div>

      {/* Tab bar */}
      <div
        className="flex items-center gap-1 px-6 shrink-0 border-b border-gray-200 bg-white"
        style={{ height: 44 }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          const isDisabled = tab.id === 'diff' && !hasDiff

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => !isDisabled && setActiveTab(tab.id)}
              disabled={isDisabled}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isDisabled ? 'opacity-40 cursor-not-allowed' : ''
              }`}
              style={{
                color: isActive ? 'var(--accent-blue, #0081F2)' : 'var(--text-muted, #6b7280)',
                background: isActive ? 'var(--bg-blue-subtle, #eff6ff)' : 'transparent',
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'graph' && (
          <ExplorerCanvas model={model} savedPositions={positions} />
        )}
        {activeTab === 'intent' && (
          <IntentDiagram model={model} />
        )}
        {activeTab === '3d' && (
          <Graph3D model={model} />
        )}
        {activeTab === 'diff' && previousModel && (
          <div className="h-full overflow-y-auto p-6">
            <SideBySideDiff previous={previousModel} current={model} />
          </div>
        )}
        {activeTab === 'model' && (
          <ModelReader model={model} />
        )}
        {activeTab === 'source' && (
          <ModelSource source={modelSource} />
        )}
      </div>

      {/* Footer action bar */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <Link
            href={`/projects/${projectId}/draft`}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Draft
          </Link>

          <button
            onClick={handleMoveToConsensus}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Move to Consensus
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 shadow-lg">
          {error}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run lint**

Run: `pnpm lint`

- [ ] **Step 3: Commit**

```bash
git add src/app/projects/[projectId]/review/page.tsx
git commit -m "feat: add review page with explorer tabs and diff view"
```

---

### Task 5: Verify End-to-End Flow

- [ ] **Step 1: Verify the full flow in the browser**

Navigate to a project that has a draft. Confirm:
1. Stepper shows 5 steps: Upload, Draft, Review, Consensus, Export
2. Draft page button says "Move to Review"
3. Clicking it navigates to `/projects/[id]/review`
4. Review page shows tab bar with Graph, Intent, 3D, Diff, Model, Source
5. Graph/Intent/3D tabs render the model visualization
6. Diff tab shows version comparison (or is disabled if only 1 version)
7. "Move to Consensus" button works and advances to consensus page
8. Stepper correctly highlights Review as completed when on Consensus

- [ ] **Step 2: Run lint one final time**

Run: `pnpm lint`

- [ ] **Step 3: Final commit if any lint fixes needed**
