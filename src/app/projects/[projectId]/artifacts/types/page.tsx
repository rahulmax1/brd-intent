'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Download, Code } from 'lucide-react'

type Props = {
  params: Promise<{ projectId: string }>
}

export default function TypesPreviewPage({ params }: Props) {
  const router = useRouter()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { projectId: id } = await params
      setProjectId(id)
      fetchArtifact(id)
    }
    init()
  }, [params])

  async function fetchArtifact(id: string) {
    try {
      const res = await fetch(`/api/projects/${id}/artifacts/TYPESCRIPT_TYPES`)
      if (!res.ok) {
        if (res.status === 404) {
          setError('TypeScript types not generated yet')
          return
        }
        throw new Error('Failed to fetch types')
      }
      const text = await res.text()
      setContent(text)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load types')
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload() {
    if (!projectId || !content) return

    const blob = new Blob([content], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `types-${Date.now()}.ts`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8F8F7]">
        <div className="text-center">
          <Loader2 className="inline-block h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-4 text-sm text-gray-600">Loading types...</p>
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
            href={`/projects/${projectId}/export`}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Artifacts
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100">
                <Code className="h-5 w-5 text-purple-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  TypeScript Types
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Type definitions for entities
                </p>
              </div>
            </div>
            {content && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download .ts
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm text-red-800">{error}</p>
            <Link
              href={`/projects/${projectId}/export`}
              className="mt-4 inline-flex items-center gap-2 text-sm text-red-700 hover:text-red-900"
            >
              Generate types first
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-gray-900 p-6 overflow-x-auto">
            <pre className="text-sm text-gray-100 font-mono">
              <code>{content}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
