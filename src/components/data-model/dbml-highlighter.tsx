// src/components/data-model/dbml-highlighter.tsx

type Token = {
  type: 'keyword' | 'type' | 'constraint' | 'comment' | 'string' | 'enum-value' | 'symbol' | 'text'
  value: string
}

const KEYWORDS = ['Table', 'Enum', 'Ref', 'Note', 'indexes']
const TYPES = ['int', 'varchar', 'char', 'text', 'boolean', 'timestamp', 'date', 'time', 'decimal']
const CONSTRAINTS = ['pk', 'increment', 'not null', 'unique', 'default', 'null', 'note', 'ref']

function tokenizeDbml(content: string): Token[] {
  const tokens: Token[] = []
  const lines = content.split('\n')

  for (const line of lines) {
    // Comment line
    if (line.trim().startsWith('//')) {
      tokens.push({ type: 'comment', value: line + '\n' })
      continue
    }

    // Parse line character by character
    let i = 0
    while (i < line.length) {
      const char = line[i]

      // String literals (single or double quotes)
      if (char === "'" || char === '"') {
        const quote = char
        let str = char
        i++
        while (i < line.length && line[i] !== quote) {
          str += line[i]
          i++
        }
        if (i < line.length) {
          str += line[i]
          i++
        }
        tokens.push({ type: 'string', value: str })
        continue
      }

      // Symbols and brackets
      if (['{', '}', '(', ')', '[', ']', ':', ',', '.', '>', '<'].includes(char)) {
        tokens.push({ type: 'symbol', value: char })
        i++
        continue
      }

      // Whitespace
      if (/\s/.test(char)) {
        tokens.push({ type: 'text', value: char })
        i++
        continue
      }

      // Word (keyword, type, constraint, or identifier)
      if (/[a-zA-Z_]/.test(char)) {
        let word = ''
        while (i < line.length && /[a-zA-Z0-9_]/.test(line[i])) {
          word += line[i]
          i++
        }

        // Check for multi-word constraints (e.g., "not null")
        const remaining = line.slice(i).trimStart()
        if (word === 'not' && remaining.startsWith('null')) {
          word = 'not null'
          i += remaining.indexOf('null') + 4
        }

        // Classify word
        if (KEYWORDS.includes(word)) {
          tokens.push({ type: 'keyword', value: word })
        } else if (TYPES.includes(word)) {
          tokens.push({ type: 'type', value: word })
        } else if (CONSTRAINTS.includes(word)) {
          tokens.push({ type: 'constraint', value: word })
        } else {
          tokens.push({ type: 'text', value: word })
        }
        continue
      }

      // Numbers and other characters
      tokens.push({ type: 'text', value: char })
      i++
    }

    tokens.push({ type: 'text', value: '\n' })
  }

  return tokens
}

type DbmlHighlighterProps = {
  content: string
}

export function DbmlHighlighter({ content }: DbmlHighlighterProps) {
  const tokens = tokenizeDbml(content)

  const getTokenStyle = (type: Token['type']): React.CSSProperties => {
    switch (type) {
      case 'keyword':
        return { color: '#0081F2', fontWeight: 600 }
      case 'type':
        return { color: '#8B5CF6' }
      case 'constraint':
        return { color: '#EC4899' }
      case 'comment':
        return { color: '#9CA3AF', fontStyle: 'italic' }
      case 'string':
        return { color: '#10B981' }
      case 'symbol':
        return { color: '#6B7280' }
      case 'text':
      default:
        return { color: 'var(--text-primary)' }
    }
  }

  return (
    <pre
      className="font-mono text-[13px] leading-relaxed"
      style={{
        background: 'var(--bg-white)',
        border: '1px solid var(--border-default)',
        borderRadius: 12,
        padding: '16px 20px',
        margin: 0,
      }}
    >
      <code>
        {tokens.map((token, idx) => (
          <span key={idx} style={getTokenStyle(token.type)}>
            {token.value}
          </span>
        ))}
      </code>
    </pre>
  )
}
