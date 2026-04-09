'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Upload, FileText, Loader2, CheckCircle2, XCircle, Clock, Eye, RefreshCw, Sparkles } from 'lucide-react'
import { ProjectStepper } from '@/components/project-stepper'
import { ProjectActionsMenu } from '@/components/project-actions-menu'

type ModelVersion = {
  id: string
  createdAt: string
}

type Project = {
  id: string
  name: string
  description: string | null
  phase: string
  intentModelVersions: ModelVersion[]
}

type Document = {
  id: string
  filename: string
  category: string
  processingStatus: string
  createdAt: string
}

type Props = {
  params: Promise<{ projectId: string }>
}

export default function UploadPage({ params }: Props) {
  const router = useRouter()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

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
      setDocuments(data.project.documents || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0 || !projectId) return

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      Array.from(e.target.files).forEach(file => {
        formData.append('files', file)
      })

      const res = await fetch(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to upload files')
      }

      // Refresh project data
      fetchProject(projectId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      // Reset file input
      e.target.value = ''
    }
  }

  async function handleMoveToDraft() {
    if (!projectId) return

    try {
      await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: 'DRAFT' }),
      })
      router.push(`/projects/${projectId}/draft`)
    } catch {
      router.push(`/projects/${projectId}/draft`)
    }
  }

  function handleRegenerate() {
    if (!projectId) return
    router.push(`/projects/${projectId}/draft?regenerate=true`)
  }

  function handleViewModel() {
    if (!projectId || !project) return
    const phaseRoutes: Record<string, string> = {
      REVIEW: `/projects/${projectId}/review`,
      CONSENSUS: `/projects/${projectId}/consensus`,
      EXPORT: `/projects/${projectId}/export`,
    }
    router.push(phaseRoutes[project.phase] || `/projects/${projectId}/draft`)
  }

  // Determine action area state
  const hasModel = project?.intentModelVersions && project.intentModelVersions.length > 0
  const latestModelDate = hasModel ? new Date(project.intentModelVersions[0].createdAt) : null
  const newDocsSinceModel = latestModelDate
    ? documents.filter(d => new Date(d.createdAt) > latestModelDate && d.processingStatus === 'COMPLETED')
    : []
  const hasNewDocs = newDocsSinceModel.length > 0

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
                hasModel={hasModel ?? false}
              />
            )}
          </div>
        </div>
      </div>

      {/* Stepper — hidden during upload since the welcome banner explains the flow */}

      {/* Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="space-y-6">
          {/* Welcome banner — shown when no documents yet */}
          {documents.length === 0 && !uploading && (
            <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Project created — let's build your intent model
              </h2>
              <p className="mt-2 text-sm text-gray-600 max-w-2xl">
                Upload the documents that describe what you're building — BRDs, meeting transcripts, technical specs, or requirements docs. AI will analyze them and generate a structured intent model with actors, entities, journeys, and business rules.
              </p>
              <div className="mt-4 flex items-center gap-6 text-xs text-gray-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">1</span>
                    Upload docs
                  </span>
                  <span className="text-gray-300">→</span>
                  <span className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-500">2</span>
                    AI generates draft
                  </span>
                  <span className="text-gray-300">→</span>
                  <span className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-500">3</span>
                    Review & refine
                  </span>
                  <span className="text-gray-300">→</span>
                  <span className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-500">4</span>
                    Team consensus
                  </span>
                  <span className="text-gray-300">→</span>
                  <span className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-500">5</span>
                    Generate artefacts
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Upload Area */}
          <div className="rounded-xl border border-gray-200 bg-white p-8">
            <h2 className="text-lg font-semibold text-gray-900">
              Upload Documents
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              BRDs, transcripts, technical specs, or requirements docs — anything that describes the system you're scoping.
            </p>

            <label className="mt-6 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-12 cursor-pointer hover:border-gray-400 hover:bg-gray-100 transition-colors">
              <Upload className="h-12 w-12 text-gray-400" />
              <span className="mt-4 text-sm font-medium text-gray-900">
                Click to upload files
              </span>
              <span className="mt-1 text-xs text-gray-500">
                PDF, Word, or text files (max 10MB each)
              </span>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.md"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>

            {uploading && (
              <div className="mt-4 flex items-center gap-2 text-sm text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading files...
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}
          </div>

          {/* Document List */}
          {documents.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Uploaded Documents
                </h2>
                <span className="text-sm text-gray-600">
                  {documents.length} {documents.length === 1 ? 'document' : 'documents'}
                </span>
              </div>

              <div className="space-y-3">
                {documents.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    document={doc}
                    onDelete={async (id) => {
                      await fetch(`/api/projects/${projectId}/documents?id=${id}`, { method: 'DELETE' })
                      setDocuments(prev => prev.filter(d => d.id !== id))
                    }}
                  />
                ))}
              </div>

              {/* Action Area — context-aware */}
              {documents.some(d => d.processingStatus === 'COMPLETED') && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  {!hasModel ? (
                    /* State 1: No model yet */
                    <>
                      <button
                        onClick={handleMoveToDraft}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 active:scale-[0.98] transition-all duration-150"
                      >
                        <Sparkles className="h-4 w-4" />
                        Generate Draft Intent Model
                      </button>
                      <p className="mt-2 text-xs text-gray-500">
                        AI will analyze your documents and create a draft with actors, entities, journeys, and business rules.
                      </p>
                    </>
                  ) : hasNewDocs ? (
                    /* State 3: Model exists + new docs uploaded */
                    <>
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 mb-4">
                        <p className="text-sm font-medium text-amber-900">
                          {newDocsSinceModel.length === 1
                            ? 'You\'ve added a new document since the model was last generated.'
                            : `You've added ${newDocsSinceModel.length} new documents since the model was last generated.`}
                        </p>
                        <p className="mt-1 text-xs text-amber-700">
                          Regenerate to incorporate the new content into your intent model.
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleRegenerate}
                          className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 active:scale-[0.98] transition-all duration-150"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Regenerate with New Documents
                        </button>
                        <button
                          onClick={handleViewModel}
                          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-all duration-150"
                        >
                          <Eye className="h-4 w-4" />
                          View Current Model
                        </button>
                      </div>
                    </>
                  ) : (
                    /* State 2: Model exists, no new docs */
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleViewModel}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 active:scale-[0.98] transition-all duration-150"
                      >
                        <Eye className="h-4 w-4" />
                        View Intent Model
                        <ArrowRight className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleRegenerate}
                        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-all duration-150"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Regenerate
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Helpful tips — shown when no documents yet */}
          {documents.length === 0 && !uploading && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                What makes a good upload?
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-lg bg-gray-50 px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">Requirements docs</p>
                  <p className="mt-1 text-xs text-gray-500">BRDs, PRDs, or scope documents that describe what the system should do.</p>
                </div>
                <div className="rounded-lg bg-gray-50 px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">Meeting notes</p>
                  <p className="mt-1 text-xs text-gray-500">Transcripts or summaries from scoping calls, kickoffs, or stakeholder interviews.</p>
                </div>
                <div className="rounded-lg bg-gray-50 px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">Technical specs</p>
                  <p className="mt-1 text-xs text-gray-500">Architecture docs, API specs, or system diagrams that describe the technical landscape.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DocumentRow({ document, onDelete }: { document: Document; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false)

  const statusConfig = {
    PENDING: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Pending' },
    PROCESSING: { icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Processing' },
    COMPLETED: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', label: 'Ready' },
    FAILED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Failed' },
  }

  const status = statusConfig[document.processingStatus as keyof typeof statusConfig] || statusConfig.PENDING
  const StatusIcon = status.icon

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {document.filename}
          </p>
          <p className="text-xs text-gray-500">
            {new Date(document.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${status.bg}`}>
          <StatusIcon className={`h-3.5 w-3.5 ${status.color} ${document.processingStatus === 'PROCESSING' ? 'animate-spin' : ''}`} />
          <span className={`text-xs font-medium ${status.color}`}>
            {status.label}
          </span>
        </div>
        <button
          onClick={async () => {
            setDeleting(true)
            await onDelete(document.id)
          }}
          disabled={deleting}
          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          title="Remove document"
        >
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  )
}
