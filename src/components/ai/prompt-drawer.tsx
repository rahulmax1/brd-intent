'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Cog, Loader2, RefreshCw, GripVertical, Send } from 'lucide-react'
import { useDrawerStore } from '@/stores/ai-drawer-store'
import { SuggestionChips } from './suggestion-chips'
import { DiffPreview } from './diff-preview'
import { VersionHistory } from './version-history'
import type { IntentModel, SectionType } from '@/domain/intent-model/types'
import { URL_PARAM_TO_SECTION_TYPE } from '@/domain/intent-model/types'

type VersionMeta = {
  id: string
  timestamp: string
  author: string
  prompt: string
  parentId: string | null
}

const SECTION_LABELS: Record<string, string> = {
  actor: 'Actors',
  entity: 'Entities',
  journey: 'Journeys',
  business_rule: 'Rules',
  constraint: 'Constraints',
  open_question: 'Open Qs',
}

function getSectionTypeFromPath(pathname: string): SectionType | null {
  const segment = pathname.split('/').pop()
  if (!segment) return null
  return URL_PARAM_TO_SECTION_TYPE[segment] ?? null
}

export function ChatPanel() {
  const router = useRouter()
  const pathname = usePathname()
  const store = useDrawerStore()
  const currentReviewerId = 'anonymous'

  const [model, setModel] = useState<IntentModel | null>(null)
  const [latestVersionId, setLatestVersionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [versions, setVersions] = useState<VersionMeta[]>([])
  const [isStale, setIsStale] = useState(false)
  const [isReverting, setIsReverting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [panelWidth, setPanelWidth] = useState(460)
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const mountedRef = useRef(true)

  const sectionType = getSectionTypeFromPath(pathname)
  const sectionLabel = sectionType ? SECTION_LABELS[sectionType] ?? sectionType : null
  const isDiffPage = pathname.includes('/diff')

  // Shared fetch function with response status check
  const fetchModelData = useCallback(() => {
    return fetch('/api/model/current')
      .then(r => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: ${r.statusText}`)
        }
        return r.json()
      })
  }, [])

  // Fetch model data on mount
  useEffect(() => {
    let mounted = true

    fetchModelData()
      .then(data => {
        if (mounted) {
          setModel(data.model)
          setLatestVersionId(data.latestVersionId)
        }
      })
      .catch((err) => {
        if (mounted) {
          setError('Failed to load model data')
          console.error('Failed to fetch model data:', err)
        }
      })

    return () => {
      mounted = false
      mountedRef.current = false
    }
  }, [fetchModelData])

  // Drag resize handler
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const delta = dragRef.current.startX - e.clientX
      setPanelWidth(Math.max(360, Math.min(700, dragRef.current.startWidth + delta)))
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      dragRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  // Fetch versions on mount
  useEffect(() => {
    fetch('/api/model/versions')
      .then(r => r.json())
      .then(data => {
        setVersions(data.versions ?? [])
        const latest = data.versions?.[data.versions.length - 1]
        if (latest && latest.id !== latestVersionId) {
          setIsStale(true)
        }
      })
      .catch(() => {})
  }, [latestVersionId])

  // Step 1: Ask AI to explain what it plans to change (streamed)
  const handlePlan = useCallback(async (text?: string) => {
    const p = text ?? prompt
    if (!p.trim()) return

    store.setLastPrompt(p)
    store.setPlan('')
    store.setStatus('planning')

    try {
      const res = await fetch('/api/model/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: p,
          scope: store.scope === 'section' && sectionType ? 'section' : 'full',
          sectionType: store.scope === 'section' && sectionType ? sectionType : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        store.setError(data.message ?? 'Failed to generate plan')
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        store.setError('Stream not available')
        return
      }

      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        store.appendPlan(decoder.decode(value))
      }

      store.setStatus('plan_ready')
    } catch {
      store.setError('Failed to connect to the server')
    }
  }, [prompt, store, sectionType])

  // Step 2: User confirmed — generate the actual JSON diff
  const handleConfirm = useCallback(async () => {
    const p = useDrawerStore.getState().lastPrompt
    if (!p) return

    store.setStatus('loading')

    try {
      const res = await fetch('/api/model/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: p,
          scope: store.scope === 'section' && sectionType ? 'section' : 'full',
          sectionType: store.scope === 'section' && sectionType ? sectionType : undefined,
        }),
      })

      const data = await res.json()

      if (data.error === 'no_changes') {
        store.setError('No changes detected. Try rephrasing your prompt.')
        return
      }

      if (data.error === 'validation_failed') {
        store.setError(data.details?.join('\n') ?? 'Validation failed')
        return
      }

      if (!res.ok) {
        store.setError(data.message ?? 'Something went wrong')
        return
      }

      store.setProposal({
        proposalId: data.proposalId,
        diff: data.diff,
        proposedModel: data.proposedModel,
        warnings: data.warnings ?? [],
      })
      store.setStatus('diff_preview')
    } catch {
      store.setError('Failed to connect to the server')
    }
  }, [store, sectionType])

  const handleApprove = useCallback(async () => {
    if (!store.currentProposal || !currentReviewerId) return

    store.setStatus('applying')

    try {
      const res = await fetch('/api/model/edit/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: store.currentProposal.proposalId,
          author: currentReviewerId,
          prompt: store.lastPrompt ?? '',
        }),
      })

      const data = await res.json()

      if (data.error === 'proposal_expired') {
        const lastPrompt = useDrawerStore.getState().lastPrompt
        if (lastPrompt) {
          store.reset()
          handlePlan(lastPrompt)
          return
        }
      }

      if (data.error === 'version_conflict') {
        store.setError('Model was updated by someone else. Retrying...')
        setTimeout(() => {
          const lastPrompt = useDrawerStore.getState().lastPrompt
          store.reset()
          if (lastPrompt) handlePlan(lastPrompt)
        }, 1000)
        return
      }

      if (!res.ok) {
        store.setError(data.message ?? 'Failed to apply changes')
        return
      }

      store.setStatus('success')
      setPrompt('')
      const versionsData = await fetch('/api/model/versions').then(r => r.json())
      setVersions(versionsData.versions ?? [])
      setTimeout(() => {
        store.reset()
        router.refresh()
      }, 1500)
    } catch {
      store.setError('Failed to connect to the server')
    }
  }, [store, currentReviewerId, router, handlePlan])

  const handleRevert = useCallback(async (versionId: string) => {
    if (!currentReviewerId) return
    setIsReverting(true)

    try {
      const res = await fetch('/api/model/revert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId, author: currentReviewerId }),
      })

      if (res.ok) {
        const data = await fetch('/api/model/versions').then(r => r.json())
        setVersions(data.versions ?? [])
        router.refresh()
      }
    } catch {
      // silently fail
    } finally {
      setIsReverting(false)
    }
  }, [currentReviewerId, router])

  // Hide chat panel on diff page — full width for side-by-side diff
  if (isDiffPage) return null

  // Show error state with retry button
  if (error) {
    return (
      <div className="flex shrink-0" style={{ width: panelWidth }}>
        <div className="flex w-1.5" />
        <div className="flex flex-1 flex-col overflow-hidden" style={{ background: 'var(--bg-page)' }}>
          <header
            className="flex h-[56px] shrink-0 items-center gap-3 px-4"
            style={{ background: 'var(--bg-page)' }}
          >
            <Cog size={18} style={{ color: 'var(--acfs-navy)' }} />
            <span className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
              Intent Model Editor
            </span>
          </header>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
            <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
              {error}
            </p>
            <button
              onClick={() => {
                setError(null)
                fetchModelData()
                  .then(data => {
                    if (mountedRef.current) {
                      setModel(data.model)
                      setLatestVersionId(data.latestVersionId)
                    }
                  })
                  .catch(() => {
                    if (mountedRef.current) {
                      setError('Failed to load model data')
                    }
                  })
              }}
              className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
              style={{
                color: '#0081F2',
                background: 'rgba(0, 129, 242, 0.08)',
                border: '1px solid rgba(0, 129, 242, 0.2)',
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show loading state while model data is being fetched
  if (!model || !latestVersionId) {
    return (
      <div className="flex shrink-0" style={{ width: panelWidth }}>
        <div className="flex w-1.5" />
        <div className="flex flex-1 flex-col overflow-hidden" style={{ background: 'var(--bg-page)' }}>
          <header
            className="flex h-[56px] shrink-0 items-center gap-3 px-4"
            style={{ background: 'var(--bg-page)' }}
          >
            <Cog size={18} style={{ color: 'var(--acfs-navy)' }} />
            <span className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
              Intent Model Editor
            </span>
          </header>
          <div className="flex flex-1 items-center justify-center">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex shrink-0" style={{ width: panelWidth }}>
      {/* Drag handle — left edge */}
      <div
        className="flex w-1.5 cursor-col-resize items-center justify-center transition-colors duration-200 hover:bg-black/[0.04] active:bg-[var(--bg-blue-subtle)]"
        onMouseDown={(e) => {
          e.preventDefault()
          dragRef.current = { startX: e.clientX, startWidth: panelWidth }
          setIsDragging(true)
        }}
      >
        <GripVertical size={10} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
      </div>

      {/* Chat panel */}
      <div className="flex flex-1 flex-col overflow-hidden" style={{ background: 'var(--bg-page)' }}>

        {/* Sticky header */}
        <header
          className="flex h-[56px] shrink-0 items-center gap-3 px-4"
          style={{ background: 'var(--bg-page)' }}
        >
          <Cog size={18} style={{ color: 'var(--acfs-navy)' }} />
          <span className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
            Intent Model Editor
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-xs"
            style={{
              background: 'var(--bg-gray-subtle)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-muted)',
            }}
          >
            gpt-4o-mini
          </span>
        </header>

        {/* Chat scroll area */}
        <div className="flex-1 overflow-y-auto custom-scroll">
          <div className="mx-auto max-w-[768px] space-y-4 px-6 pt-6 pb-20">

            {/* Staleness banner */}
            {isStale && (
              <div
                className="flex items-center gap-2 rounded-xl p-3 text-sm"
                style={{ background: 'rgba(0,129,242,0.06)', color: 'var(--accent-blue)' }}
              >
                <span>Model has been updated.</span>
                <button
                  type="button"
                  onClick={() => { router.refresh(); setIsStale(false) }}
                  className="flex items-center gap-1 font-medium underline"
                >
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>
            )}

            {/* Welcome / how it works — always visible when idle */}
            {store.status === 'idle' && !store.currentProposal && (
              <p className="text-sm leading-relaxed pt-2" style={{ color: 'var(--text-muted)' }}>
                Describe changes in plain English. I&apos;ll explain what I plan to change before making any edits.
              </p>
            )}

            {/* Suggestions */}
            <SuggestionChips model={model} onSelect={(s) => setPrompt(s)} />

            {/* Error state */}
            {store.status === 'error' && store.error && (
              <div className="space-y-2">
                <div
                  className="whitespace-pre-wrap rounded-xl p-3 text-sm"
                  style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid rgba(185,28,28,0.1)' }}
                >
                  {store.error}
                </div>
                <button
                  type="button"
                  onClick={store.reset}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200"
                  style={{ background: 'var(--bg-gray-subtle)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
                >
                  Try again
                </button>
              </div>
            )}

            {/* Planning — streaming AI explanation */}
            {(store.status === 'planning' || store.status === 'plan_ready') && store.plan && (
              <div className="space-y-3">
                <div
                  className="rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ background: 'var(--bg-white)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                >
                  {store.plan}
                  {store.status === 'planning' && (
                    <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse rounded-sm" style={{ background: 'var(--accent-blue)' }} />
                  )}
                </div>
                {store.status === 'plan_ready' && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleConfirm}
                      className="flex-1 rounded-[10px] px-3.5 py-2 text-sm font-medium transition-colors duration-200"
                      style={{ background: 'var(--acfs-navy)', color: 'var(--text-white)' }}
                    >
                      Go ahead
                    </button>
                    <button
                      type="button"
                      onClick={store.reject}
                      className="flex-1 rounded-[10px] px-3.5 py-2 text-sm font-medium transition-colors duration-200"
                      style={{ background: 'var(--bg-gray-subtle)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Diff preview */}
            {(store.status === 'diff_preview' || store.status === 'applying') && store.currentProposal && (
              <DiffPreview
                diff={store.currentProposal.diff}
                warnings={store.currentProposal.warnings}
                onApprove={handleApprove}
                onReject={store.reject}
                isApplying={store.status === 'applying'}
              />
            )}

            {/* Success state */}
            {store.status === 'success' && (
              <div
                className="rounded-xl p-3 text-sm"
                style={{ background: 'rgba(37,186,59,0.08)', color: '#15803D' }}
              >
                Changes applied successfully.
              </div>
            )}

            {/* Loading state - tool pill */}
            {store.status === 'loading' && (
              <div
                className="inline-flex items-center gap-2 rounded-[15px] px-3 py-1.5 text-sm"
                style={{ background: 'var(--bg-gray-subtle)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
              >
                <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
                Generating changes...
              </div>
            )}

            {/* Version history — hide when empty */}
            {versions.length > 1 && (
              <VersionHistory
                versions={versions}
                onRevert={handleRevert}
                isReverting={isReverting}
              />
            )}
          </div>
        </div>

        {/* Input dock — sticky bottom */}
        {(store.status === 'idle' || store.status === 'loading') && (
          <div className="shrink-0 px-4 pb-3 pt-2" style={{ background: 'var(--bg-page)' }}>
            <div
              className="rounded-[16px] px-3 pb-2 pt-1"
              style={{
                background: 'var(--bg-white)',
                border: '1px solid var(--border-dark)',
                boxShadow: 'var(--shadow-float)',
              }}
            >
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the change you want to make..."
                disabled={store.status === 'loading'}
                rows={3}
                className="block w-full resize-none bg-transparent text-sm leading-5 outline-none placeholder:text-[var(--text-muted)] disabled:opacity-50"
                style={{ color: 'var(--text-primary)', border: 'none', padding: '8px 0 4px', boxShadow: 'none' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handlePlan()
                  }
                }}
              />
              <div className="flex items-center gap-2 pt-1">
                {/* Scope tab inside input */}
                {sectionLabel ? (
                  <div
                    className="inline-flex rounded-md p-0.5"
                    style={{ background: 'var(--bg-gray-subtle)' }}
                  >
                    <button
                      type="button"
                      onClick={() => store.setScope('section')}
                      className="rounded px-2 py-0.5 text-[11px] font-medium transition-all duration-200"
                      style={{
                        background: store.scope === 'section' ? 'var(--bg-white)' : 'transparent',
                        color: store.scope === 'section' ? 'var(--text-primary)' : 'var(--text-muted)',
                        boxShadow: store.scope === 'section' ? 'var(--shadow-subtle)' : 'none',
                      }}
                    >
                      {sectionLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => store.setScope('full')}
                      className="rounded px-2 py-0.5 text-[11px] font-medium transition-all duration-200"
                      style={{
                        background: store.scope === 'full' ? 'var(--bg-white)' : 'transparent',
                        color: store.scope === 'full' ? 'var(--text-primary)' : 'var(--text-muted)',
                        boxShadow: store.scope === 'full' ? 'var(--shadow-subtle)' : 'none',
                      }}
                    >
                      Full model
                    </button>
                  </div>
                ) : (
                  <span className="rounded-md px-2 py-0.5 text-[11px] font-medium" style={{ background: 'var(--bg-gray-subtle)', color: 'var(--text-muted)' }}>
                    Full model
                  </span>
                )}

                <div className="ml-auto">
                  <button
                    type="button"
                    onClick={() => handlePlan()}
                    disabled={!prompt.trim() || store.status === 'loading'}
                    className="flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-200 disabled:opacity-30"
                    style={{ background: 'var(--acfs-navy)', color: 'var(--text-white)' }}
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
