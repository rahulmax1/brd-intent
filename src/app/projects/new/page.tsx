'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useToast } from '@/components/toast'

export default function NewProjectPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validate name
    const validationErrors: { name?: string; description?: string } = {}

    if (!name.trim()) {
      validationErrors.name = 'Project name is required'
    } else if (name.trim().length < 3) {
      validationErrors.name = 'Project name must be at least 3 characters'
    } else if (name.trim().length > 100) {
      validationErrors.name = 'Project name must be less than 100 characters'
    }

    if (description.trim().length > 500) {
      validationErrors.description = 'Description must be less than 500 characters'
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create project')
      }

      const data = await res.json()
      showToast('success', `Project "${data.project.name}" created successfully!`)
      router.push(`/projects/${data.project.id}`)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to create project')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F8F7]">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-6">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Link>
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">
            Create New Project
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Start a new intent model project. Upload documents, create a draft
            with AI, review with your team, and generate artifacts.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {/* Project Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-900"
              >
                Project Name
                <span className="text-red-600 ml-1">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (errors.name) setErrors({ ...errors, name: undefined })
                }}
                className={`mt-2 block w-full rounded-lg border ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                } bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                placeholder="e.g., VBS Pickup Portal"
                disabled={loading}
              />
              {errors.name ? (
                <p className="mt-1.5 text-xs text-red-600">{errors.name}</p>
              ) : (
                <p className="mt-1.5 text-xs text-gray-500">
                  Minimum 3 characters
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-900"
              >
                Description
                <span className="text-gray-400 ml-1">(optional)</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  if (errors.description) setErrors({ ...errors, description: undefined })
                }}
                rows={4}
                className={`mt-2 block w-full rounded-lg border ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                } bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                placeholder="Brief description of what you're building..."
                disabled={loading}
              />
              {errors.description ? (
                <p className="mt-1.5 text-xs text-red-600">{errors.description}</p>
              ) : (
                <p className={`mt-1.5 text-xs ${description.length > 450 ? 'text-yellow-600' : 'text-gray-500'}`}>
                  {description.length}/500 characters
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={loading || name.trim().length < 3}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Creating...' : 'Create Project'}
              </button>
              <Link
                href="/projects"
                className="rounded-lg px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
