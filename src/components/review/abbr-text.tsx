'use client'

import { Children, type ReactNode, isValidElement } from 'react'
import { projectConfig } from '@/lib/project-config'

const GLOSSARY: Record<string, string> = projectConfig.abbreviations

// Sort by length descending so longer matches take priority (e.g., "ACFS" before "FF")
// Allow optional trailing "s" for plurals (HBLs, DOs, FFs, etc.)
const ABBR_PATTERN = new RegExp(
  `\\b(${Object.keys(GLOSSARY).sort((a, b) => b.length - a.length).join('|')})s?\\b`,
  'g',
)

export function AbbrText({ text }: { text: string }) {
  const parts: Array<{ type: 'text' | 'abbr'; value: string; expansion?: string }> = []
  let lastIndex = 0

  for (const match of text.matchAll(ABBR_PATTERN)) {
    const abbr = match[0]
    const index = match.index!

    if (index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, index) })
    }

    const base = abbr.endsWith('s') && !GLOSSARY[abbr] ? abbr.slice(0, -1) : abbr
    const expansion = GLOSSARY[base] ?? GLOSSARY[abbr]
    const plural = abbr.endsWith('s') && base !== abbr
    parts.push({ type: 'abbr', value: abbr, expansion: expansion ? (plural ? expansion + 's' : expansion) : abbr })
    lastIndex = index + abbr.length
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) })
  }

  if (parts.every(p => p.type === 'text')) {
    return <>{text}</>
  }

  return (
    <>
      {parts.map((part, i) => {
        if (part.type === 'abbr') {
          return (
            <span key={i} className="abbr-wrapper">
              <abbr className="abbr-term">{part.value}</abbr>
              <span className="abbr-tooltip">{part.expansion}</span>
            </span>
          )
        }
        return <span key={i}>{part.value}</span>
      })}
    </>
  )
}

export function processAbbrInChildren(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === 'string') {
      return <AbbrText text={child} />
    }
    if (isValidElement(child)) {
      const props = child.props as Record<string, unknown>
      if (props.children) {
        return { ...child, props: { ...props, children: processAbbrInChildren(props.children as ReactNode) } }
      }
    }
    return child
  })
}
