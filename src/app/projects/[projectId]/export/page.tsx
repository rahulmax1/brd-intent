'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, FileText, Code, Database, Download, CheckCircle2, Clock, Eye } from 'lucide-react'
import { ProjectStepper } from '@/components/project-stepper'
import { ProjectActionsMenu } from '@/components/project-actions-menu'

type Project = {
  id: string
  name: string
  description: string | null
  phase: string
}

type Artifact = {
  id: string
  artifactType: string
  filename: string
  sizeBytes: number | null
  createdAt: string
}

type Props = {
  params: Promise<{ projectId: string }>
}

const artifactConfig = {
  BRD: {
    label: 'Business Requirements Document',
    description: 'Comprehensive BRD with actors, entities, journeys, and business rules',
    icon: FileText,
    previewPath: 'brd',
  },
  TYPESCRIPT_TYPES: {
    label: 'TypeScript Types',
    description: 'Type definitions generated from entity models',
    icon: Code,
    previewPath: 'types',
  },
  ZOD_SCHEMAS: {
    label: 'Zod Validation Schemas',
    description: 'Runtime validation schemas for all entities',
    icon: Code,
    previewPath: 'schemas',
  },
  API_STUBS: {
    label: 'API Endpoint Stubs',
    description: 'Next.js API route templates for CRUD operations',
    icon: Code,
    previewPath: 'api-stubs',
  },
  MIGRATION: {
    label: 'Database Migration',
    description: 'Prisma migration SQL for entity tables',
    icon: Database,
    previewPath: 'migration',
  },
}

export default function ExportPage({ params }: Props) {
  const router = useRouter()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<Record<string, boolean>>({})
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
      setArtifacts(data.project.generatedArtifacts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerate(artifactType: string) {
    if (!projectId) return

    setGenerating((prev) => ({ ...prev, [artifactType]: true }))
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/artifacts/${artifactType}`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate artifact')
      }

      // Refresh artifacts list
      await fetchProject(projectId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate artifact')
    } finally {
      setGenerating((prev) => ({ ...prev, [artifactType]: false }))
    }
  }

  async function handleDownload(artifactType: string, filename: string) {
    if (!projectId) return

    try {
      const res = await fetch(`/api/projects/${projectId}/artifacts/${artifactType}`)
      if (!res.ok) throw new Error('Failed to download artifact')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download artifact')
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

  const artifactsByType = artifacts.reduce((acc, artifact) => {
    acc[artifact.artifactType] = artifact
    return acc
  }, {} as Record<string, Artifact>)

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
                hasModel
              />
            )}
          </div>
        </div>
      </div>

      {/* Stepper */}
      <ProjectStepper
        projectId={projectId!}
        currentPhase={project?.phase || 'EXPORT'}
        currentStep="export"
      />

      {/* Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Available Artifacts
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Generate deliverables from your intent model. Each artifact can be regenerated at any time.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {Object.entries(artifactConfig).map(([type, config]) => {
                const artifact = artifactsByType[type]
                const isGenerating = generating[type]
                const Icon = config.icon

                return (
                  <ArtifactCard
                    key={type}
                    projectId={projectId!}
                    type={type}
                    config={config}
                    artifact={artifact}
                    isGenerating={isGenerating}
                    onGenerate={handleGenerate}
                    onDownload={handleDownload}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ArtifactCard({
  projectId,
  type,
  config,
  artifact,
  isGenerating,
  onGenerate,
  onDownload,
}: {
  projectId: string
  type: string
  config: any
  artifact?: Artifact
  isGenerating: boolean
  onGenerate: (type: string) => void
  onDownload: (type: string, filename: string) => void
}) {
  const Icon = config.icon

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 flex-shrink-0">
          <Icon className="h-4 w-4 text-gray-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900">{config.label}</h3>
          <p className="mt-1 text-xs text-gray-600">{config.description}</p>

          {artifact && (
            <div className="mt-3 flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="text-xs">
                Generated {new Date(artifact.createdAt).toLocaleDateString()}
              </span>
            </div>
          )}

          {isGenerating && (
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full animate-pulse" style={{ width: '100%' }} />
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center gap-2">
            {artifact ? (
              <>
                <Link
                  href={`/projects/${projectId}/artifacts/${config.previewPath}`}
                  className="flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View
                </Link>
                <button
                  onClick={() => onDownload(type, artifact.filename)}
                  className="flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
                <button
                  onClick={() => onGenerate(type)}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    'Regenerate'
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={() => onGenerate(type)}
                disabled={isGenerating}
                className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
