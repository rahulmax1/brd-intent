'use client'

import { useEffect, useState } from 'react'
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
import type { IntentModel } from '@/domain/intent-model/types'
import type { ExplorerPositions } from '@/lib/explorer-positions-store'
import { ProjectStepper } from '@/components/project-stepper'
import { ExplorerCanvas } from '@/components/explorer/explorer-canvas'
import { IntentDiagram } from '@/components/explorer/intent-diagram'
import { Graph3D } from '@/components/explorer/graph-3d'
import { ModelReader } from '@/components/explorer/model-reader'
import { ModelSource } from '@/components/explorer/model-source'
import { SideBySideDiff } from '@/components/review/side-by-side-diff'

type Project = {
  id: string
  name: string
  description: string | null
  phase: string
  intentModelVersions: Array<{
    id: string
    versionNumber: number
    modelData: unknown
    isSeed: boolean
    isSnapshot: boolean
    createdAt: string
  }>
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
  const [previousModel, setPreviousModel] = useState<IntentModel | null>(null)
  const [positions, setPositions] = useState<ExplorerPositions>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('graph')
  const [transitioning, setTransitioning] = useState(false)

  const hasPreviousVersion = previousModel !== null
  const isDiffDisabled = !hasPreviousVersion

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
      const [projectRes, positionsRes] = await Promise.all([
        fetch(`/api/projects/${id}`),
        fetch('/api/explorer/positions'),
      ])

      if (!projectRes.ok) {
        if (projectRes.status === 404) {
          router.push('/projects')
          return
        }
        throw new Error('Failed to fetch project')
      }

      const projectData = await projectRes.json()
      setProject(projectData.project)

      const versions = projectData.project.intentModelVersions
      if (versions?.length > 0) {
        setModel(versions[0].modelData as IntentModel)
        if (versions.length > 1) {
          setPreviousModel(versions[1].modelData as IntentModel)
        }
      }

      if (positionsRes.ok) {
        const posData = await positionsRes.json()
        setPositions(posData.positions ?? {})
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleMoveToConsensus() {
    if (!projectId) return

    setTransitioning(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: 'CONSENSUS' }),
      })

      if (!res.ok) throw new Error('Failed to move to consensus')

      router.push(`/projects/${projectId}/consensus`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move to consensus')
      setTransitioning(false)
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

  if (error && !project) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8F8F7]">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!model) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8F8F7]">
        <div className="text-center">
          <p className="text-gray-600">No model version found for this project.</p>
          <Link
            href={`/projects/${projectId}/draft`}
            className="mt-4 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Draft
          </Link>
        </div>
      </div>
    )
  }

  const effectiveTab = activeTab === 'diff' && isDiffDisabled ? 'graph' : activeTab

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
        className="flex items-center gap-1 px-3 shrink-0"
        style={{
          height: 44,
          borderBottom: '1px solid var(--border-default, #e5e7eb)',
          background: 'var(--bg-page, #F8F8F7)',
        }}
      >
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = effectiveTab === tab.id
          const isDisabled = tab.id === 'diff' && isDiffDisabled
          return (
            <button
              key={tab.id}
              type="button"
              disabled={isDisabled}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                color: isActive
                  ? 'var(--accent-blue, #0081F2)'
                  : 'var(--text-muted, #6b7280)',
                background: isActive
                  ? 'var(--bg-blue-subtle, #eff6ff)'
                  : 'transparent',
              }}
              title={isDisabled ? 'Only one version exists — nothing to diff' : undefined}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {effectiveTab === 'graph' && (
          <ExplorerCanvas model={model} savedPositions={positions} />
        )}
        {effectiveTab === 'intent' && (
          <IntentDiagram model={model} />
        )}
        {effectiveTab === '3d' && (
          <Graph3D model={model} />
        )}
        {effectiveTab === 'diff' && previousModel && (
          <div className="h-full overflow-y-auto p-6">
            <SideBySideDiff previous={previousModel} current={model} />
          </div>
        )}
        {effectiveTab === 'model' && (
          <ModelReader model={model} />
        )}
        {effectiveTab === 'source' && (
          <ModelSource source={JSON.stringify(model, null, 2)} />
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-3">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <Link
            href={`/projects/${projectId}/draft`}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Draft
          </Link>
          <button
            onClick={handleMoveToConsensus}
            disabled={transitioning}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {transitioning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Moving...
              </>
            ) : (
              <>
                Move to Consensus
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-red-600 px-4 py-3 text-sm text-white shadow-lg">
          {error}
        </div>
      )}
    </div>
  )
}
