'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Download, FileText } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Props = {
  params: Promise<{ projectId: string }>
}

export default function BRDPreviewPage({ params }: Props) {
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
      const res = await fetch(`/api/projects/${id}/artifacts/BRD`)
      if (!res.ok) {
        if (res.status === 404) {
          setError('BRD not generated yet')
          return
        }
        throw new Error('Failed to fetch BRD')
      }
      const text = await res.text()
      setContent(text)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load BRD')
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload() {
    if (!projectId || !content) return

    const blob = new Blob([content], { type: 'text/markdown' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `brd-${Date.now()}.md`
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
          <p className="mt-4 text-sm text-gray-600">Loading BRD...</p>
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
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
                <FileText className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Business Requirements Document
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Generated from intent model
                </p>
              </div>
            </div>
            {content && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 active:scale-[0.98] transition-all duration-150"
              >
                <Download className="h-4 w-4" />
                Download
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
              Generate BRD first
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white px-10 py-8">
            <article className="prose prose-gray prose-sm max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-h1:text-2xl prose-h1:border-b prose-h1:border-gray-200 prose-h1:pb-3 prose-h2:text-lg prose-h2:mt-8 prose-h3:text-base prose-p:text-gray-700 prose-p:leading-relaxed prose-li:text-gray-700 prose-strong:text-gray-900 prose-table:text-sm prose-th:bg-gray-50 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-hr:border-gray-200">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </article>
          </div>
        )}
      </div>
    </div>
  )
}
