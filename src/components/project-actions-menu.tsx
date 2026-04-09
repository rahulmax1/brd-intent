'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, RotateCcw, Trash2, Loader2, X } from 'lucide-react'

type ProjectActionsMenuProps = {
  projectId: string
  projectName: string
  hasModel?: boolean
  onReset?: () => void
  onDelete?: () => void
}

export function ProjectActionsMenu({
  projectId,
  projectName,
  hasModel = false,
  onReset,
  onDelete,
}: ProjectActionsMenuProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirm, setConfirm] = useState<'reset' | 'delete' | null>(null)
  const [loading, setLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  async function handleReset() {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/reset-model`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to reset')
      setConfirm(null)
      onReset?.()
      router.push(`/projects/${projectId}/upload`)
    } catch (err) {
      console.error('Reset failed:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete')
      setConfirm(null)
      onDelete?.()
      router.push('/projects')
    } catch (err) {
      console.error('Delete failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Menu trigger */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 active:bg-gray-200 transition-colors"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-52 rounded-lg border border-gray-200 bg-white shadow-lg z-50 py-1">
            {hasModel && (
              <>
                <button
                  onClick={() => { setMenuOpen(false); setConfirm('reset') }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset Intent Model
                </button>
                <div className="mx-2 my-1 h-px bg-gray-100" />
              </>
            )}
            <button
              onClick={() => { setMenuOpen(false); setConfirm('delete') }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete Project
            </button>
          </div>
        )}
      </div>

      {/* Confirmation modal */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">
                {confirm === 'reset' ? 'Reset Intent Model' : 'Delete Project'}
              </h3>
              <button
                onClick={() => setConfirm(null)}
                disabled={loading}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm text-gray-600 leading-relaxed">
                {confirm === 'reset' ? (
                  <>This will permanently delete all model versions, review decisions, and generated artifacts for <strong className="text-gray-900">{projectName}</strong>. The project will be reset to the Upload phase. Uploaded documents will be kept.</>
                ) : (
                  <>This will archive <strong className="text-gray-900">{projectName}</strong> and all its data. This action cannot be undone.</>
                )}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setConfirm(null)}
                disabled={loading}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirm === 'reset' ? handleReset : handleDelete}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 active:bg-red-800 transition-colors disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {confirm === 'reset'
                  ? (loading ? 'Resetting…' : 'Reset Model')
                  : (loading ? 'Deleting…' : 'Delete Project')
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
