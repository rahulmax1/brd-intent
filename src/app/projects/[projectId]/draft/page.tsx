'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, MessageSquare, Sparkles, CheckCircle2 } from 'lucide-react'
import { ProjectStepper } from '@/components/project-stepper'

type Project = {
  id: string
  name: string
  description: string | null
  phase: string
}

type IntentModel = {
  actors: Array<{ id: string; name: string; description: string }>
  entities: Array<{ id: string; name: string; description: string }>
  journeys: Array<{ id: string; name: string; description: string }>
  businessRules: Array<{ id: string; name: string; description: string }>
}

type Props = {
  params: Promise<{ projectId: string }>
}

export default function DraftPage({ params }: Props) {
  const router = useRouter()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [model, setModel] = useState<IntentModel | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { projectId: id } = await params
      setProjectId(id)
      fetchProject(id)
    }
    init()
  }, [params])

  async function fetchProject(id: string) {
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

      // Check if there's already a model version
      if (data.project.intentModelVersions?.length > 0) {
        const latestVersion = data.project.intentModelVersions[0]
        setModel(latestVersion.modelData as IntentModel)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateDraft() {
    if (!projectId) return

    setGenerating(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/generate-draft`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()

        // If draft already exists (409), reload the page to show it
        if (res.status === 409) {
          window.location.reload()
          return
        }

        throw new Error(data.error || 'Failed to generate draft')
      }

      const data = await res.json()
      setModel(data.modelVersion.modelData as IntentModel)

      // Update project phase to DRAFT
      await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: 'DRAFT' }),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate draft')
    } finally {
      setGenerating(false)
    }
  }

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

  return (
    <div className="min-h-screen bg-[#F8F8F7]">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
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
      <ProjectStepper
        projectId={projectId!}
        currentPhase={project?.phase || 'DRAFT'}
        currentStep="draft"
      />

      {/* Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        {!model ? (
          <EmptyState
            generating={generating}
            error={error}
            onGenerate={handleGenerateDraft}
          />
        ) : (
          <div className="space-y-6">
            <ModelPreview model={model} />

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <button
                onClick={handleMoveToReview}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Move to Review
              </button>
              <p className="mt-2 text-xs text-gray-500">
                Explore and review the model before sharing for consensus.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({
  generating,
  error,
  onGenerate,
}: {
  generating: boolean
  error: string | null
  onGenerate: () => void
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-purple-50 mb-6">
        <Sparkles className="h-10 w-10 text-blue-600" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">
        Generate Draft Intent Model
      </h3>
      <p className="text-sm text-gray-600 max-w-lg mx-auto mb-2">
        AI will analyze your uploaded documents and create a structured intent
        model with actors, entities, journeys, and business rules.
      </p>
      <p className="text-xs text-gray-500 max-w-md mx-auto">
        This usually takes 10-30 seconds depending on document complexity.
      </p>

      {error && (
        <div className="mt-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 max-w-md mx-auto">
          {error}
        </div>
      )}

      <div className="mt-8 space-y-4 max-w-md mx-auto">
        <button
          onClick={onGenerate}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-8 py-3.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {generating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Generating Draft...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Generate Draft
            </>
          )}
        </button>

        {generating && (
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full animate-pulse" style={{ width: '100%' }} />
            </div>
            <p className="text-xs text-center text-gray-600">
              AI is analyzing your documents and generating the intent model...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function ModelPreview({ model }: { model: IntentModel }) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Draft Generated
          </h2>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Actors" count={model.actors.length} />
          <StatCard label="Entities" count={model.entities.length} />
          <StatCard label="Journeys" count={model.journeys.length} />
          <StatCard label="Business Rules" count={model.businessRules.length} />
        </div>
      </div>

      {/* Actors */}
      <Section title="Actors" items={model.actors} />

      {/* Entities */}
      <Section title="Entities" items={model.entities} />

      {/* Journeys */}
      <Section title="Journeys" items={model.journeys} />

      {/* Business Rules */}
      <Section title="Business Rules" items={model.businessRules} />
    </div>
  )
}

function StatCard({ label, count }: { label: string; count: number }) {
  return (
    <div className="rounded-lg bg-gray-50 px-4 py-3">
      <div className="text-2xl font-bold text-gray-900">{count}</div>
      <div className="text-xs text-gray-600">{label}</div>
    </div>
  )
}

function Section({
  title,
  items,
}: {
  title: string
  items: Array<{ id: string; name: string; description: string }>
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50 transition-colors"
          >
            <h3 className="text-sm font-medium text-gray-900">{item.name}</h3>
            <p className="mt-1 text-sm text-gray-600">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
