'use client'

import { useState, useCallback, useMemo } from 'react'
import { Copy, Check } from 'lucide-react'
import type { IntentModel, SectionType } from '@/domain/intent-model/types'
import { SECTION_TYPE_TO_MODEL_KEY } from '@/domain/intent-model/types'

const SECTION_LABELS: Record<SectionType, string> = {
  actor: 'Actors',
  entity: 'Entities',
  journey: 'Journeys',
  business_rule: 'Business Rules',
  constraint: 'Constraints',
  open_question: 'Open Questions',
}

// --- LCS-based line diff ---

type DiffLine = {
  type: 'equal' | 'added' | 'removed' | 'modified'
  leftLine: number | null
  rightLine: number | null
  leftText: string
  rightText: string
}

function lcs(a: string[], b: string[]): number[][] {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp
}

function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const dp = lcs(oldLines, newLines)

  const result: DiffLine[] = []
  let i = oldLines.length
  let j = newLines.length

  const stack: DiffLine[] = []

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      stack.push({ type: 'equal', leftLine: i, rightLine: j, leftText: oldLines[i - 1], rightText: newLines[j - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: 'added', leftLine: null, rightLine: j, leftText: '', rightText: newLines[j - 1] })
      j--
    } else {
      stack.push({ type: 'removed', leftLine: i, rightLine: null, leftText: oldLines[i - 1], rightText: '' })
      i--
    }
  }

  stack.reverse()

  // Pair adjacent removed+added as "modified" for better alignment
  for (let k = 0; k < stack.length; k++) {
    const line = stack[k]
    const next = stack[k + 1]
    if (line.type === 'removed' && next?.type === 'added') {
      result.push({
        type: 'modified',
        leftLine: line.leftLine,
        rightLine: next.rightLine,
        leftText: line.leftText,
        rightText: next.rightText,
      })
      k++ // skip next
    } else {
      result.push(line)
    }
  }

  return result
}

// --- Word-level highlighting ---

function tokenize(text: string): string[] {
  return text.match(/\S+|\s+/g) ?? []
}

function HighlightedLine({ text, otherText, side }: { text: string; otherText: string; side: 'left' | 'right' }) {
  if (!otherText) {
    return <span>{text}</span>
  }

  const tokens = tokenize(text)
  const otherTokens = new Set(tokenize(otherText))

  return (
    <span>
      {tokens.map((token, i) => {
        if (token.trim() && !otherTokens.has(token)) {
          const bg = side === 'left' ? 'bg-red-200/70' : 'bg-emerald-200/70'
          return <span key={i} className={`${bg} rounded-sm`}>{token}</span>
        }
        return <span key={i}>{token}</span>
      })}
    </span>
  )
}

// --- Row component ---

function DiffRow({ line }: { line: DiffLine }) {
  const leftBg = line.type === 'removed' ? 'rgba(225,29,72,0.06)' : line.type === 'modified' ? 'rgba(225,29,72,0.04)' : 'transparent'
  const rightBg = line.type === 'added' ? 'rgba(37,186,59,0.06)' : line.type === 'modified' ? 'rgba(37,186,59,0.04)' : 'transparent'
  const lineNumColor = 'var(--text-muted)'

  return (
    <div className="flex" style={{ minHeight: '22px' }}>
      {/* Left */}
      <div className="flex flex-1 font-mono text-[13px] leading-[22px]" style={{ background: leftBg }}>
        <span className="w-10 shrink-0 select-none text-right pr-2" style={{ color: lineNumColor }}>
          {line.leftLine ?? ''}
        </span>
        <span className="flex-1 whitespace-pre-wrap break-all px-2" style={{ color: line.type === 'equal' ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
          {line.type === 'modified' ? (
            <HighlightedLine text={line.leftText} otherText={line.rightText} side="left" />
          ) : (
            line.leftText
          )}
        </span>
      </div>

      {/* Gutter */}
      <div className="w-px shrink-0" style={{ background: 'var(--border-default)' }} />

      {/* Right */}
      <div className="flex flex-1 font-mono text-[13px] leading-[22px]" style={{ background: rightBg }}>
        <span className="w-10 shrink-0 select-none text-right pr-2" style={{ color: lineNumColor }}>
          {line.rightLine ?? ''}
        </span>
        <span className="flex-1 whitespace-pre-wrap break-all px-2" style={{ color: line.type === 'equal' ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
          {line.type === 'modified' ? (
            <HighlightedLine text={line.rightText} otherText={line.leftText} side="right" />
          ) : (
            line.rightText
          )}
        </span>
      </div>
    </div>
  )
}

// --- Section diff ---

type ItemDiff = {
  id: string
  name: string
  change: 'added' | 'removed' | 'modified' | 'unchanged'
  lines: DiffLine[]
}

function diffSection(sectionType: SectionType, previous: IntentModel, current: IntentModel): ItemDiff[] {
  const key = SECTION_TYPE_TO_MODEL_KEY[sectionType]
  const oldItems = (previous[key] as Array<Record<string, unknown>>) ?? []
  const newItems = (current[key] as Array<Record<string, unknown>>) ?? []

  const oldMap = new Map(oldItems.map(i => [i.id as string, i]))
  const newMap = new Map(newItems.map(i => [i.id as string, i]))

  const diffs: ItemDiff[] = []

  for (const [id, newItem] of newMap) {
    const oldItem = oldMap.get(id)
    const newJson = JSON.stringify(newItem, null, 2)
    const name = (newItem.name ?? newItem.question ?? newItem.constraint ?? newItem.id) as string

    if (!oldItem) {
      diffs.push({ id, name, change: 'added', lines: computeLineDiff('', newJson) })
    } else {
      const oldJson = JSON.stringify(oldItem, null, 2)
      if (oldJson === newJson) {
        diffs.push({ id, name, change: 'unchanged', lines: [] })
      } else {
        diffs.push({ id, name, change: 'modified', lines: computeLineDiff(oldJson, newJson) })
      }
    }
  }

  for (const [id, oldItem] of oldMap) {
    if (!newMap.has(id)) {
      const name = (oldItem.name ?? oldItem.question ?? oldItem.constraint ?? oldItem.id) as string
      diffs.push({ id, name, change: 'removed', lines: computeLineDiff(JSON.stringify(oldItem, null, 2), '') })
    }
  }

  return diffs
}

function ItemDiffView({ diff }: { diff: ItemDiff }) {
  const [expanded, setExpanded] = useState(diff.change !== 'unchanged')
  const label = { added: '+', removed: '−', modified: '~', unchanged: '=' }[diff.change]
  const color = { added: '#25BA3B', removed: '#E11D48', modified: '#0081F2', unchanged: 'var(--text-muted)' }[diff.change]

  return (
    <div className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--border-default)' }}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(!expanded) } }}
        className="flex cursor-pointer items-center gap-2 px-3 py-2 transition-colors duration-150 hover:bg-black/[0.02]"
        style={{ background: 'var(--bg-card-gray)' }}
      >
        <span className="text-sm font-bold" style={{ color, fontFamily: 'monospace' }}>{label}</span>
        <span className="text-sm font-medium" style={{ color: 'var(--acfs-navy)' }}>{diff.name}</span>
        <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
          {diff.lines.filter(l => l.type !== 'equal').length} changes · {expanded ? '▾' : '▸'}
        </span>
      </div>

      {expanded && diff.lines.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-default)' }}>
          {/* Column headers */}
          <div className="flex text-xs font-medium" style={{ background: 'var(--bg-card-gray)', borderBottom: '1px solid var(--border-default)' }}>
            <div className="flex-1 px-3 py-1" style={{ color: 'var(--text-muted)' }}>Before</div>
            <div className="w-px" style={{ background: 'var(--border-default)' }} />
            <div className="flex-1 px-3 py-1" style={{ color: 'var(--text-muted)' }}>After</div>
          </div>
          {/* Lines */}
          <div style={{ background: 'var(--bg-white)' }}>
            {diff.lines.map((line, i) => (
              <DiffRow key={i} line={line} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// --- Main component ---

export function SideBySideDiff({ previous, current }: { previous: IntentModel; current: IntentModel }) {
  const [copied, setCopied] = useState(false)
  const sectionTypes = Object.keys(SECTION_TYPE_TO_MODEL_KEY) as SectionType[]

  const allDiffs = useMemo(() =>
    sectionTypes.map(st => ({
      sectionType: st,
      items: diffSection(st, previous, current),
    })).filter(s => s.items.some(i => i.change !== 'unchanged')),
    [previous, current],
  )

  const stats = useMemo(() => {
    let added = 0, removed = 0, modified = 0
    for (const s of allDiffs) {
      for (const i of s.items) {
        if (i.change === 'added') added++
        else if (i.change === 'removed') removed++
        else if (i.change === 'modified') modified++
      }
    }
    return { total: added + removed + modified, added, removed, modified }
  }, [allDiffs])

  const copyDiff = useCallback(() => {
    const lines: string[] = []
    for (const section of allDiffs) {
      const changed = section.items.filter(i => i.change !== 'unchanged')
      if (changed.length === 0) continue
      lines.push(`## ${SECTION_LABELS[section.sectionType]}`)
      for (const item of changed) {
        const prefix = item.change === 'added' ? '+' : item.change === 'removed' ? '-' : '~'
        lines.push(`${prefix} ${item.name} (${item.change})`)
      }
      lines.push('')
    }
    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [allDiffs])

  if (allDiffs.length === 0) {
    return (
      <div className="rounded-xl p-8 text-center" style={{ background: 'var(--bg-white)', border: '1px solid var(--border-default)' }}>
        <p style={{ color: 'var(--text-muted)' }}>No changes between versions.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium" style={{ background: 'var(--bg-gray-subtle)', color: 'var(--text-muted)' }}>
        <span>{stats.total} change{stats.total !== 1 ? 's' : ''}</span>
        <span className="h-4 w-px bg-slate-200" />
        {stats.added > 0 && <span style={{ color: '#25BA3B' }}>+{stats.added} added</span>}
        {stats.removed > 0 && <span style={{ color: '#E11D48' }}>-{stats.removed} removed</span>}
        {stats.modified > 0 && <span style={{ color: '#0081F2' }}>~{stats.modified} modified</span>}
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

      {/* Sections */}
      {allDiffs.map(section => (
        <div key={section.sectionType}>
          <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {SECTION_LABELS[section.sectionType]}
          </h3>
          <div className="space-y-2">
            {section.items.filter(i => i.change !== 'unchanged').map(item => (
              <ItemDiffView key={item.id} diff={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
