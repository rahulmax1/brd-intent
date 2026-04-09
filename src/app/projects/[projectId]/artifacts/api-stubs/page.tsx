'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Download, Code } from 'lucide-react'

type Props = {
  params: Promise<{ projectId: string }>
}

export default function ApiStubsPreviewPage({ params }: Props) {
  const [projectId, setProjectId] = useState<string | null>(null)
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { projectId: id } = await params
      setProjectId(id)
      const res = await fetch(`/api/projects/${id}/artifacts/API_STUBS`)
      if (!res.ok) {
        setError(res.status === 404 ? 'API stubs not generated yet' : 'Failed to fetch API stubs')
      } else {
        setContent(await res.text())
      }
      setLoading(false)
    }
    init()
  }, [params])

  async function handleDownload() {
    if (!content) return
    const blob = new Blob([content], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `api-stubs-${Date.now()}.ts`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8F8F7]">
        <Loader2 className="inline-block h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F8F7]">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <Link
            href={`/projects/${projectId}/export`}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Artifacts
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100">
                <Code className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">API Endpoint Stubs</h1>
                <p className="mt-1 text-sm text-gray-600">Next.js route templates for CRUD operations</p>
              </div>
            </div>
            {content && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                <Download className="h-4 w-4" />
                Download .ts
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-800">
            {error}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-gray-900 p-6 overflow-x-auto">
            <pre className="text-sm text-gray-100 font-mono"><code>{content}</code></pre>
          </div>
        )}
      </div>
    </div>
  )
}
