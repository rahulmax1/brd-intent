'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

type Props = {
  params: Promise<{ projectId: string }>
}

export default function ProjectDetailPage({ params }: Props) {
  const router = useRouter()

  useEffect(() => {
    async function redirectToPhase() {
      try {
        const { projectId } = await params
        const res = await fetch(`/api/projects/${projectId}`)

        if (!res.ok) {
          if (res.status === 404) {
            router.push('/projects')
            return
          }
          throw new Error('Failed to fetch project')
        }

        const data = await res.json()
        const phase = data.project.phase

        // Redirect based on current phase
        const phaseRoutes: Record<string, string> = {
          UPLOAD: `/projects/${projectId}/upload`,
          DRAFT: `/projects/${projectId}/draft`,
          REVIEW: `/projects/${projectId}/review`,
          CONSENSUS: `/projects/${projectId}/consensus`,
          EXPORT: `/projects/${projectId}/export`,
          ARCHIVED: '/projects',
        }

        const route = phaseRoutes[phase] || `/projects/${projectId}/upload`
        router.replace(route)
      } catch (error) {
        console.error('Failed to redirect:', error)
        router.push('/projects')
      }
    }

    redirectToPhase()
  }, [params, router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F8F8F7]">
      <div className="text-center">
        <Loader2 className="inline-block h-8 w-8 animate-spin text-blue-600" />
        <p className="mt-4 text-sm text-gray-600">Loading project...</p>
      </div>
    </div>
  )
}
