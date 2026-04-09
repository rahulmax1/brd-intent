'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Sparkles, CheckCircle2, LayoutGrid, Code2, Upload, RefreshCw, AlertTriangle, Shield, Database, Route, Scale, Lock, HelpCircle, FileText, Search, X, ChevronRight, ChevronLeft, MessageSquare, ArrowUpRight } from 'lucide-react'
import type { IntentModel, Actor, Entity, Journey, BusinessRule, Constraint, OpenQuestion } from '@/domain/intent-model/types'
import { ProjectStepper } from '@/components/project-stepper'
import { ProjectActionsMenu } from '@/components/project-actions-menu'

type Document = {
  id: string
  createdAt: string
  processingStatus: string
}

type ModelVersion = {
  id: string
  createdAt: string
}

type Project = {
  id: string
  name: string
  description: string | null
  phase: string
  documents?: Document[]
  intentModelVersions?: ModelVersion[]
}

type GapSuggestion = {
  id: string
  section: string
  type: 'add' | 'modify'
  title: string
  description: string
  evidence: string
  priority: 'high' | 'medium' | 'low'
}

type Props = {
  params: Promise<{ projectId: string }>
}

export default function DraftPage({ params }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [model, setModel] = useState<IntentModel | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draftView, setDraftView] = useState<'preview' | 'source' | 'brd'>('preview')
  const [brdContent, setBrdContent] = useState<string | null>(null)
  const [brdLoading, setBrdLoading] = useState(false)
  const [gaps, setGaps] = useState<GapSuggestion[]>([])
  const [gapsLoading, setGapsLoading] = useState(false)
  const [showGapModal, setShowGapModal] = useState(false)
  const [currentGapIndex, setCurrentGapIndex] = useState(0)
  const [gapComments, setGapComments] = useState<Record<string, string>>({})
  const [submittedGaps, setSubmittedGaps] = useState<Record<string, { comment: string; action: 'accepted' | 'rejected' }>>({})

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
        const shouldRegenerate = searchParams.get('regenerate') === 'true'
        if (shouldRegenerate) {
          // Regenerate requested — reset old model, clear query param, then regenerate
          router.replace(`/projects/${id}/draft`)
          setLoading(false)
          await fetch(`/api/projects/${id}/reset-model`, { method: 'POST' })
          generateDraft(id)
          return
        }
        const latestVersion = data.project.intentModelVersions[0]
        setModel(latestVersion.modelData as IntentModel)
      } else {
        // No model yet — auto-start generation
        setLoading(false)
        generateDraft(id)
        return
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function generateDraft(id: string) {
    setGenerating(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${id}/generate-draft`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()

        // If draft already exists (409), reset old versions and retry
        if (res.status === 409) {
          await fetch(`/api/projects/${id}/reset-model`, { method: 'POST' })
          const retryRes = await fetch(`/api/projects/${id}/generate-draft`, {
            method: 'POST',
          })
          if (retryRes.ok) {
            const retryData = await retryRes.json()
            setModel(retryData.modelVersion.modelData as IntentModel)
            await fetch(`/api/projects/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phase: 'DRAFT' }),
            })
          } else {
            throw new Error('Failed to regenerate draft. Please try again.')
          }
          return
        }

        throw new Error(data.error || 'Failed to generate draft')
      }

      const data = await res.json()
      setModel(data.modelVersion.modelData as IntentModel)

      // Update project phase to DRAFT
      await fetch(`/api/projects/${id}`, {
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

  function handleGenerateDraft() {
    if (!projectId) return
    generateDraft(projectId)
  }

  async function fetchBRD() {
    if (!projectId || brdContent) return
    setBrdLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/artifacts/BRD`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setBrdContent(data.content ?? null)
      }
    } catch {
      setError('Failed to generate BRD')
    } finally {
      setBrdLoading(false)
    }
  }

  async function analyzeGaps() {
    if (!projectId) return
    setGapsLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/analyze-gaps`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setGaps(data.suggestions ?? [])
        setCurrentGapIndex(0)
        setShowGapModal(true)
      } else {
        const data = await res.json()
        setError(data.message ?? 'Gap analysis failed')
      }
    } catch {
      setError('Failed to analyze gaps')
    } finally {
      setGapsLoading(false)
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
            {/* View tabs */}
            <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 w-fit">
              {([
                { id: 'preview' as const, label: 'Preview', icon: LayoutGrid },
                { id: 'source' as const, label: 'Source', icon: Code2 },
                { id: 'brd' as const, label: 'Generated BRD', icon: FileText },
              ]).map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setDraftView(tab.id)
                      if (tab.id === 'brd') fetchBRD()
                    }}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
                      draftView === tab.id
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {draftView === 'preview' ? (
              <ModelPreview model={model} />
            ) : draftView === 'source' ? (
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <span className="text-xs font-medium text-gray-500">intent-model.json</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(model, null, 2))}
                    className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <pre className="p-4 overflow-auto max-h-[600px] text-xs leading-relaxed text-gray-800 font-mono custom-scroll">
                  {JSON.stringify(model, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="space-y-4">
                {/* BRD content */}
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <span className="text-xs font-medium text-gray-500">Generated BRD from Intent Model</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={analyzeGaps}
                        disabled={gapsLoading}
                        className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50"
                      >
                        {gapsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                        Analyze Gaps
                      </button>
                      {brdContent && (
                        <button
                          onClick={() => navigator.clipboard.writeText(brdContent)}
                          className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
                        >
                          Copy
                        </button>
                      )}
                    </div>
                  </div>
                  {brdLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : brdContent ? (
                    <div className="p-6 prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-li:text-gray-600 overflow-auto max-h-[700px] custom-scroll">
                      <BRDRenderer content={brdContent} />
                    </div>
                  ) : (
                    <div className="p-6 text-center text-sm text-gray-500">
                      <p>BRD will be generated from the intent model.</p>
                      <button
                        onClick={fetchBRD}
                        className="mt-3 text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Generate now
                      </button>
                    </div>
                  )}
                </div>

                {/* Submitted gap reviews */}
                {Object.keys(submittedGaps).length > 0 && (
                  <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Gap Review Log</h3>
                    <div className="space-y-2">
                      {Object.entries(submittedGaps).map(([gapId, { comment, action }]) => {
                        const gap = gaps.find(g => g.id === gapId)
                        return (
                          <div key={gapId} className={`flex items-start gap-3 rounded-lg p-3 text-sm ${action === 'accepted' ? 'bg-green-50' : 'bg-gray-50'}`}>
                            <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded whitespace-nowrap mt-0.5 ${action === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                              {action}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900">{gap?.title ?? gapId}</p>
                              {comment && <p className="text-gray-600 mt-0.5">{comment}</p>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Gap Analysis Modal */}
            {showGapModal && gaps.length > 0 && (
              <GapModal
                gaps={gaps}
                currentIndex={currentGapIndex}
                comments={gapComments}
                onCommentChange={(id, val) => setGapComments(prev => ({ ...prev, [id]: val }))}
                onSubmit={(action) => {
                  const gap = gaps[currentGapIndex]
                  setSubmittedGaps(prev => ({ ...prev, [gap.id]: { comment: gapComments[gap.id] ?? '', action } }))
                  if (currentGapIndex < gaps.length - 1) {
                    setCurrentGapIndex(currentGapIndex + 1)
                  } else {
                    setShowGapModal(false)
                  }
                }}
                onPrev={() => setCurrentGapIndex(Math.max(0, currentGapIndex - 1))}
                onNext={() => setCurrentGapIndex(Math.min(gaps.length - 1, currentGapIndex + 1))}
                onClose={() => setShowGapModal(false)}
              />
            )}

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}

            {/* Stale model nudge */}
            {(() => {
              const modelDate = project?.intentModelVersions?.[0]?.createdAt
              const newDocs = modelDate
                ? (project?.documents ?? []).filter(d => d.processingStatus === 'COMPLETED' && new Date(d.createdAt) > new Date(modelDate))
                : []
              if (newDocs.length === 0) return null
              return (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900">
                      {newDocs.length === 1
                        ? 'A document was added after this draft was generated.'
                        : `${newDocs.length} documents were added after this draft was generated.`}
                    </p>
                    <p className="mt-1 text-xs text-amber-700">
                      Regenerate to incorporate the latest content.
                    </p>
                    <button
                      onClick={() => {
                        if (projectId) router.push(`/projects/${projectId}/draft?regenerate=true`)
                      }}
                      className="mt-3 flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 active:scale-[0.98] transition-all duration-150"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Regenerate Draft
                    </button>
                  </div>
                </div>
              )
            })()}

            {/* Actions */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 flex items-center gap-3">
              <button
                onClick={handleMoveToReview}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 active:scale-[0.98] transition-all duration-150"
              >
                Move to Review
              </button>
              <Link
                href={`/projects/${projectId}/upload`}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-all duration-150"
              >
                <Upload className="h-4 w-4" />
                Manage Documents
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const PROGRESS_MESSAGES = [
  'Reading and parsing your documents…',
  'Extracting key concepts and terminology…',
  'Identifying actors and their roles…',
  'Mapping out core entities…',
  'Tracing user journeys and workflows…',
  'Discovering business rules and constraints…',
  'Analyzing entity relationships…',
  'Structuring the intent model…',
  'Validating model consistency…',
  'Finalizing the draft…',
]

function EmptyState({
  generating,
  error,
  onGenerate,
}: {
  generating: boolean
  error: string | null
  onGenerate: () => void
}) {
  const [msgIndex, setMsgIndex] = useState(0)

  useEffect(() => {
    if (!generating) {
      setMsgIndex(0)
      return
    }
    const interval = setInterval(() => {
      setMsgIndex((prev) =>
        prev < PROGRESS_MESSAGES.length - 1 ? prev + 1 : prev,
      )
    }, 3000)
    return () => clearInterval(interval)
  }, [generating])

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
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-8 py-3.5 text-sm font-medium text-white hover:bg-blue-700 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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
          <div className="space-y-3">
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(((msgIndex + 1) / PROGRESS_MESSAGES.length) * 100, 95)}%` }}
              />
            </div>
            <p className="text-xs text-center text-gray-600 transition-opacity duration-300">
              {PROGRESS_MESSAGES[msgIndex]}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function ModelPreview({ model }: { model: IntentModel }) {
  const stats = [
    { label: 'Actors', count: model.actors?.length ?? 0, icon: Shield, color: 'text-blue-600' },
    { label: 'Entities', count: model.entities?.length ?? 0, icon: Database, color: 'text-emerald-600' },
    { label: 'Journeys', count: model.journeys?.length ?? 0, icon: Route, color: 'text-violet-600' },
    { label: 'Rules', count: model.businessRules?.length ?? 0, icon: Scale, color: 'text-amber-600' },
    { label: 'Constraints', count: model.constraints?.length ?? 0, icon: Lock, color: 'text-rose-600' },
    { label: 'Open Questions', count: model.openQuestions?.length ?? 0, icon: HelpCircle, color: 'text-gray-500' },
  ]

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">Draft Generated</h2>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {stats.map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className="rounded-lg bg-gray-50 px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className={`h-3.5 w-3.5 ${s.color}`} />
                  <span className="text-xs text-gray-500">{s.label}</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{s.count}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Actors */}
      {(model.actors?.length ?? 0) > 0 && (
        <SectionCard title="Actors" count={model.actors.length} icon={Shield} iconColor="text-blue-600">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {model.actors.map((actor: Actor) => (
              <div key={actor.id} className="rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">{actor.name}</h3>
                  <IdBadge id={actor.id} />
                  {actor.auth && (
                    <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 whitespace-nowrap">{actor.auth}</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3">{actor.description}</p>
                {actor.responsibilities?.length > 0 && (
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                      {actor.responsibilities.length} Responsibilities
                    </p>
                    <ul className="space-y-1.5">
                      {actor.responsibilities.map(r => (
                        <li key={r.id} className="flex items-start gap-2 text-xs text-gray-600">
                          <IdBadge id={r.id} small />
                          <span>{r.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Entities */}
      {(model.entities?.length ?? 0) > 0 && (
        <SectionCard title="Entities" count={model.entities.length} icon={Database} iconColor="text-emerald-600">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {model.entities.map((entity: Entity) => (
              <div key={entity.id} className="rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-gray-900">{entity.name}</h3>
                  <IdBadge id={entity.id} />
                </div>
                <p className="text-sm text-gray-600 mb-3">{entity.description}</p>
                {entity.key_fields?.length > 0 && (
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                      {entity.key_fields.length} Fields
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {entity.key_fields.map(f => (
                        <span key={f.name} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-700" title={f.description}>
                          <span className="font-medium">{f.name}</span>
                          <span className="text-gray-400">{f.type}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {entity.lifecycle?.states?.length > 0 && (
                  <div className="border-t border-gray-100 pt-3 mt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                      Lifecycle — {entity.lifecycle.states.length} states
                    </p>
                    <div className="flex items-center gap-1 flex-wrap">
                      {entity.lifecycle.states.map((s, i) => (
                        <span key={s} className="flex items-center gap-1 text-[11px]">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium">{s}</span>
                          {i < entity.lifecycle.states.length - 1 && <span className="text-gray-300">→</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Journeys */}
      {(model.journeys?.length ?? 0) > 0 && (
        <SectionCard title="Journeys" count={model.journeys.length} icon={Route} iconColor="text-violet-600">
          <div className="space-y-4">
            {model.journeys.map((journey: Journey) => (
              <div key={journey.id} className="rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-gray-900">{journey.name}</h3>
                  <IdBadge id={journey.id} />
                  {journey.primary_actor && (
                    <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 whitespace-nowrap">{journey.primary_actor}</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3">{journey.success_outcome}</p>
                {journey.steps?.length > 0 && (
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">{journey.steps.length} Steps</p>
                    <ol className="space-y-2">
                      {journey.steps.map(step => (
                        <li key={step.order} className="flex items-start gap-2.5 text-xs">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 flex-shrink-0 mt-0.5">{step.order}</span>
                          <div>
                            <span className="font-medium text-gray-900">{step.title}</span>
                            <span className="text-gray-500 ml-1">— {step.detail}</span>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                {journey.preconditions?.length > 0 && (
                  <div className="border-t border-gray-100 pt-3 mt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                      {journey.preconditions.length} Preconditions
                    </p>
                    <ul className="flex flex-wrap gap-1.5">
                      {journey.preconditions.map((p, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">{p}</span>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Business Rules */}
      {(model.businessRules?.length ?? 0) > 0 && (
        <SectionCard title="Business Rules" count={model.businessRules.length} icon={Scale} iconColor="text-amber-600">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {model.businessRules.map((rule: BusinessRule) => (
              <div key={rule.id} className="rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-center gap-2 mb-2 justify-end">
                  <IdBadge id={rule.id} />
                </div>
                <p className="text-sm text-gray-900 font-medium mb-2">{rule.description}</p>
                <div className="flex items-center gap-3 flex-wrap text-[11px] text-gray-500">
                  {rule.source && <span>Source: <span className="font-medium text-gray-700">{rule.source}</span></span>}
                  {rule.applies_to?.length > 0 && (
                    <span className="flex items-center gap-1 flex-wrap">
                      Applies to: {rule.applies_to.map(a => (
                        <span key={a} className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">{a}</span>
                      ))}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Constraints */}
      {(model.constraints?.length ?? 0) > 0 && (
        <SectionCard title="Constraints" count={model.constraints.length} icon={Lock} iconColor="text-rose-600">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {model.constraints.map((c: Constraint) => (
              <div key={c.id} className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                  <IdBadge id={c.id} small />
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 whitespace-nowrap">{c.type}</span>
                </div>
                <p className="text-sm text-gray-700">{c.constraint}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Open Questions */}
      {(model.openQuestions?.length ?? 0) > 0 && (
        <SectionCard title="Open Questions" count={model.openQuestions.length} icon={HelpCircle} iconColor="text-gray-500">
          <div className="space-y-3">
            {model.openQuestions.map((q: OpenQuestion) => {
              const statusColor = q.status === 'resolved' ? 'bg-green-50 text-green-700' : q.status === 'deferred' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
              return (
                <div key={q.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{q.question}</p>
                      <IdBadge id={q.id} />
                    </div>
                    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0 ${statusColor}`}>{q.status}</span>
                  </div>
                  <p className="text-sm text-gray-600">{q.reason}</p>
                  {q.resolution && (
                    <p className="mt-2 text-xs px-2 py-1.5 rounded bg-green-50 text-green-800">
                      <span className="font-semibold">Resolution: </span>{q.resolution}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </SectionCard>
      )}
    </div>
  )
}

function SectionCard({ title, count, icon: Icon, iconColor, children }: {
  title: string
  count: number
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`h-4.5 w-4.5 ${iconColor}`} />
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{count}</span>
      </div>
      {children}
    </div>
  )
}

function IdBadge({ id, small }: { id: string; small?: boolean }) {
  return (
    <code
      className={`font-mono rounded bg-gray-100 text-gray-500 flex-shrink-0 ${
        small ? 'text-[9px] px-1 py-0.5' : 'text-[10px] px-1.5 py-0.5'
      }`}
    >
      {id}
    </code>
  )
}

function BRDRenderer({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div>
      {lines.map((line, i) => {
        if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold text-gray-900 mt-8 mb-4 first:mt-0">{line.slice(2)}</h1>
        if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-semibold text-gray-900 mt-6 mb-3">{line.slice(3)}</h2>
        if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-medium text-gray-900 mt-4 mb-2">{line.slice(4)}</h3>
        if (line.startsWith('- ')) return <li key={i} className="ml-4 text-sm text-gray-600 mb-1 list-disc">{line.slice(2)}</li>
        if (line.startsWith('> ')) return <blockquote key={i} className="border-l-2 border-gray-300 pl-3 text-sm text-gray-500 italic my-2">{line.slice(2)}</blockquote>
        if (line.trim() === '---') return <hr key={i} className="my-6 border-gray-200" />
        if (line.trim() === '') return <div key={i} className="h-2" />
        return <p key={i} className="text-sm text-gray-600 mb-2 leading-relaxed">{line}</p>
      })}
    </div>
  )
}

function GapModal({
  gaps,
  currentIndex,
  comments,
  onCommentChange,
  onSubmit,
  onPrev,
  onNext,
  onClose,
}: {
  gaps: GapSuggestion[]
  currentIndex: number
  comments: Record<string, string>
  onCommentChange: (id: string, val: string) => void
  onSubmit: (action: 'accepted' | 'rejected') => void
  onPrev: () => void
  onNext: () => void
  onClose: () => void
}) {
  const gap = gaps[currentIndex]
  if (!gap) return null

  const priorityColors = {
    high: 'bg-red-50 text-red-700',
    medium: 'bg-amber-50 text-amber-700',
    low: 'bg-gray-100 text-gray-600',
  }

  const sectionLabels: Record<string, string> = {
    actors: 'Actors',
    entities: 'Entities',
    journeys: 'Journeys',
    businessRules: 'Business Rules',
    constraints: 'Constraints',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-semibold text-gray-900">Gap Analysis</span>
            <span className="text-xs text-gray-500">{currentIndex + 1} of {gaps.length}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${priorityColors[gap.priority]}`}>
              {gap.priority}
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700">
              {gap.type === 'add' ? '+ Add' : '~ Modify'}
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">
              {sectionLabels[gap.section] ?? gap.section}
            </span>
          </div>

          {/* Title & description */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">{gap.title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{gap.description}</p>
          </div>

          {/* Evidence */}
          {gap.evidence && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">From source document</p>
              <p className="text-sm text-gray-700 italic leading-relaxed">&ldquo;{gap.evidence}&rdquo;</p>
            </div>
          )}

          {/* Comment */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Your comment</label>
            <textarea
              value={comments[gap.id] ?? ''}
              onChange={e => onCommentChange(gap.id, e.target.value)}
              placeholder="Add your thoughts on this suggestion..."
              rows={2}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <button
              onClick={onPrev}
              disabled={currentIndex === 0}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={onNext}
              disabled={currentIndex === gaps.length - 1}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSubmit('rejected')}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Skip
            </button>
            <button
              onClick={() => onSubmit('accepted')}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" />
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
