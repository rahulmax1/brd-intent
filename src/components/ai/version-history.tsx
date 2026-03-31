'use client'

import { useState, useCallback } from 'react'
import { ChevronDown, ChevronRight, RotateCcw, GitCommit, Loader2 } from 'lucide-react'
import type { ModelDiff } from '@/lib/model-diff'

type VersionMeta = {
  id: string
  timestamp: string
  author: string
  prompt: string
  parentId: string | null
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function VersionDiff({ fromId, toId }: { fromId: string; toId: string }) {
  const [diff, setDiff] = useState<ModelDiff | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useState(() => {
    fetch(`/api/model/versions/diff?from=${fromId}&to=${toId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load diff')
        return res.json()
      })
      .then(data => {
        setDiff(data.diff)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  })

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-4 text-xs text-slate-400">
        <Loader2 size={12} className="animate-spin" />
        Loading diff...
      </div>
    )
  }

  if (error || !diff) {
    return (
      <div className="px-3 py-3 text-xs text-red-500">
        {error ?? 'Failed to compute diff'}
      </div>
    )
  }

  const totalChanges = diff.sections.reduce((sum, s) => sum + s.changes.length, 0)

  if (totalChanges === 0) {
    return (
      <div className="px-3 py-3 text-xs text-slate-400">
        No changes in this version.
      </div>
    )
  }

  // Render diff sections without approve/reject buttons
  return (
    <div className="border-t border-slate-100 px-2 py-3">
      <VersionDiffContent diff={diff} />
    </div>
  )
}

function VersionDiffContent({ diff }: { diff: ModelDiff }) {
  const totalChanges = diff.sections.reduce((sum, s) => sum + s.changes.length, 0)
  const added = diff.sections.reduce((sum, s) => sum + s.changes.filter(c => c.type === 'added').length, 0)
  const removed = diff.sections.reduce((sum, s) => sum + s.changes.filter(c => c.type === 'removed').length, 0)
  const modified = diff.sections.reduce((sum, s) => sum + s.changes.filter(c => c.type === 'modified').length, 0)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
        <span>{totalChanges} change{totalChanges !== 1 ? 's' : ''}</span>
        {added > 0 && <span className="text-emerald-600">+{added}</span>}
        {removed > 0 && <span className="text-red-500">-{removed}</span>}
        {modified > 0 && <span className="text-blue-600">~{modified}</span>}
      </div>
      {diff.sections.map((section) => (
        <div key={section.sectionType} className="space-y-1">
          {section.changes.map((change) => {
            const colors = {
              added: 'text-emerald-600 bg-emerald-50',
              removed: 'text-red-600 bg-red-50',
              modified: 'text-blue-600 bg-blue-50',
            }
            return (
              <div key={change.itemId} className="flex items-center gap-2 text-xs">
                <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-medium ${colors[change.type]}`}>
                  {change.type === 'added' ? '+' : change.type === 'removed' ? '−' : '~'}
                </span>
                <span className="text-slate-600">{change.itemName}</span>
                {change.fields && (
                  <span className="text-slate-400">
                    ({change.fields.length} field{change.fields.length > 1 ? 's' : ''})
                  </span>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export function VersionHistory({
  versions,
  onRevert,
  isReverting,
}: {
  versions: VersionMeta[]
  onRevert: (versionId: string) => void
  isReverting: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const reversed = [...versions].reverse()

  const toggleDiff = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }, [])

  return (
    <div className="border-t border-slate-100 pt-3">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600"
      >
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        History ({versions.length})
      </button>

      {isOpen && (
        <div className="mt-2 max-h-[400px] overflow-y-auto">
          {reversed.map((v, i) => {
            const parentId = v.parentId ?? (i < reversed.length - 1 ? reversed[i + 1].id : null)
            const canShowDiff = parentId !== null
            const isExpanded = expandedId === v.id

            return (
              <div key={v.id} className={`${isExpanded ? 'bg-slate-50/50 rounded-lg mb-1' : ''}`}>
                {/* Version row */}
                <div className="flex items-start gap-2 rounded p-2 text-xs hover:bg-slate-50">
                  {/* Timeline dot */}
                  <div className="mt-1 shrink-0">
                    <GitCommit size={12} className={i === 0 ? 'text-blue-500' : 'text-slate-300'} />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-700">{v.author}</span>
                      <span className="text-slate-400">{timeAgo(v.timestamp)}</span>
                      {i === 0 && (
                        <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                          current
                        </span>
                      )}
                    </div>
                    <p className="truncate text-slate-500">{v.prompt}</p>
                    {canShowDiff && (
                      <button
                        type="button"
                        onClick={() => toggleDiff(v.id)}
                        className="mt-1 text-[11px] font-medium text-blue-500 hover:text-blue-700"
                      >
                        {isExpanded ? 'Hide diff' : 'Show diff'}
                      </button>
                    )}
                  </div>

                  {/* Revert button */}
                  {i > 0 && (
                    confirmId === v.id ? (
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => { onRevert(v.id); setConfirmId(null) }}
                          disabled={isReverting}
                          className="rounded bg-amber-100 px-2 py-0.5 text-amber-700 hover:bg-amber-200 disabled:opacity-50"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmId(null)}
                          className="rounded px-2 py-0.5 text-slate-400 hover:text-slate-600"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmId(v.id)}
                        className="shrink-0 rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500"
                        title="Revert to this version"
                      >
                        <RotateCcw size={12} />
                      </button>
                    )
                  )}
                </div>

                {/* Expandable diff */}
                {isExpanded && canShowDiff && (
                  <VersionDiff fromId={parentId} toId={v.id} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
