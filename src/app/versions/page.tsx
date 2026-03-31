'use client'

import { useState, useEffect, useCallback } from 'react'
import { GitCommit, Loader2, ChevronRight } from 'lucide-react'
import { SideBySideDiff } from '@/components/review/side-by-side-diff'
import type { ModelDiff } from '@/lib/model-diff'
import type { IntentModel } from '@/domain/intent-model/types'

type VersionMeta = {
  id: string
  timestamp: string
  author: string
  prompt: string
  parentId: string | null
}

type DiffData = {
  from: { id: string; version: string; author: string; timestamp: string }
  to: { id: string; version: string; author: string; timestamp: string }
  diff: ModelDiff
  models: { previous: IntentModel; current: IntentModel }
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


export default function DiffPage() {
  const [versions, setVersions] = useState<VersionMeta[]>([])
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [diffData, setDiffData] = useState<DiffData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/model/versions')
      .then(res => res.json())
      .then(data => {
        const vs = (data.versions ?? []) as VersionMeta[]
        setVersions(vs)
        // Auto-select latest
        if (vs.length >= 2) {
          loadDiff(vs.length - 1, vs)
        }
      })
  }, [])

  const loadDiff = useCallback((idx: number, vs?: VersionMeta[]) => {
    const list = vs ?? versions
    if (idx < 1 || idx >= list.length) return

    setSelectedIdx(idx)
    setLoading(true)

    const fromId = list[idx - 1].id
    const toId = list[idx].id

    fetch(`/api/model/versions/diff?from=${fromId}&to=${toId}`)
      .then(res => res.json())
      .then(data => {
        setDiffData(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [versions])

  // Reversed for display (newest first), but skip seed (index 0)
  const versionPairs = versions
    .map((v, i) => ({ version: v, index: i }))
    .filter(({ index }) => index > 0)
    .reverse()

  return (
    <div className="flex h-full gap-0">
      {/* Version list sidebar */}
      <div
        className="w-[220px] shrink-0 flex flex-col border-r"
        style={{ borderColor: 'var(--border-default)' }}
      >
        <div className="px-2.5 py-2.5 border-b" style={{ borderColor: 'var(--border-default)' }}>
          <p
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}
          >
            Version History
          </p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll">
          {versionPairs.length === 0 && (
            <div className="px-2.5 py-6 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
              No changes yet. Use the AI chat to make edits.
            </div>
          )}

          {versionPairs.map(({ version: v, index: i }) => {
            const isSelected = selectedIdx === i

            return (
              <button
                key={v.id}
                type="button"
                onClick={() => loadDiff(i)}
                className={`flex w-full items-start gap-2 px-2.5 py-2 text-left transition-colors duration-150 border-b ${
                  isSelected ? '' : 'hover:bg-black/[0.02]'
                }`}
                style={{
                  borderColor: 'var(--border-default)',
                  background: isSelected ? 'var(--bg-blue-subtle)' : undefined,
                }}
              >
                <GitCommit
                  size={12}
                  className="mt-0.5 shrink-0"
                  style={{ color: isSelected ? 'var(--accent-blue)' : 'var(--text-muted)' }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[12px] font-medium truncate"
                      style={{ color: isSelected ? 'var(--accent-blue)' : 'var(--text-primary)' }}
                    >
                      {v.author}
                    </span>
                    <span className="text-[10px] shrink-0" style={{ color: 'var(--text-muted)' }}>
                      {timeAgo(v.timestamp)}
                    </span>
                  </div>
                  <p
                    className="text-[11px] leading-snug mt-0.5 line-clamp-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {v.prompt}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-y-auto custom-scroll">
        {!selectedIdx && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center" style={{ color: 'var(--text-muted)' }}>
            <GitCommit size={32} className="mb-2 opacity-20" />
            <p className="text-sm font-medium">Select a version</p>
            <p className="text-xs mt-1">Click a version on the left to view its diff</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 py-12 justify-center text-xs" style={{ color: 'var(--text-muted)' }}>
            <Loader2 size={14} className="animate-spin" />
            Loading diff...
          </div>
        )}

        {selectedIdx && !loading && diffData && (
          <div className="px-5 py-4">
            {/* Header */}
            <div className="flex items-center gap-1.5 mb-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              <span>{diffData.from.author}</span>
              <ChevronRight size={10} />
              <span style={{ color: 'var(--text-primary)' }}>{diffData.to.author}</span>
              <span className="ml-1.5">{timeAgo(diffData.to.timestamp)}</span>
            </div>
            <p className="text-[13px] leading-snug mb-4" style={{ color: 'var(--text-secondary)' }}>
              {versions[selectedIdx]?.prompt}
            </p>

            {/* Diff */}
            {diffData.diff.sections.length === 0 ? (
              <div className="rounded-lg p-6 text-center text-sm" style={{ background: 'var(--bg-white)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
                No changes in this version.
              </div>
            ) : (
              <SideBySideDiff previous={diffData.models.previous} current={diffData.models.current} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
