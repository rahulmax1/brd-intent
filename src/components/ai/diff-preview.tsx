'use client'

import { Plus, Minus, Pencil, AlertTriangle, ChevronRight, Copy, Check } from 'lucide-react'
import { useState, useMemo, useCallback } from 'react'
import type { ModelDiff, ItemChange, FieldChange } from '@/lib/model-diff'

const changeStyles = {
  added: { border: 'border-l-emerald-500', bg: 'bg-emerald-50/50', icon: Plus, label: 'Added', color: 'text-emerald-700' },
  removed: { border: 'border-l-red-500', bg: 'bg-red-50/50', icon: Minus, label: 'Removed', color: 'text-red-700' },
  modified: { border: 'border-l-blue-500', bg: 'bg-blue-50/50', icon: Pencil, label: 'Modified', color: 'text-blue-700' },
} as const

function formatValue(value: unknown): string {
  if (value === undefined) return ''
  if (value === null) return 'null'
  if (typeof value === 'string') return value
  if (typeof value === 'boolean' || typeof value === 'number') return String(value)
  return JSON.stringify(value, null, 2)
}

function isMultiline(value: unknown): boolean {
  const str = formatValue(value)
  return str.includes('\n') || str.length > 80
}

function tokenize(str: string): string[] {
  return str.split(/(\s+)/)
}

function WordDiff({ oldText, newText }: { oldText: string; newText: string }) {
  const oldTokens = tokenize(oldText)
  const newTokens = tokenize(newText)

  const oldSet = new Set(oldTokens)
  const newSet = new Set(newTokens)

  return (
    <span className="font-mono text-[13px] leading-relaxed">
      {newTokens.map((token, i) => {
        if (!oldSet.has(token) && token.trim()) {
          return <span key={i} className="rounded-sm bg-emerald-200/60 text-emerald-900 px-0.5">{token}</span>
        }
        return <span key={i}>{token}</span>
      })}
      {oldTokens
        .filter(t => !newSet.has(t) && t.trim())
        .map((token, i) => (
          <span key={`rm-${i}`} className="rounded-sm bg-red-200/60 text-red-800 line-through px-0.5 ml-1">{token}</span>
        ))}
    </span>
  )
}

function InlineDiffLine({ prefix, value, type }: { prefix: string; value: string; type: 'added' | 'removed' }) {
  const bg = type === 'added' ? 'bg-emerald-50' : 'bg-red-50'
  const text = type === 'added' ? 'text-emerald-800' : 'text-red-800'
  const sign = type === 'added' ? '+' : '−'
  const signColor = type === 'added' ? 'text-emerald-500' : 'text-red-400'

  return (
    <div className={`${bg} flex font-mono text-[13px] leading-6`}>
      <span className={`${signColor} select-none w-6 shrink-0 text-center`}>{sign}</span>
      <span className={text}>
        {prefix && <span className="text-slate-500">{prefix} </span>}
        {value}
      </span>
    </div>
  )
}

function UnchangedLine({ value }: { value: string }) {
  return (
    <div className="flex font-mono text-[13px] leading-6 text-slate-500">
      <span className="select-none w-6 shrink-0 text-center">&nbsp;</span>
      {value}
    </div>
  )
}

function ArrayDiff({ field, oldArr, newArr }: { field: string; oldArr: unknown[]; newArr: unknown[] }) {
  const oldStrs = oldArr.map(formatValue)
  const newStrs = newArr.map(formatValue)
  const oldSet = new Set(oldStrs)
  const newSet = new Set(newStrs)

  const added = newStrs.filter(s => !oldSet.has(s))
  const removed = oldStrs.filter(s => !newSet.has(s))
  const kept = newStrs.filter(s => oldSet.has(s))

  return (
    <div className="overflow-hidden rounded-md border border-slate-200">
      <div className="bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 border-b border-slate-200">
        {field}
      </div>
      <div className="divide-y divide-slate-100">
        {kept.map((v, i) => <UnchangedLine key={`k-${i}`} value={`  ${v}`} />)}
        {removed.map((v, i) => <InlineDiffLine key={`r-${i}`} prefix="" value={`  ${v}`} type="removed" />)}
        {added.map((v, i) => <InlineDiffLine key={`a-${i}`} prefix="" value={`  ${v}`} type="added" />)}
      </div>
    </div>
  )
}

function ObjectDiff({ field, oldObj, newObj }: { field: string; oldObj: Record<string, unknown>; newObj: Record<string, unknown> }) {
  const allKeys = useMemo(() => [...new Set([...Object.keys(oldObj), ...Object.keys(newObj)])], [oldObj, newObj])

  return (
    <div className="overflow-hidden rounded-md border border-slate-200">
      <div className="bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 border-b border-slate-200">
        {field}
      </div>
      <div>
        {allKeys.map(key => {
          const oldVal = formatValue(oldObj[key])
          const newVal = formatValue(newObj[key])
          if (oldVal === newVal) {
            return <UnchangedLine key={key} value={`  ${key}: ${newVal}`} />
          }
          return (
            <div key={key}>
              {oldVal && <InlineDiffLine prefix={`${key}:`} value={oldVal} type="removed" />}
              {newVal && <InlineDiffLine prefix={`${key}:`} value={newVal} type="added" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FieldDiff({ change }: { change: FieldChange }) {
  const oldVal = change.old
  const newVal = change.new

  const bothArrays = Array.isArray(oldVal) && Array.isArray(newVal)
  const bothObjects = !bothArrays
    && typeof oldVal === 'object' && oldVal !== null
    && typeof newVal === 'object' && newVal !== null

  if (bothArrays) {
    return <ArrayDiff field={change.field} oldArr={oldVal as unknown[]} newArr={newVal as unknown[]} />
  }

  if (bothObjects) {
    return <ObjectDiff field={change.field} oldObj={oldVal as Record<string, unknown>} newObj={newVal as Record<string, unknown>} />
  }

  const oldStr = formatValue(oldVal)
  const newStr = formatValue(newVal)
  const multi = isMultiline(oldVal) || isMultiline(newVal)

  if (multi) {
    return (
      <div className="overflow-hidden rounded-md border border-slate-200">
        <div className="bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 border-b border-slate-200">
          {change.field}
        </div>
        <div>
          {oldStr && <InlineDiffLine prefix="" value={oldStr} type="removed" />}
          {newStr && <InlineDiffLine prefix="" value={newStr} type="added" />}
        </div>
      </div>
    )
  }

  // Single-line inline diff with word highlighting
  if (!oldStr && newStr) {
    return (
      <div className="flex items-baseline gap-2 text-[13px]">
        <span className="min-w-24 shrink-0 font-medium text-slate-500">{change.field}</span>
        <span className="rounded-sm bg-emerald-100 text-emerald-800 px-1.5 py-0.5 font-mono">{newStr}</span>
      </div>
    )
  }

  if (oldStr && !newStr) {
    return (
      <div className="flex items-baseline gap-2 text-[13px]">
        <span className="min-w-24 shrink-0 font-medium text-slate-500">{change.field}</span>
        <span className="rounded-sm bg-red-100 text-red-700 line-through px-1.5 py-0.5 font-mono">{oldStr}</span>
      </div>
    )
  }

  return (
    <div className="flex items-baseline gap-2 text-[13px]">
      <span className="min-w-24 shrink-0 font-medium text-slate-500">{change.field}</span>
      <WordDiff oldText={oldStr} newText={newStr} />
    </div>
  )
}

function ChangeItem({ change }: { change: ItemChange }) {
  const [expanded, setExpanded] = useState(change.type === 'modified')
  const style = changeStyles[change.type]
  const Icon = style.icon
  const hasFields = change.fields && change.fields.length > 0

  return (
    <div className={`overflow-hidden rounded-md border-l-[3px] ${style.border} border border-l-[3px] border-slate-200`}>
      <button
        type="button"
        onClick={() => hasFields && setExpanded(!expanded)}
        className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors duration-150 ${hasFields ? 'hover:bg-slate-50 cursor-pointer' : ''}`}
      >
        <Icon size={14} className={style.color} />
        <span className="font-medium text-slate-800">{change.itemName}</span>
        {hasFields && (
          <span className="text-xs text-slate-400 ml-1">
            {change.fields!.length} field{change.fields!.length > 1 ? 's' : ''}
          </span>
        )}
        <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium ${style.bg} ${style.color}`}>
          {style.label}
        </span>
        {hasFields && (
          <ChevronRight
            size={14}
            className={`text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
          />
        )}
      </button>
      {expanded && hasFields && (
        <div className="border-t border-slate-200 bg-white px-3 py-3 space-y-3">
          {change.fields!.map((f) => (
            <FieldDiff key={f.field} change={f} />
          ))}
        </div>
      )}
    </div>
  )
}

export function DiffPreview({
  diff,
  warnings,
  onApprove,
  onReject,
  isApplying,
}: {
  diff: ModelDiff
  warnings: string[]
  onApprove: () => void
  onReject: () => void
  isApplying: boolean
}) {
  const [copied, setCopied] = useState(false)
  const totalChanges = diff.sections.reduce((sum, s) => sum + s.changes.length, 0)
  const added = diff.sections.reduce((sum, s) => sum + s.changes.filter(c => c.type === 'added').length, 0)
  const removed = diff.sections.reduce((sum, s) => sum + s.changes.filter(c => c.type === 'removed').length, 0)
  const modified = diff.sections.reduce((sum, s) => sum + s.changes.filter(c => c.type === 'modified').length, 0)

  const copyDiff = useCallback(() => {
    const lines: string[] = []
    for (const section of diff.sections) {
      lines.push(`## ${section.sectionType.replace('_', ' ')}`)
      for (const change of section.changes) {
        const prefix = change.type === 'added' ? '+' : change.type === 'removed' ? '-' : '~'
        lines.push(`${prefix} ${change.itemName} (${change.type})`)
        if (change.fields) {
          for (const f of change.fields) {
            lines.push(`  ${f.field}: ${JSON.stringify(f.old)} → ${JSON.stringify(f.new)}`)
          }
        }
      }
      lines.push('')
    }
    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [diff])

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
        <span>{totalChanges} change{totalChanges !== 1 ? 's' : ''}</span>
        <span className="h-3 w-px bg-slate-200" />
        {added > 0 && <span className="text-emerald-600">+{added} added</span>}
        {removed > 0 && <span className="text-red-600">-{removed} removed</span>}
        {modified > 0 && <span className="text-blue-600">~{modified} modified</span>}
        <button
          type="button"
          onClick={copyDiff}
          className="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors duration-200 hover:bg-slate-200"
          title="Copy diff to clipboard"
        >
          {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-1.5">
          {warnings.map((w) => (
            <div key={w} className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
              <span className="leading-relaxed">{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Sections */}
      {diff.sections.map((section) => (
        <div key={section.sectionType}>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {section.sectionType.replace('_', ' ')}
          </h4>
          <div className="space-y-2">
            {section.changes.map((change) => (
              <ChangeItem key={change.itemId} change={change} />
            ))}
          </div>
        </div>
      ))}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onApprove}
          disabled={isApplying}
          className="flex-1 rounded-[10px] px-3.5 py-2 text-sm font-medium transition-colors duration-200 disabled:opacity-50"
          style={{ background: 'var(--acfs-navy)', color: 'var(--text-white)' }}
        >
          {isApplying ? 'Applying...' : 'Approve'}
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={isApplying}
          className="flex-1 rounded-[10px] px-3.5 py-2 text-sm font-medium transition-colors duration-200 disabled:opacity-50"
          style={{ background: 'var(--bg-gray-subtle)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
        >
          Reject
        </button>
      </div>
    </div>
  )
}
