'use client'

import { useState, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Plus, Minus, Pencil, ChevronRight, Copy, Check } from 'lucide-react'
import type { DiffItem } from '@/lib/review-utils'

const changeConfig = {
  added: { label: 'Added', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', border: 'border-l-emerald-500', bg: 'bg-emerald-50/30', icon: Plus, color: 'text-emerald-700' },
  removed: { label: 'Removed', badge: 'bg-red-100 text-red-800 border-red-300', border: 'border-l-red-500', bg: 'bg-red-50/30', icon: Minus, color: 'text-red-700' },
  modified: { label: 'Modified', badge: 'bg-blue-100 text-blue-800 border-blue-300', border: 'border-l-blue-500', bg: 'bg-blue-50/30', icon: Pencil, color: 'text-blue-700' },
  unchanged: { label: 'Unchanged', badge: 'bg-gray-100 text-gray-600 border-gray-300', border: 'border-l-slate-300', bg: '', icon: null, color: 'text-slate-400' },
} as const

function formatValue(value: unknown): string {
  if (value === undefined) return ''
  if (value === null) return 'null'
  if (typeof value === 'string') return value
  if (typeof value === 'boolean' || typeof value === 'number') return String(value)
  return JSON.stringify(value, null, 2)
}

function InlineDiffLine({ value, type }: { value: string; type: 'added' | 'removed' }) {
  const bg = type === 'added' ? 'bg-emerald-50' : 'bg-red-50'
  const text = type === 'added' ? 'text-emerald-800' : 'text-red-800'
  const sign = type === 'added' ? '+' : '−'
  const signColor = type === 'added' ? 'text-emerald-500' : 'text-red-400'

  return (
    <div className={`${bg} flex font-mono text-[13px] leading-6`}>
      <span className={`${signColor} select-none w-6 shrink-0 text-center`}>{sign}</span>
      <span className={`${text} whitespace-pre-wrap break-all`}>{value}</span>
    </div>
  )
}

function FieldDiff({ fieldKey, oldVal, newVal }: { fieldKey: string; oldVal: unknown; newVal: unknown }) {
  const oldStr = formatValue(oldVal)
  const newStr = formatValue(newVal)

  if (oldStr === newStr) return null

  return (
    <div className="overflow-hidden rounded-md border border-slate-200">
      <div className="bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 border-b border-slate-200">
        {fieldKey}
      </div>
      <div>
        {oldStr && <InlineDiffLine value={oldStr} type="removed" />}
        {newStr && <InlineDiffLine value={newStr} type="added" />}
      </div>
    </div>
  )
}

function ItemDiff({ diff }: { diff: DiffItem }) {
  const [expanded, setExpanded] = useState(diff.change === 'modified')
  const config = changeConfig[diff.change]
  const Icon = config.icon

  const displayName = diff.current
    ? ('name' in diff.current ? diff.current.name : diff.current.id)
    : diff.previous
      ? ('name' in diff.previous ? diff.previous.name : diff.previous.id)
      : diff.targetId

  const oldObj = (diff.previous ?? {}) as Record<string, unknown>
  const newObj = (diff.current ?? {}) as Record<string, unknown>
  const allKeys = [...new Set([...Object.keys(oldObj), ...Object.keys(newObj)])]
  const changedKeys = allKeys.filter(k => {
    if (k === 'id') return false
    return JSON.stringify(oldObj[k]) !== JSON.stringify(newObj[k])
  })

  const hasDetails = diff.change === 'modified' && changedKeys.length > 0

  return (
    <div className={`overflow-hidden rounded-lg border-l-[3px] ${config.border} border border-slate-200`}>
      <button
        type="button"
        onClick={() => hasDetails && setExpanded(!expanded)}
        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 ${hasDetails ? 'hover:bg-slate-50 cursor-pointer' : ''}`}
      >
        {Icon && <Icon size={16} className={config.color} />}
        <div className="min-w-0 flex-1">
          <span className="font-medium text-slate-800">{displayName as string}</span>
          <code className="ml-2 text-xs text-slate-400">{diff.targetId}</code>
        </div>
        {hasDetails && (
          <span className="text-xs text-slate-400">
            {changedKeys.length} field{changedKeys.length > 1 ? 's' : ''}
          </span>
        )}
        <Badge variant="default" className={`text-xs shrink-0 ${config.badge}`}>
          {config.label}
        </Badge>
        {hasDetails && (
          <ChevronRight
            size={14}
            className={`text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
          />
        )}
      </button>

      {expanded && hasDetails && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 space-y-3">
          {changedKeys.map(key => (
            <FieldDiff key={key} fieldKey={key} oldVal={oldObj[key]} newVal={newObj[key]} />
          ))}
        </div>
      )}

      {/* For added/removed items, show full content */}
      {expanded && diff.change === 'added' && diff.current && (
        <div className="border-t border-slate-200 bg-emerald-50/30 px-4 py-3">
          <pre className="text-xs font-mono text-emerald-800 whitespace-pre-wrap overflow-auto max-h-60">
            {JSON.stringify(diff.current, null, 2)}
          </pre>
        </div>
      )}
      {expanded && diff.change === 'removed' && diff.previous && (
        <div className="border-t border-slate-200 bg-red-50/30 px-4 py-3">
          <pre className="text-xs font-mono text-red-800 whitespace-pre-wrap overflow-auto max-h-60 line-through">
            {JSON.stringify(diff.previous, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

export function DiffViewer({ diffs }: { diffs: DiffItem[] }) {
  const [copied, setCopied] = useState(false)
  const changes = diffs.filter(d => d.change !== 'unchanged')
  const unchanged = diffs.filter(d => d.change === 'unchanged')

  const added = changes.filter(d => d.change === 'added').length
  const removed = changes.filter(d => d.change === 'removed').length
  const modified = changes.filter(d => d.change === 'modified').length

  const copyDiff = useCallback(() => {
    const lines: string[] = []
    for (const d of changes) {
      const name = d.current
        ? ('name' in d.current ? d.current.name : d.current.id)
        : d.previous
          ? ('name' in d.previous ? d.previous.name : d.previous.id)
          : d.targetId
      const prefix = d.change === 'added' ? '+' : d.change === 'removed' ? '-' : '~'
      lines.push(`${prefix} ${name} (${d.change})`)
      if (d.change === 'modified' && d.current && d.previous) {
        const oldObj = d.previous as Record<string, unknown>
        const newObj = d.current as Record<string, unknown>
        for (const key of Object.keys(newObj)) {
          if (key !== 'id' && JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
            lines.push(`  ${key}: ${JSON.stringify(oldObj[key])} → ${JSON.stringify(newObj[key])}`)
          }
        }
      }
    }
    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [changes])

  if (changes.length === 0) {
    return (
      <div className="rounded-xl p-8 text-center" style={{ background: 'var(--bg-white)', border: '1px solid var(--border-default)' }}>
        <p style={{ color: 'var(--text-muted)' }}>No changes between versions.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium" style={{ background: 'var(--bg-gray-subtle)', color: 'var(--text-muted)' }}>
        <span>{changes.length} change{changes.length !== 1 ? 's' : ''}</span>
        <span className="h-4 w-px bg-slate-200" />
        {added > 0 && <span className="text-emerald-600">+{added} added</span>}
        {removed > 0 && <span className="text-red-600">-{removed} removed</span>}
        {modified > 0 && <span className="text-blue-600">~{modified} modified</span>}
        {unchanged.length > 0 && (
          <>
            <span className="h-4 w-px bg-slate-200" />
            <span className="text-slate-400">{unchanged.length} unchanged</span>
          </>
        )}
        <button
          type="button"
          onClick={copyDiff}
          className="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors duration-200 hover:bg-slate-200"
          title="Copy diff to clipboard"
        >
          {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {/* Changes */}
      <div className="space-y-3">
        {changes.map(diff => (
          <ItemDiff key={diff.targetId} diff={diff} />
        ))}
      </div>
    </div>
  )
}
