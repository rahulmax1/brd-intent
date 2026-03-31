# Database Schema View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add database schema visualization to Data Model page with tabs, DBML parser, and distinct visual treatment (teal accent, PK/FK badges, collapsible enum panel).

**Architecture:** Parse DBML file into typed structure, build ReactFlow graph with enhanced table nodes showing database details (primary keys, foreign keys, indexes), add tab switcher to toggle between intent model and schema views, collapsible enum panel for type definitions.

**Tech Stack:** TypeScript, React, Next.js, ReactFlow (@xyflow/react), Dagre layout, existing design system

**Reference Spec:** `docs/superpowers/specs/2026-03-26-database-schema-view-design.md`

---

## File Structure

**New files:**
- `src/data/acfs-datamodel-corrected.dbml` - Database schema definition
- `src/components/data-model/parse-dbml.ts` - DBML parser with types
- `src/components/data-model/database-schema-graph.ts` - Schema graph builder (Dagre layout)
- `src/components/data-model/database-table-node.tsx` - Enhanced table node with badges
- `src/components/data-model/database-enum-panel.tsx` - Collapsible enum sidebar
- `src/components/data-model/database-schema-canvas.tsx` - Schema canvas component
- `src/components/data-model/__tests__/parse-dbml.test.ts` - Parser unit tests

**Modified files:**
- `src/app/review/data-model/page.tsx` - Add tabs for Intent/Schema views
- `src/app/review/data-model/page-client.tsx` - Client component with tab switcher

---

## Tasks

### Task 1: Move DBML File

**Files:**
- Create: `src/data/` directory
- Move: `acfs-datamodel-corrected.dbml` → `src/data/acfs-datamodel-corrected.dbml`

- [ ] **Step 1: Create data directory**

```bash
mkdir -p src/data
```

- [ ] **Step 2: Move DBML file**

```bash
mv acfs-datamodel-corrected.dbml src/data/acfs-datamodel-corrected.dbml
```

- [ ] **Step 3: Verify file exists**

```bash
ls -la src/data/acfs-datamodel-corrected.dbml
```

Expected: File exists at new location

- [ ] **Step 4: Commit**

```bash
git add src/data/acfs-datamodel-corrected.dbml
git commit -m "chore: move DBML schema to src/data directory"
```

---

### Task 2: Create DBML Parser Types

**Files:**
- Create: `src/components/data-model/parse-dbml.ts` (types only)

- [ ] **Step 1: Create parser file with type definitions**

```typescript
// src/components/data-model/parse-dbml.ts

export type DbmlSchema = {
  tables: DbmlTable[]
  enums: DbmlEnum[]
  relationships: DbmlRelationship[]
}

export type DbmlTable = {
  name: string
  fields: DbmlField[]
  indexes: DbmlIndex[]
  note?: string
}

export type DbmlField = {
  name: string
  type: string
  isPrimaryKey: boolean
  isForeignKey: boolean
  foreignKeyRef?: { table: string; field: string }
  isNullable: boolean
  isUnique: boolean
  hasDefault: boolean
  defaultValue?: string
  note?: string
}

export type DbmlIndex = {
  fields: string[]
  isUnique: boolean
  isPrimaryKey: boolean
}

export type DbmlEnum = {
  name: string
  values: string[]
}

export type DbmlRelationship = {
  fromTable: string
  fromField: string
  toTable: string
  toField: string
  cardinality: '1:1' | '1:*' | '*:1' | '*:*'
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm build
```

Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add src/components/data-model/parse-dbml.ts
git commit -m "feat: add DBML parser type definitions"
```

---

### Task 3: Write Parser Tests (TDD)

**Files:**
- Create: `src/components/data-model/__tests__/parse-dbml.test.ts`

- [ ] **Step 1: Create test file with failing tests**

```typescript
// src/components/data-model/__tests__/parse-dbml.test.ts

import { describe, test, expect } from '@jest/globals'
import { parseDbml } from '../parse-dbml'

describe('parseDbml', () => {
  test('parses simple table definition', () => {
    const dbml = `
Table users {
  id int [pk, increment]
  email varchar(255) [unique, not null]
  created_at timestamp
}
`
    const result = parseDbml(dbml)

    expect(result.tables).toHaveLength(1)
    expect(result.tables[0].name).toBe('users')
    expect(result.tables[0].fields).toHaveLength(3)
    expect(result.tables[0].fields[0].isPrimaryKey).toBe(true)
    expect(result.tables[0].fields[1].isUnique).toBe(true)
    expect(result.tables[0].fields[1].isNullable).toBe(false)
  })

  test('parses enum definitions', () => {
    const dbml = `
Enum user_role {
  admin
  user
  guest
}
`
    const result = parseDbml(dbml)

    expect(result.enums).toHaveLength(1)
    expect(result.enums[0].name).toBe('user_role')
    expect(result.enums[0].values).toEqual(['admin', 'user', 'guest'])
  })

  test('parses foreign key references', () => {
    const dbml = `
Table posts {
  id int [pk]
  user_id int [ref: > users.id]
}
`
    const result = parseDbml(dbml)

    expect(result.tables[0].fields[1].isForeignKey).toBe(true)
    expect(result.tables[0].fields[1].foreignKeyRef).toEqual({
      table: 'users',
      field: 'id'
    })
    expect(result.relationships).toHaveLength(1)
    expect(result.relationships[0].fromTable).toBe('posts')
    expect(result.relationships[0].toTable).toBe('users')
  })

  test('parses field notes', () => {
    const dbml = `
Table users {
  email varchar(255) [note: 'User email address']
}
`
    const result = parseDbml(dbml)

    expect(result.tables[0].fields[0].note).toBe('User email address')
  })

  test('handles empty input', () => {
    const result = parseDbml('')

    expect(result.tables).toEqual([])
    expect(result.enums).toEqual([])
    expect(result.relationships).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test parse-dbml.test.ts
```

Expected: All tests FAIL (parseDbml function not implemented)

- [ ] **Step 3: Commit failing tests**

```bash
git add src/components/data-model/__tests__/parse-dbml.test.ts
git commit -m "test: add DBML parser tests (failing)"
```

---

### Task 4: Implement DBML Parser

**Files:**
- Modify: `src/components/data-model/parse-dbml.ts`

- [ ] **Step 1: Implement parser function**

```typescript
// src/components/data-model/parse-dbml.ts
// (Add after existing type definitions)

export function parseDbml(content: string): DbmlSchema {
  const lines = content.split('\n')
  const tables: DbmlTable[] = []
  const enums: DbmlEnum[] = []
  const relationships: DbmlRelationship[] = []

  let currentTable: DbmlTable | null = null
  let currentEnum: DbmlEnum | null = null
  let inIndexes = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Skip empty lines and comments
    if (!line || line.startsWith('//')) continue

    // Table start
    const tableMatch = line.match(/^Table\s+(\w+)\s*{/)
    if (tableMatch) {
      currentTable = {
        name: tableMatch[1],
        fields: [],
        indexes: [],
      }
      inIndexes = false
      continue
    }

    // Enum start
    const enumMatch = line.match(/^Enum\s+(\w+)\s*{/)
    if (enumMatch) {
      currentEnum = {
        name: enumMatch[1],
        values: [],
      }
      continue
    }

    // End of block
    if (line === '}') {
      if (currentTable) {
        tables.push(currentTable)
        currentTable = null
      }
      if (currentEnum) {
        enums.push(currentEnum)
        currentEnum = null
      }
      inIndexes = false
      continue
    }

    // Indexes section
    if (line === 'indexes {') {
      inIndexes = true
      continue
    }

    // Inside table
    if (currentTable && !inIndexes) {
      const fieldMatch = line.match(/^(\w+)\s+([\w()]+)(?:\s+\[(.*?)\])?/)
      if (fieldMatch) {
        const [, name, type, constraints = ''] = fieldMatch

        // Parse constraints
        const isPrimaryKey = /\bpk\b/.test(constraints)
        const isUnique = /\bunique\b/.test(constraints)
        const isNullable = !/\bnot null\b/.test(constraints)
        const hasDefault = /\bdefault:/.test(constraints)
        const defaultMatch = constraints.match(/default:\s*([^,\]]+)/)
        const defaultValue = defaultMatch ? defaultMatch[1].trim() : undefined

        // Parse note
        const noteMatch = constraints.match(/note:\s*['"]([^'"]+)['"]/)
        const note = noteMatch ? noteMatch[1] : undefined

        // Parse foreign key reference
        const refMatch = constraints.match(/ref:\s*>\s*(\w+)\.(\w+)/)
        let isForeignKey = false
        let foreignKeyRef: { table: string; field: string } | undefined

        if (refMatch) {
          isForeignKey = true
          foreignKeyRef = {
            table: refMatch[1],
            field: refMatch[2],
          }

          // Add to relationships
          relationships.push({
            fromTable: currentTable.name,
            fromField: name,
            toTable: refMatch[1],
            toField: refMatch[2],
            cardinality: '*:1', // Default for inline refs
          })
        }

        currentTable.fields.push({
          name,
          type,
          isPrimaryKey,
          isForeignKey,
          foreignKeyRef,
          isNullable,
          isUnique,
          hasDefault,
          defaultValue,
          note,
        })
      }
    }

    // Inside indexes section
    if (currentTable && inIndexes) {
      const indexMatch = line.match(/\((.*?)\)/)
      if (indexMatch) {
        const fields = indexMatch[1].split(',').map(f => f.trim())
        currentTable.indexes.push({
          fields,
          isUnique: false,
          isPrimaryKey: false,
        })
      }
    }

    // Inside enum
    if (currentEnum) {
      const enumValueMatch = line.match(/^(\w+)/)
      if (enumValueMatch) {
        currentEnum.values.push(enumValueMatch[1])
      }
    }
  }

  return { tables, enums, relationships }
}
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
pnpm test parse-dbml.test.ts
```

Expected: All tests PASS

- [ ] **Step 3: Verify TypeScript compiles with actual usage**

```bash
pnpm tsc --noEmit
```

Expected: No TypeScript errors (parser compiles successfully)

- [ ] **Step 4: Commit**

```bash
git add src/components/data-model/parse-dbml.ts
git commit -m "feat: implement DBML parser with full constraint support"
```

---

### Task 5: Create Database Schema Graph Builder

**Files:**
- Create: `src/components/data-model/database-schema-graph.ts`

- [ ] **Step 1: Create graph builder with types and constants**

```typescript
// src/components/data-model/database-schema-graph.ts

import dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@xyflow/react'
import type { DbmlSchema, DbmlTable, DbmlField } from './parse-dbml'

export const SCHEMA_TABLE_COLOR = '#14B8A6' // teal
export const SCHEMA_JUNCTION_COLOR = '#F59E0B' // amber
export const SCHEMA_EDGE_COLOR = '#14B8A6'

const TABLE_WIDTH = 380
const TABLE_HEADER = 40
const TABLE_ROW = 32
const TABLE_FOOTER = 32

export type DatabaseTableNodeData = {
  name: string
  fields: DbmlField[]
  indexes: string[]
  isJunction: boolean
}

export type DatabaseSchemaGraphData = {
  nodes: Node[]
  edges: Edge[]
  stats: {
    tableCount: number
    enumCount: number
  }
}

function isJunctionTable(table: DbmlTable): boolean {
  // Junction table heuristics:
  // 1. Name contains _link, _hbls, or similar patterns
  if (/_link|_hbls|_chain/.test(table.name)) return true

  // 2. Has exactly 2 foreign keys and few other fields
  const fkCount = table.fields.filter(f => f.isForeignKey).length
  const nonFkCount = table.fields.filter(f => !f.isForeignKey && !f.isPrimaryKey).length
  if (fkCount >= 2 && nonFkCount <= 1) return true

  return false
}

function computeTableHeight(table: DbmlTable): number {
  const fieldCount = table.fields.length
  const hasIndexes = table.indexes.length > 0
  return TABLE_HEADER + (fieldCount * TABLE_ROW) + (hasIndexes ? TABLE_FOOTER : 0)
}

function pickHandles(
  srcX: number, srcY: number,
  tgtX: number, tgtY: number,
): { sourceHandle: string; targetHandle: string } {
  const dx = tgtX - srcX
  const dy = tgtY - srcY

  // Prefer vertical routing for FK relationships (TB layout)
  if (Math.abs(dy) >= Math.abs(dx) && dy > 0) {
    return { sourceHandle: 'bottom', targetHandle: 'top' }
  }
  if (Math.abs(dy) >= Math.abs(dx) && dy < 0) {
    return { sourceHandle: 'top-src', targetHandle: 'bottom-tgt' }
  }
  if (dx > 0) {
    return { sourceHandle: 'right', targetHandle: 'left' }
  }
  return { sourceHandle: 'left-src', targetHandle: 'right-tgt' }
}

export function buildDatabaseSchemaGraph(schema: DbmlSchema): DatabaseSchemaGraphData {
  const { tables, relationships } = schema

  // Configure Dagre layout
  const g = new dagre.graphlib.Graph()
  g.setGraph({
    rankdir: 'TB',
    nodesep: 70,
    ranksep: 120,
    marginx: 60,
    marginy: 60,
  })
  g.setDefaultEdgeLabel(() => ({}))

  // Add nodes
  tables.forEach(table => {
    g.setNode(table.name, {
      width: TABLE_WIDTH,
      height: computeTableHeight(table),
    })
  })

  // Add edges
  const addedEdges = new Set<string>()
  relationships.forEach(rel => {
    const key = [rel.fromTable, rel.toTable].sort().join('--')
    if (!addedEdges.has(key)) {
      g.setEdge(rel.fromTable, rel.toTable)
      addedEdges.add(key)
    }
  })

  // Run layout
  dagre.layout(g)

  // Build ReactFlow nodes
  const nodes: Node[] = tables.map(table => {
    const dagreNode = g.node(table.name)
    const isJunction = isJunctionTable(table)
    const height = computeTableHeight(table)

    return {
      id: table.name,
      type: 'databaseTableNode',
      position: {
        x: (dagreNode?.x ?? 0) - TABLE_WIDTH / 2,
        y: (dagreNode?.y ?? 0) - height / 2,
      },
      data: {
        name: table.name,
        fields: table.fields,
        indexes: table.indexes.map(idx => idx.fields.join(', ')),
        isJunction,
      } satisfies DatabaseTableNodeData,
    }
  })

  // Build edges
  const seenEdgeKeys = new Set<string>()
  const edges: Edge[] = []

  relationships.forEach(rel => {
    const key = [rel.fromTable, rel.toTable].sort().join('--')
    if (seenEdgeKeys.has(key)) return
    seenEdgeKeys.add(key)

    const srcNode = g.node(rel.fromTable)
    const tgtNode = g.node(rel.toTable)
    const handles = pickHandles(
      srcNode?.x ?? 0, srcNode?.y ?? 0,
      tgtNode?.x ?? 0, tgtNode?.y ?? 0,
    )

    edges.push({
      id: `schema-edge-${key}`,
      source: rel.fromTable,
      target: rel.toTable,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
      style: {
        stroke: SCHEMA_EDGE_COLOR,
        strokeWidth: 2,
      },
      markerEnd: {
        type: 'arrowclosed',
        width: 12,
        height: 12,
        color: SCHEMA_EDGE_COLOR,
      },
      label: rel.cardinality,
      labelStyle: {
        fontSize: 10,
        fontWeight: 500,
        fill: '#9CA3AF',
        fontFamily: 'var(--font-sans)',
      },
      labelBgStyle: {
        fill: 'var(--bg-page)',
        fillOpacity: 0.9,
      },
      labelBgPadding: [4, 6] as [number, number],
      labelBgBorderRadius: 4,
    })
  })

  return {
    nodes,
    edges,
    stats: {
      tableCount: tables.length,
      enumCount: schema.enums.length,
    },
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm build
```

Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add src/components/data-model/database-schema-graph.ts
git commit -m "feat: add database schema graph builder with Dagre layout"
```

---

### Task 6: Create Database Table Node Component

**Files:**
- Create: `src/components/data-model/database-table-node.tsx`

- [ ] **Step 1: Create table node component with badges**

```typescript
// src/components/data-model/database-table-node.tsx

'use client'

import { memo, useState, useCallback, useRef } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { Key, ArrowRight, Database } from 'lucide-react'
import type { DatabaseTableNodeData } from './database-schema-graph'
import { SCHEMA_TABLE_COLOR, SCHEMA_JUNCTION_COLOR } from './database-schema-graph'

export const DatabaseTableNode = memo(function DatabaseTableNode({ data, selected }: NodeProps) {
  const d = data as unknown as DatabaseTableNodeData
  const [hoveredField, setHoveredField] = useState<number | null>(null)
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showFieldTooltip = useCallback((idx: number) => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current)
    setHoveredField(idx)
  }, [])

  const hideFieldTooltip = useCallback(() => {
    tooltipTimeout.current = setTimeout(() => setHoveredField(null), 200)
  }, [])

  const accentColor = d.isJunction ? SCHEMA_JUNCTION_COLOR : SCHEMA_TABLE_COLOR

  return (
    <div className="relative" style={{ width: 380 }}>
      {/* Handles - all 4 edges */}
      <Handle type="target" position={Position.Top} id="top" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Top} id="top-src" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Left} id="left-src" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="target" position={Position.Bottom} id="bottom-tgt" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="target" position={Position.Right} id="right-tgt" className="!bg-transparent !border-0 !w-0 !h-0" />

      <div
        className="rounded-xl overflow-hidden transition-shadow duration-200"
        style={{
          background: 'var(--bg-white)',
          border: `1.5px solid ${selected ? accentColor : 'var(--border-default)'}`,
          boxShadow: selected
            ? `0 0 0 3px ${accentColor}33, 0 4px 16px rgba(0,0,0,0.08)`
            : 'var(--shadow-subtle)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{
            borderBottom: '1px solid var(--border-default)',
            borderLeft: `4px solid ${accentColor}`,
          }}
        >
          <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            {d.name}
          </span>
          <span
            className="ml-2 shrink-0 text-[11px] font-medium"
            style={{ color: 'var(--text-muted)' }}
          >
            {d.fields.length}↓
          </span>
        </div>

        {/* Field rows */}
        <div>
          {d.fields.map((field, idx) => (
            <div
              key={field.name}
              className="relative flex items-center gap-2 px-3 py-1"
              style={{
                background: idx % 2 === 0 ? 'transparent' : 'var(--bg-page)',
                minHeight: 32,
              }}
              onMouseEnter={() => showFieldTooltip(idx)}
              onMouseLeave={hideFieldTooltip}
            >
              {/* Badges */}
              <div className="flex items-center gap-1 shrink-0">
                {field.isPrimaryKey && (
                  <Key size={12} style={{ color: '#EAB308' }} />
                )}
                {field.isForeignKey && (
                  <ArrowRight size={12} style={{ color: '#3B82F6' }} />
                )}
                {!field.isPrimaryKey && !field.isForeignKey && field.isUnique && (
                  <Database size={12} style={{ color: '#6B7280' }} />
                )}
              </div>

              {/* Field name */}
              <span className="flex-1 font-mono text-[12px]" style={{ color: 'var(--text-primary)' }}>
                {field.name}
              </span>

              {/* Type */}
              <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {field.type}
              </span>

              {/* Constraint dots */}
              <div className="flex items-center gap-0.5 shrink-0">
                {!field.isNullable && (
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: '#EF4444' }}
                    title="NOT NULL"
                  />
                )}
                {field.isUnique && (
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: '#8B5CF6' }}
                    title="UNIQUE"
                  />
                )}
                {field.hasDefault && (
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: '#10B981' }}
                    title="HAS DEFAULT"
                  />
                )}
              </div>

              {/* Tooltip */}
              {hoveredField === idx && (field.note || field.foreignKeyRef) && (
                <div
                  className="absolute left-full top-0 z-50 ml-2 pointer-events-none"
                  style={{ width: 220 }}
                >
                  <div
                    className="rounded-lg px-3 py-2 text-[11px] leading-relaxed"
                    style={{
                      background: 'var(--bg-white)',
                      border: '1px solid var(--border-default)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {field.note && <div>{field.note}</div>}
                    {field.foreignKeyRef && (
                      <div className="mt-1 text-[10px]" style={{ color: '#3B82F6' }}>
                        → {field.foreignKeyRef.table}.{field.foreignKeyRef.field}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Indexes footer */}
        {d.indexes.length > 0 && (
          <div
            className="px-3 py-1.5 text-[10px]"
            style={{
              borderTop: '1px solid var(--border-default)',
              color: 'var(--text-muted)',
            }}
          >
            Indexes: {d.indexes.join(', ')}
          </div>
        )}
      </div>
    </div>
  )
})
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm build
```

Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add src/components/data-model/database-table-node.tsx
git commit -m "feat: add database table node with PK/FK badges and constraint indicators"
```

---

### Task 7: Create Enum Panel Component

**Files:**
- Create: `src/components/data-model/database-enum-panel.tsx`

- [ ] **Step 1: Create collapsible enum panel**

```typescript
// src/components/data-model/database-enum-panel.tsx

'use client'

import { useState } from 'react'
import { List, X } from 'lucide-react'
import type { DbmlEnum } from './parse-dbml'

type DatabaseEnumPanelProps = {
  enums: DbmlEnum[]
}

export function DatabaseEnumPanel({ enums }: DatabaseEnumPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredEnums = enums.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!isOpen) {
    return (
      <div className="absolute right-4 top-4 z-20">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
          style={{
            background: 'var(--bg-white)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-subtle)',
            color: 'var(--text-primary)',
          }}
        >
          <List size={16} />
          <span>Enums ({enums.length})</span>
        </button>
      </div>
    )
  }

  return (
    <div
      className="absolute right-0 top-0 z-20 flex h-full flex-col overflow-hidden transition-all duration-200"
      style={{
        width: 280,
        background: 'var(--bg-white)',
        borderLeft: '3px solid #8B5CF6',
        boxShadow: '-4px 0 16px rgba(0,0,0,0.08)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid var(--border-default)' }}
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Enums ({enums.length})
        </span>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded-md p-1 transition-colors hover:bg-gray-100"
          style={{ color: 'var(--text-muted)' }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Search */}
      {enums.length > 5 && (
        <div className="px-3 py-2 shrink-0">
          <input
            type="text"
            placeholder="Search enums..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-md px-2 py-1 text-sm"
            style={{
              border: '1px solid var(--border-default)',
              background: 'var(--bg-page)',
            }}
          />
        </div>
      )}

      {/* Enum list */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="flex flex-col gap-3">
          {filteredEnums.map(enumDef => (
            <div
              key={enumDef.name}
              className="rounded-lg overflow-hidden"
              style={{
                background: 'var(--bg-page)',
                border: '1px solid var(--border-default)',
              }}
            >
              {/* Enum header */}
              <div
                className="flex items-center justify-between px-2 py-1.5"
                style={{
                  background: 'var(--bg-white)',
                  borderLeft: '3px solid #8B5CF6',
                }}
              >
                <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {enumDef.name}
                </span>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: 'var(--text-muted)' }}
                >
                  [{enumDef.values.length}]
                </span>
              </div>

              {/* Enum values */}
              <div className="px-2 py-1.5">
                {enumDef.values.map(value => (
                  <div
                    key={value}
                    className="text-[11px] py-0.5"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    • {value}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm build
```

Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add src/components/data-model/database-enum-panel.tsx
git commit -m "feat: add collapsible enum panel with search"
```

---

### Task 8: Create Database Schema Canvas

**Files:**
- Create: `src/components/data-model/database-schema-canvas.tsx`

- [ ] **Step 1: Create schema canvas component**

```typescript
// src/components/data-model/database-schema-canvas.tsx

'use client'

import { useCallback } from 'react'
import {
  ReactFlow,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Maximize2, Table, List } from 'lucide-react'
import { DatabaseTableNode } from './database-table-node'
import { DatabaseEnumPanel } from './database-enum-panel'
import { SCHEMA_TABLE_COLOR } from './database-schema-graph'
import type { DbmlEnum } from './parse-dbml'

const nodeTypes = {
  databaseTableNode: DatabaseTableNode,
}

type DatabaseSchemaCanvasProps = {
  initialNodes: Node[]
  initialEdges: Edge[]
  enums: DbmlEnum[]
  stats: { tableCount: number; enumCount: number }
}

function DatabaseSchemaCanvasInner({ initialNodes, initialEdges, enums, stats }: DatabaseSchemaCanvasProps) {
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)
  const { fitView } = useReactFlow()

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.08, maxZoom: 1, duration: 300 })
  }, [fitView])

  return (
    <div className="relative h-full w-full">
      {/* Toolbar */}
      <div
        className="absolute left-4 top-4 z-10 flex items-center gap-3 rounded-lg px-3 py-2"
        style={{
          background: 'var(--bg-white)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-subtle)',
        }}
      >
        <div className="flex items-center gap-1.5">
          <Table size={14} style={{ color: SCHEMA_TABLE_COLOR }} />
          <span className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>
            {stats.tableCount} tables
          </span>
        </div>
        <div
          className="h-3"
          style={{ width: 1, background: 'var(--border-default)' }}
        />
        <div className="flex items-center gap-1.5">
          <List size={14} style={{ color: '#8B5CF6' }} />
          <span className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>
            {stats.enumCount} enums
          </span>
        </div>
        <div
          className="h-3"
          style={{ width: 1, background: 'var(--border-default)' }}
        />
        <button
          onClick={handleFitView}
          className="flex items-center gap-1 text-[12px] font-medium transition-colors hover:opacity-70"
          style={{ color: SCHEMA_TABLE_COLOR, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <Maximize2 size={13} />
          Fit
        </button>
      </div>

      {/* Enum panel */}
      <DatabaseEnumPanel enums={enums} />

      {/* ReactFlow canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.08, maxZoom: 1 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
        edgesFocusable={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border-default)" />
        <MiniMap
          nodeColor={() => SCHEMA_TABLE_COLOR}
          maskColor="rgba(248, 248, 247, 0.7)"
          style={{ border: '1px solid var(--border-default)', borderRadius: 8 }}
        />
      </ReactFlow>
    </div>
  )
}

export function DatabaseSchemaCanvas(props: DatabaseSchemaCanvasProps) {
  return (
    <ReactFlowProvider>
      <DatabaseSchemaCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm build
```

Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add src/components/data-model/database-schema-canvas.tsx
git commit -m "feat: add database schema canvas with ReactFlow and enum panel"
```

---

### Task 9: Add Tabs to Data Model Page

**Files:**
- Modify: `src/app/review/data-model/page.tsx`
- Create: `src/app/review/data-model/page-client.tsx`

- [ ] **Step 1: Update page to load both graphs and add tabs**

```typescript
// src/app/review/data-model/page.tsx

import { readFile } from 'fs/promises'
import { join } from 'path'
import { getCurrentModel } from '@/lib/model-store'
import { DataModelCanvas } from '@/components/data-model/data-model-canvas'
import { buildDataModelGraph } from '@/components/data-model/data-model-graph'
import { DatabaseSchemaCanvas } from '@/components/data-model/database-schema-canvas'
import { buildDatabaseSchemaGraph } from '@/components/data-model/database-schema-graph'
import { parseDbml } from '@/components/data-model/parse-dbml'
import { DataModelPageClient } from './page-client'

export default async function DataModelPage() {
  // Load intent model
  const intentModel = await getCurrentModel()
  const intentGraph = buildDataModelGraph(intentModel)

  // Load database schema
  const dbmlPath = join(process.cwd(), 'src/data/acfs-datamodel-corrected.dbml')
  const dbmlContent = await readFile(dbmlPath, 'utf-8')
  const dbmlSchema = parseDbml(dbmlContent)
  const schemaGraph = buildDatabaseSchemaGraph(dbmlSchema)

  return (
    <DataModelPageClient
      intentGraph={intentGraph}
      schemaGraph={schemaGraph}
      enums={dbmlSchema.enums}
    />
  )
}
```

- [ ] **Step 2: Create client component with tabs**

```typescript
// src/app/review/data-model/page-client.tsx

'use client'

import { useState } from 'react'
import { Database, Table } from 'lucide-react'
import { DataModelCanvas } from '@/components/data-model/data-model-canvas'
import { DatabaseSchemaCanvas } from '@/components/data-model/database-schema-canvas'
import type { DataModelGraphData } from '@/components/data-model/data-model-graph'
import type { DatabaseSchemaGraphData } from '@/components/data-model/database-schema-graph'
import type { DbmlEnum } from '@/components/data-model/parse-dbml'

type ViewType = 'intent' | 'schema'

type DataModelPageClientProps = {
  intentGraph: DataModelGraphData
  schemaGraph: DatabaseSchemaGraphData
  enums: DbmlEnum[]
}

export function DataModelPageClient({ intentGraph, schemaGraph, enums }: DataModelPageClientProps) {
  const [activeView, setActiveView] = useState<ViewType>('intent')

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div
        className="flex items-center gap-1 px-3 shrink-0"
        style={{
          height: 44,
          borderBottom: '1px solid var(--border-default)',
          background: 'var(--bg-page)',
        }}
      >
        {/* Intent Model tab */}
        <button
          type="button"
          onClick={() => setActiveView('intent')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200"
          style={{
            color: activeView === 'intent' ? '#0081F2' : 'var(--text-muted)',
            background: activeView === 'intent' ? 'rgba(0, 129, 242, 0.08)' : 'transparent',
          }}
        >
          <Database size={14} />
          Intent Model
          <span className="text-[11px] ml-1" style={{ opacity: 0.7 }}>
            ({intentGraph.stats.domainCount} entities)
          </span>
        </button>

        {/* Database Schema tab */}
        <button
          type="button"
          onClick={() => setActiveView('schema')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200"
          style={{
            color: activeView === 'schema' ? '#14B8A6' : 'var(--text-muted)',
            background: activeView === 'schema' ? 'rgba(20, 184, 166, 0.08)' : 'transparent',
          }}
        >
          <Table size={14} />
          Database Schema
          <span className="text-[11px] ml-1" style={{ opacity: 0.7 }}>
            ({schemaGraph.stats.tableCount} tables)
          </span>
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'intent' && (
          <DataModelCanvas
            initialNodes={intentGraph.nodes}
            initialEdges={intentGraph.edges}
            stats={intentGraph.stats}
          />
        )}
        {activeView === 'schema' && (
          <DatabaseSchemaCanvas
            initialNodes={schemaGraph.nodes}
            initialEdges={schemaGraph.edges}
            enums={enums}
            stats={schemaGraph.stats}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm build
```

Expected: No TypeScript errors

- [ ] **Step 4: Test in browser**

```bash
pnpm dev
```

Navigate to http://localhost:4444/review/data-model

Expected:
- Two tabs visible: "Intent Model" and "Database Schema"
- Clicking tabs switches views
- Intent tab shows blue accent, Schema tab shows teal accent
- Both views render without errors

- [ ] **Step 5: Commit**

```bash
git add src/app/review/data-model/page.tsx src/app/review/data-model/page-client.tsx
git commit -m "feat: add tabs to data model page with intent/schema switcher"
```

---

### Task 10: Manual Testing & Verification

**Files:**
- Test all components visually

- [ ] **Step 1: Test DBML parser with actual file**

Open browser console and verify:
- No parsing errors logged
- Reasonable table/enum/relationship counts
- Check a few table structures look correct

- [ ] **Step 2: Test database schema view**

Verify:
- All tables render with teal accent
- Primary key badges (gold key icons) appear
- Foreign key badges (blue arrows) appear
- Constraint dots render (red/purple/green)
- Hover tooltips show field notes
- Junction tables have amber accent
- Relationships connect correctly with cardinality labels

- [ ] **Step 3: Test enum panel**

Verify:
- Panel starts collapsed (button only)
- Click opens panel (280px wide)
- All enums listed with purple accent
- Search box filters enums (if > 5 enums)
- Click X closes panel

- [ ] **Step 4: Test tab switching**

Verify:
- Intent tab shows blue accent when active
- Schema tab shows teal accent when active
- Switching tabs updates view instantly
- No memory leaks (check browser dev tools)
- Fit view button works in both views

- [ ] **Step 5: Test layout and positioning**

Verify:
- No overlapping tables
- Relationships flow cleanly
- Minimap shows all nodes
- Zoom/pan works smoothly
- Enum panel doesn't overlap canvas controls

- [ ] **Step 6: Document any issues found**

If issues found, create follow-up tasks in this plan to fix them.

---

## Success Criteria

✅ DBML parser extracts all tables, enums, and relationships correctly
✅ Database schema view renders with teal accent (distinct from blue intent model)
✅ Table nodes show PK/FK badges and constraint indicators
✅ Enum panel opens/closes smoothly with search functionality
✅ Tabs switch between Intent Model and Database Schema views
✅ No TypeScript errors or console warnings
✅ All relationships render with correct cardinality labels
✅ Junction tables display with amber accent
✅ Page loads in < 2 seconds

---

## Notes

**Testing approach:** Manual testing in browser since this is primarily UI work. Parser has unit tests for validation.

**Performance:** Both graphs preloaded at server render time. Tab switching is instant (unmount/mount pattern).

**Future enhancements (not in scope):**
- Export schema as PNG/SVG
- Show SQL DDL for tables
- Click table to show related tables
- Diff view between intent model and schema
