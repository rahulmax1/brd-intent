'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, Clock, MessageSquare } from 'lucide-react'
import { ReviewItemSkeleton } from '@/components/skeleton'
import { ProjectStepper } from '@/components/project-stepper'
import { ProjectActionsMenu } from '@/components/project-actions-menu'

type Project = {
  id: string
  name: string
  description: string | null
  phase: string
}

type ModelItem = {
  id: string
  name: string
  description: string
}

type IntentModel = {
  actors: ModelItem[]
  entities: ModelItem[]
  journeys: ModelItem[]
  businessRules: ModelItem[]
}

type ReviewDecision = {
  targetType: string
  targetId: string
  status: 'PENDING' | 'APPROVED' | 'DISPUTED'
  comment: string | null
}

type Props = {
  params: Promise<{ projectId: string }>
}

export default function ConsensusPage({ params }: Props) {
  const router = useRouter()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [model, setModel] = useState<IntentModel | null>(null)
  const [modelVersionId, setModelVersionId] = useState<string | null>(null)
  const [decisions, setDecisions] = useState<Record<string, ReviewDecision>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'preview' | 'review'>('preview')

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

      // Get latest model version
      if (data.project.intentModelVersions?.length > 0) {
        const latestVersion = data.project.intentModelVersions[0]
        setModelVersionId(latestVersion.id)
        setModel(latestVersion.modelData as IntentModel)

        // Fetch existing review decisions
        const decisionsRes = await fetch(`/api/projects/${id}/reviews/${latestVersion.id}`)
        if (decisionsRes.ok) {
          const decisionsData = await decisionsRes.json()
          const decisionsMap: Record<string, ReviewDecision> = {}
          decisionsData.decisions.forEach((d: ReviewDecision) => {
            decisionsMap[`${d.targetType}-${d.targetId}`] = d
          })
          setDecisions(decisionsMap)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleDecision(
    targetType: string,
    targetId: string,
    status: 'APPROVED' | 'DISPUTED',
    comment: string
  ) {
    if (!projectId || !modelVersionId) return

    try {
      const res = await fetch(`/api/projects/${projectId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelVersionId,
          targetType,
          targetId,
          status,
          comment: comment.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit review')
      }

      const data = await res.json()

      // Update local decisions
      setDecisions((prev) => ({
        ...prev,
        [`${targetType}-${targetId}`]: data.decision,
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review')
    }
  }

  function calculateConsensus(): { approved: number; disputed: number; pending: number; total: number } {
    if (!model) return { approved: 0, disputed: 0, pending: 0, total: 0 }

    const allItems = [
      ...model.actors.map(a => ({ type: 'ACTOR', id: a.id })),
      ...model.entities.map(e => ({ type: 'ENTITY', id: e.id })),
      ...model.journeys.map(j => ({ type: 'JOURNEY', id: j.id })),
      ...model.businessRules.map(r => ({ type: 'BUSINESS_RULE', id: r.id })),
    ]

    let approved = 0
    let disputed = 0
    let pending = 0

    allItems.forEach(item => {
      const key = `${item.type}-${item.id}`
      const decision = decisions[key]
      if (decision?.status === 'APPROVED') approved++
      else if (decision?.status === 'DISPUTED') disputed++
      else pending++
    })

    return { approved, disputed, pending, total: allItems.length }
  }

  async function handleMoveToExport() {
    if (!projectId) return

    try {
      await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: 'EXPORT' }),
      })
      router.push(`/projects/${projectId}/export`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move to export')
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

  const consensus = calculateConsensus()
  const consensusPercent = consensus.total > 0
    ? Math.round((consensus.approved / consensus.total) * 100)
    : 0

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
          <div className="flex items-start justify-between gap-4">
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
            {project && (
              <ProjectActionsMenu
                projectId={projectId!}
                projectName={project.name}
                hasModel={!!model}
              />
            )}
          </div>
        </div>
      </div>

      {/* Stepper */}
      <ProjectStepper
        projectId={projectId!}
        currentPhase={project?.phase || 'CONSENSUS'}
        currentStep="consensus"
      />

      {/* Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === 'preview'
                ? 'text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Draft Preview
            {activeTab === 'preview' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('review')}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === 'review'
                ? 'text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Review & Vote
            {activeTab === 'review' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        </div>

        <div className="space-y-6">
          {activeTab === 'preview' ? (
            /* Draft Preview */
            <DraftPreview model={model} />
          ) : (
            /* Review Mode */
            <>
          {/* Consensus Progress */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Consensus Progress
              </h2>
              <div className="text-2xl font-bold text-gray-900">
                {consensusPercent}%
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="rounded-lg bg-gray-50 px-4 py-3">
                <div className="text-2xl font-bold text-gray-900">{consensus.total}</div>
                <div className="text-xs text-gray-600">Total Items</div>
              </div>
              <div className="rounded-lg bg-green-50 px-4 py-3">
                <div className="text-2xl font-bold text-green-700">{consensus.approved}</div>
                <div className="text-xs text-green-700">Approved</div>
              </div>
              <div className="rounded-lg bg-red-50 px-4 py-3">
                <div className="text-2xl font-bold text-red-700">{consensus.disputed}</div>
                <div className="text-xs text-red-700">Disputed</div>
              </div>
              <div className="rounded-lg bg-gray-50 px-4 py-3">
                <div className="text-2xl font-bold text-gray-700">{consensus.pending}</div>
                <div className="text-xs text-gray-700">Pending</div>
              </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${consensusPercent}%` }}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Review Sections */}
          <ReviewSection
            title="Actors"
            items={model.actors}
            type="ACTOR"
            decisions={decisions}
            onDecision={handleDecision}
          />

          <ReviewSection
            title="Entities"
            items={model.entities}
            type="ENTITY"
            decisions={decisions}
            onDecision={handleDecision}
          />

          <ReviewSection
            title="Journeys"
            items={model.journeys}
            type="JOURNEY"
            decisions={decisions}
            onDecision={handleDecision}
          />

          <ReviewSection
            title="Business Rules"
            items={model.businessRules}
            type="BUSINESS_RULE"
            decisions={decisions}
            onDecision={handleDecision}
          />

          {/* Actions */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Link
                  href={`/projects/${projectId}/draft`}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-all duration-150"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Edit Model
                </Link>
                <p className="mt-2 text-xs text-gray-500">
                  Review and modify the intent model
                </p>
              </div>

              {consensusPercent >= 80 && (
                <div>
                  <button
                    onClick={handleMoveToExport}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 active:scale-[0.98] transition-all duration-150"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Generate Artifacts
                  </button>
                  <p className="mt-2 text-xs text-gray-500">
                    {consensusPercent}% consensus reached
                  </p>
                </div>
              )}
            </div>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function DraftPreview({ model }: { model: IntentModel | null }) {
  if (!model) return null

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Intent Model Summary
        </h2>
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Actors" count={model.actors.length} />
          <StatCard label="Entities" count={model.entities.length} />
          <StatCard label="Journeys" count={model.journeys.length} />
          <StatCard label="Business Rules" count={model.businessRules.length} />
        </div>
      </div>

      {/* Actors */}
      <PreviewSection title="Actors" items={model.actors} />

      {/* Entities */}
      <PreviewSection title="Entities" items={model.entities} />

      {/* Journeys */}
      <PreviewSection title="Journeys" items={model.journeys} />

      {/* Business Rules */}
      <PreviewSection title="Business Rules" items={model.businessRules} />
    </div>
  )
}

function PreviewSection({
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
            className="border-b border-gray-100 pb-3 last:border-0 last:pb-0"
          >
            <h3 className="text-sm font-medium text-gray-900">{item.name}</h3>
            <p className="mt-1 text-sm text-gray-600">{item.description}</p>
          </div>
        ))}
      </div>
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

function ReviewSection({
  title,
  items,
  type,
  decisions,
  onDecision,
}: {
  title: string
  items: ModelItem[]
  type: string
  decisions: Record<string, ReviewDecision>
  onDecision: (type: string, id: string, status: 'APPROVED' | 'DISPUTED', comment: string) => void
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      <div className="space-y-4">
        {items.map((item) => (
          <ReviewItem
            key={item.id}
            item={item}
            type={type}
            decision={decisions[`${type}-${item.id}`]}
            onDecision={onDecision}
          />
        ))}
      </div>
    </div>
  )
}

function ReviewItem({
  item,
  type,
  decision,
  onDecision,
}: {
  item: ModelItem
  type: string
  decision?: ReviewDecision
  onDecision: (type: string, id: string, status: 'APPROVED' | 'DISPUTED', comment: string) => void
}) {
  const [comment, setComment] = useState(decision?.comment || '')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(status: 'APPROVED' | 'DISPUTED') {
    setSubmitting(true)
    await onDecision(type, item.id, status, comment)
    setSubmitting(false)
  }

  const statusConfig = {
    APPROVED: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', label: 'Approved' },
    DISPUTED: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Disputed' },
    PENDING: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Pending' },
  }

  const status = statusConfig[decision?.status || 'PENDING']
  const StatusIcon = status.icon

  return (
    <div className="py-4 border-b border-gray-200 last:border-0">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900">{item.name}</h3>
          <p className="mt-1 text-sm text-gray-600">{item.description}</p>

          {decision?.comment && (
            <div className="mt-2 flex items-start gap-2">
              <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-500 italic">{decision.comment}</p>
            </div>
          )}
        </div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${status.bg} flex-shrink-0 ml-4`}>
          <StatusIcon className={`h-3.5 w-3.5 ${status.color}`} />
          <span className={`text-xs font-medium ${status.color}`}>
            {status.label}
          </span>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add your feedback or reasoning (optional)..."
          rows={2}
          className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          disabled={submitting}
        />

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSubmit('APPROVED')}
            disabled={submitting}
            className="flex items-center gap-2 rounded bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Approve
          </button>
          <button
            onClick={() => handleSubmit('DISPUTED')}
            disabled={submitting}
            className="flex items-center gap-2 rounded bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            Dispute
          </button>
        </div>
      </div>
    </div>
  )
}
