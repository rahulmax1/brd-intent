# Database Schema View Design

**Date:** 2026-03-26
**Status:** Approved
**Context:** Add database schema visualization to Data Model page with distinct visual treatment from the intent model

## Problem

The current Data Model page shows the conceptual intent model (business requirements). We need to also show the corrected database schema (DBML) that addresses critical implementation gaps identified in the original schema. Users need both views: the conceptual model for requirements and the database schema for implementation.

## Solution

Add tabs to the Data Model page: "Intent Model" (existing) and "Database Schema" (new). Parse and visualize the DBML schema with distinct visual treatment using teal accent color, enhanced table nodes with PK/FK/index badges, and a collapsible enum panel.

## Design

### File Structure

```
src/
├── components/
│   └── data-model/
│       ├── data-model-canvas.tsx          (existing - intent model)
│       ├── data-model-graph.ts            (existing - intent model)
│       ├── table-node.tsx                 (existing - intent model)
│       ├── integration-node.tsx           (existing - intent model)
│       │
│       ├── database-schema-canvas.tsx     (NEW - schema view)
│       ├── database-schema-graph.ts       (NEW - schema layout builder)
│       ├── database-table-node.tsx        (NEW - enhanced table with badges)
│       ├── database-enum-panel.tsx        (NEW - collapsible enum sidebar)
│       └── parse-dbml.ts                  (NEW - DBML parser utility)
│
├── app/
│   └── review/
│       └── data-model/
│           └── page.tsx                   (MODIFY - add tabs)
│
└── data/
    └── acfs-datamodel-corrected.dbml      (MOVE - from project root)
```

### Type Definitions

```typescript
// parse-dbml.ts exports

type DbmlSchema = {
  tables: DbmlTable[]
  enums: DbmlEnum[]
  relationships: DbmlRelationship[]
}

type DbmlTable = {
  name: string
  fields: DbmlField[]
  indexes: DbmlIndex[]
  note?: string
}

type DbmlField = {
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

type DbmlIndex = {
  fields: string[]
  isUnique: boolean
  isPrimaryKey: boolean
}

type DbmlEnum = {
  name: string
  values: string[]
}

type DbmlRelationship = {
  fromTable: string
  fromField: string
  toTable: string
  toField: string
  cardinality: '1:1' | '1:*' | '*:1' | '*:*'
}
```

### Tab Implementation

**Page Server Component** (`app/review/data-model/page.tsx`):
- Load both graphs at server render time
- Pass to client component for tab switching
- No re-parsing on tab change (preloaded)

```typescript
// Parallel data loading
const intentModel = await getCurrentModel()
const intentGraph = buildDataModelGraph(intentModel)

const dbmlContent = await readFile('data/acfs-datamodel-corrected.dbml', 'utf-8')
const dbmlSchema = parseDbml(dbmlContent)
const schemaGraph = buildDatabaseSchemaGraph(dbmlSchema)

return <DataModelPageClient intentGraph={intentGraph} schemaGraph={schemaGraph} />
```

**Tab Bar Design** (Explorer pattern):
- Two tabs: "Intent Model" | "Database Schema"
- Height: 44px
- Active state: Blue accent for Intent, Teal accent for Schema
- Stats: Entity/table counts displayed next to tab labels
- Instant switching (unmount inactive view)

**Visual Indicators:**
- Intent tab: Database icon + "14 entities, 5 integrations"
- Schema tab: Table icon + "12 tables, 9 enums"
- Active dot color matches tab accent

### DBML Parser

**Strategy:** Custom line-by-line parser (no dependencies)

**Parsing phases:**
1. Split content into sections (Tables, Enums, Refs)
2. Parse each section with regex patterns
3. Build typed data structure
4. Infer relationships from Ref declarations

**Key patterns:**
```typescript
// Tables
const TABLE_START = /^Table\s+(\w+)\s*{/
const FIELD = /^\s*(\w+)\s+([\w()]+)(?:\s+\[(.*?)\])?/
const TABLE_END = /^}/

// Enums
const ENUM_START = /^Enum\s+(\w+)\s*{/
const ENUM_VALUE = /^\s*(\w+)/

// Relationships (inline refs)
const INLINE_REF = /\[ref:\s*([<>])\s*(\w+)\.(\w+)\]/

// Constraints in field brackets
const CONSTRAINT_PK = /\bpk\b/
const CONSTRAINT_NOT_NULL = /\bnot null\b/
const CONSTRAINT_UNIQUE = /\bunique\b/
const CONSTRAINT_DEFAULT = /default:\s*([^,\]]+)/

// Notes
const NOTE = /\[note:\s*'(.*?)'\]/
```

**Field constraint parsing:**
- Extract from `[pk, not null, default: true]` format
- Mark isPrimaryKey, isNullable, hasDefault, etc.
- Parse `ref: > table.field` to mark foreign keys

**Relationship inference:**
- Parse `Ref:` in field definitions
- Parse standalone `Ref:` blocks
- Determine cardinality from `*`, `1`, `0..1` symbols
- Default to `*:1` if not specified

**Error handling:**
- Skip unparseable lines with warning
- Graceful degradation if DBML has syntax errors
- Log parsing warnings to console

### Color System

**Intent Model** (existing):
- Primary: `#0081F2` (blue)
- Integration: `#6B7280` (gray)

**Database Schema** (new):
- Primary table: `#14B8A6` (teal)
- Enum accent: `#8B5CF6` (purple)
- Junction table: `#F59E0B` (amber highlight)
- Relationship edges: `#14B8A6` (teal, 2px)

**Badge colors:**
- Primary key: `#EAB308` (gold)
- Foreign key: `#3B82F6` (blue)
- Index: `#6B7280` (gray)
- Not null: `#EF4444` (red dot)
- Unique: `#8B5CF6` (purple dot)
- Has default: `#10B981` (green dot)

### Database Table Node

**Enhanced styling** (`DatabaseTableNode.tsx`):

```
┌────────────────────────────────────┐
│ 🗂️ users                      12↓  │ ← teal border, field count
├────────────────────────────────────┤
│ 🔑 id                int           │ ← PK badge (gold key)
│ 🔗 company_id        int           │ ← FK badge (blue arrow)
│ 📊 • email           varchar(255)  │ ← indexed (gray DB icon) + unique (purple dot)
│    first_name        varchar(100)  │
│    last_name         varchar(100)  │
│    role              user_role     │ ← enum type (click to open panel)
│    ...                              │
├────────────────────────────────────┤
│ Indexes: (id), (company_id), ...  │ ← footer if indexes present
└────────────────────────────────────┘
```

**Visual indicators:**
- **Primary key**: Gold key icon (🔑) before field name
- **Foreign key**: Blue arrow icon (🔗) before field name, hover shows target table
- **Index**: Gray database icon (📊) before field name
- **Not null**: Small red dot after type
- **Unique**: Small purple dot after type
- **Has default**: Small green dot after type

**Dimensions:**
- Width: 380px (20px wider than intent model for badge space)
- Header: 40px
- Field row: 32px (4px taller for badge breathing room)
- Footer (indexes): 32px if present

**Hover behavior:**
- Field hover: Show full note/constraint details in tooltip
- FK hover: Highlight connection to target table
- Enum type hover: Show enum values in tooltip

**Click behavior:**
- Click enum type field → auto-open enum panel and scroll to that enum
- Click FK field → center view on target table

### Enum Panel

**Collapsible right panel** (`DatabaseEnumPanel.tsx`):

**Default state:** Collapsed (toggle button only)
- Button: 40px × 44px, fixed to right edge
- Icon: List (lucide-react)
- Label: "Enums (9)" in small text
- Background: white with teal accent

**Expanded state:** 280px wide overlay
- Z-index: 20 (above canvas, below controls)
- Background: white, teal left border (3px)
- Header: "Enums (9)" + close button
- Body: Scrollable list of enum cards

**Enum card layout:**
```
┌─────────────────────────────┐
│ user_role              [3]  │ ← purple accent, value count
├─────────────────────────────┤
│ • acfs_admin               │ ← 11px text
│ • acfs_user                │
│ • lsp                      │
└─────────────────────────────┘
```

**Card styling:**
- Header: Purple left border (3px), bold 12px text
- Values: Bulleted list, 11px text, gray color
- Spacing: 12px between cards
- Max height per card: 200px (scroll if more values)

**Search/filter:**
- Sticky search box at top when > 5 enums
- Filter by enum name (live search)
- Clear button

**Interactions:**
- Click enum name → highlight all fields using that type in canvas
- Click from table node enum field → panel opens and scrolls to that enum
- Slide transition: 200ms ease-in-out

**Mobile/responsive:**
- Not required (desktop-only per C-007)

### Layout & Graph Building

**Algorithm** (`buildDatabaseSchemaGraph`):

```typescript
export function buildDatabaseSchemaGraph(schema: DbmlSchema): SchemaGraphData {
  // 1. Filter out enums (handled separately in panel)
  const tables = schema.tables

  // 2. Classify tables for smart layout
  const junctionTables = tables.filter(t =>
    t.name.includes('_hbl') || t.name.endsWith('_link') || isJunction(t)
  )
  const coreTables = tables.filter(t => !junctionTables.includes(t))

  // 3. Configure Dagre
  const g = new dagre.graphlib.Graph()
  g.setGraph({
    rankdir: 'TB',
    nodesep: 70,
    ranksep: 120,
    marginx: 60,
    marginy: 60,
  })

  // 4. Add nodes with computed dimensions
  tables.forEach(table => {
    g.setNode(table.name, {
      width: 380,
      height: computeTableHeight(table),
    })
  })

  // 5. Add edges from relationships
  schema.relationships.forEach(rel => {
    g.setEdge(rel.fromTable, rel.toTable, {
      label: rel.cardinality,
    })
  })

  // 6. Run layout
  dagre.layout(g)

  // 7. Build ReactFlow nodes and edges
  return { nodes, edges, stats: { tableCount, enumCount } }
}
```

**Table classification:**
- Junction table: name contains `_link`, `_hbl`, or has exactly 2 FKs + no other fields
- Core table: everything else
- Used for amber highlight (junction tables)

**Edge styling:**
- Stroke: Teal `#14B8A6`, 2px width
- Arrow: Closed, 12px × 12px, teal fill
- Label: Cardinality (1:1, 1:*, *:*) in 10px gray text
- Dashed: If relationship is optional (0..1)
- Bidirectional: Double arrowhead for many-to-many

**Handle selection:**
- Prefer vertical routing for parent-child FK relationships
- Use existing `pickHandles` logic from intent model
- Handles at all 4 edges (top, right, bottom, left)

### Component Structure

**DatabaseSchemaCanvas** (new):
- Wraps ReactFlow with custom node types
- Controls: Fit view, zoom controls (same as intent model)
- Toolbar: Table count, enum count, fit button
- Enum panel toggle button (fixed right edge)
- Pass enum data to panel component

**DatabaseTableNode** (new):
- Custom ReactFlow node type
- Renders table header, fields, indexes
- Badge rendering for PK/FK/indexes
- Constraint dots rendering
- Hover tooltips for field details
- Click handlers for enum type fields

**DatabaseEnumPanel** (new):
- Controlled by parent canvas (collapsed state)
- Renders enum cards
- Search/filter functionality
- Scroll management when opened from table click

**Reusable utilities:**
- `computeTableHeight(table)` - calculate node height from field count
- `isJunctionTable(table)` - classify tables
- `formatFieldType(type)` - clean up type display (e.g., varchar(255) → varchar)
- `inferCardinality(rel)` - determine 1:1 vs 1:* vs *:* from DBML

### Testing Strategy

**Parser tests:**
- Unit test `parseDbml` with sample DBML snippets
- Verify table parsing (name, fields, constraints)
- Verify enum parsing
- Verify relationship extraction
- Test malformed DBML (graceful degradation)

**Visual tests:**
- Manual testing: compare rendered schema to dbdiagram.io
- Verify all tables are present
- Verify relationships connect correctly
- Check badge rendering (PK, FK, indexes)
- Test enum panel open/close/search
- Test tab switching performance

**Integration tests:**
- Load full DBML file
- Verify no parsing errors
- Check graph layout (no overlaps)
- Test enum panel interactions
- Verify FK click highlighting

### Error Handling

**Parser errors:**
- Log warnings for unparseable lines
- Continue parsing remaining content
- Return partial schema (better than nothing)

**Missing DBML file:**
- Show error message in Schema tab
- Keep Intent Model tab working
- Suggest running generation script

**Layout issues:**
- If Dagre fails: fall back to grid layout
- If too many tables (>50): show warning, disable auto-fit
- If canvas is empty: show "No tables found" message

### Performance Considerations

**Parsing:**
- Run at build time (server component)
- Cache parsed result (no re-parse on tab switch)
- Parsing is fast (<10ms for 30 tables)

**Rendering:**
- Only render active tab (unmount inactive)
- ReactFlow handles node virtualization
- Enum panel: virtualize list if >50 enums (unlikely)

**Memory:**
- Schema graph preloaded but not rendered until tab active
- Enum panel data loaded but panel initially collapsed

### Success Criteria

1. Both tabs work (Intent Model and Database Schema)
2. DBML parses correctly (all tables, enums, relationships)
3. Schema view uses teal accent (visually distinct)
4. Table nodes show PK/FK/index badges correctly
5. Enum panel opens/closes smoothly
6. Clicking enum type field opens panel to that enum
7. Relationships render correctly with cardinality labels
8. Tab switching is instant (<100ms)
9. No console errors or warnings

## Implementation Notes

**Phasing:**
- Phase 1: Parser + basic schema view (no badges)
- Phase 2: Badge rendering + enhanced styling
- Phase 3: Enum panel + interactions

**Dependencies:**
- No new npm packages required
- Uses existing ReactFlow, Dagre, Lucide icons

**Migration:**
- Move DBML file to `data/` directory
- Update any references in docs
- Keep original in git history

**Future enhancements (not in scope):**
- Export schema as PNG/SVG
- Show SQL DDL for selected table
- Diff view: intent model vs schema
- Show which tables map to which entities
