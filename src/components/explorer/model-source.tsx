'use client'

import { useMemo } from 'react'

// Simple TypeScript syntax highlighter — no dependencies
// Tokenizes and wraps in colored spans

type Token = { type: 'keyword' | 'string' | 'number' | 'comment' | 'type' | 'property' | 'punctuation' | 'plain'; text: string }

const TS_KEYWORDS = new Set([
  'import', 'export', 'from', 'const', 'let', 'var', 'type', 'interface',
  'function', 'return', 'if', 'else', 'for', 'while', 'of', 'in',
  'true', 'false', 'null', 'undefined', 'new', 'as', 'readonly',
])

const TS_TYPES = new Set([
  'string', 'number', 'boolean', 'void', 'any', 'never', 'unknown',
  'IntentModel', 'Actor', 'Entity', 'Journey', 'BusinessRule', 'Constraint',
  'OpenQuestion', 'ModelMeta', 'Responsibility', 'Field', 'Transition',
  'JourneyStep', 'Lifecycle',
])

function tokenize(code: string): Token[][] {
  return code.split('\n').map(line => {
    const tokens: Token[] = []
    let i = 0

    while (i < line.length) {
      // Comments
      if (line[i] === '/' && line[i + 1] === '/') {
        tokens.push({ type: 'comment', text: line.slice(i) })
        break
      }

      // Strings (single or double quote)
      if (line[i] === "'" || line[i] === '"') {
        const quote = line[i]
        let j = i + 1
        while (j < line.length && line[j] !== quote) {
          if (line[j] === '\\') j++
          j++
        }
        tokens.push({ type: 'string', text: line.slice(i, j + 1) })
        i = j + 1
        continue
      }

      // Template string backtick
      if (line[i] === '`') {
        let j = i + 1
        while (j < line.length && line[j] !== '`') {
          if (line[j] === '\\') j++
          j++
        }
        tokens.push({ type: 'string', text: line.slice(i, j + 1) })
        i = j + 1
        continue
      }

      // Numbers
      if (/[0-9]/.test(line[i]) && (i === 0 || /[\s,:[(}{=+\-*/]/.test(line[i - 1]))) {
        let j = i
        while (j < line.length && /[0-9.]/.test(line[j])) j++
        tokens.push({ type: 'number', text: line.slice(i, j) })
        i = j
        continue
      }

      // Words (keywords, types, properties)
      if (/[a-zA-Z_$]/.test(line[i])) {
        let j = i
        while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j])) j++
        const word = line.slice(i, j)

        if (TS_KEYWORDS.has(word)) {
          tokens.push({ type: 'keyword', text: word })
        } else if (TS_TYPES.has(word)) {
          tokens.push({ type: 'type', text: word })
        } else if (j < line.length && line[j] === ':') {
          tokens.push({ type: 'property', text: word })
        } else {
          tokens.push({ type: 'plain', text: word })
        }
        i = j
        continue
      }

      // Punctuation
      if (/[{}()[\]:;,=<>+\-*/.?!&|~^%@#]/.test(line[i])) {
        tokens.push({ type: 'punctuation', text: line[i] })
        i++
        continue
      }

      // Whitespace and other
      let j = i
      while (j < line.length && !/[a-zA-Z0-9_$'"`/{}()[\]:;,=<>+\-*/.?!&|~^%@#]/.test(line[j])) j++
      if (j > i) {
        tokens.push({ type: 'plain', text: line.slice(i, j) })
        i = j
      } else {
        tokens.push({ type: 'plain', text: line[i] })
        i++
      }
    }

    return tokens
  })
}

const TOKEN_COLORS: Record<Token['type'], string> = {
  keyword: '#C678DD',
  string: '#98C379',
  number: '#D19A66',
  comment: '#5C6370',
  type: '#E5C07B',
  property: '#E06C75',
  punctuation: '#ABB2BF',
  plain: '#ABB2BF',
}

function HighlightedLine({ tokens }: { tokens: Token[] }) {
  return (
    <>
      {tokens.map((token, i) => (
        <span key={i} style={{ color: TOKEN_COLORS[token.type] }}>
          {token.text}
        </span>
      ))}
    </>
  )
}

export function ModelSource({ source }: { source: string }) {
  const tokenizedLines = useMemo(() => tokenize(source), [source])

  return (
    <div className="h-full overflow-auto custom-scroll" style={{ background: '#282C34' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-3"
          style={{ background: '#282C34', borderBottom: '1px solid #3E4451' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-medium" style={{ color: '#ABB2BF' }}>
              src/domain/intent-model/model.ts
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#3E4451', color: '#5C6370' }}>
              {tokenizedLines.length} lines
            </span>
          </div>
        </div>

        {/* Code */}
        <pre
          className="m-0 px-0 py-4 text-[13px] leading-[1.7] whitespace-pre-wrap break-words"
          style={{ fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', Menlo, Monaco, monospace" }}
        >
          {tokenizedLines.map((tokens, lineNum) => (
            <div key={lineNum} className="flex hover:bg-[#2C313A] transition-colors duration-100">
              <span
                className="shrink-0 text-right select-none px-4"
                style={{ width: 56, color: '#4B5263', fontSize: 12 }}
              >
                {lineNum + 1}
              </span>
              <code className="flex-1 pr-6 min-w-0">
                <HighlightedLine tokens={tokens} />
              </code>
            </div>
          ))}
        </pre>
      </div>
    </div>
  )
}
