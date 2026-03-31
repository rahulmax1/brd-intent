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

    // Standalone relationship
    const standaloneRefMatch = line.match(/^Ref:\s*(\w+)\.(\w+)\s*>\s*(\w+)\.(\w+)/)
    if (standaloneRefMatch) {
      relationships.push({
        fromTable: standaloneRefMatch[1],
        fromField: standaloneRefMatch[2],
        toTable: standaloneRefMatch[3],
        toField: standaloneRefMatch[4],
        cardinality: '*:1',
      })
      continue
    }

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
      const fieldMatch = line.match(/^(\w+)\s+([\w(),]+)(?:\s+\[(.*?)\])?/)
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
      const indexMatch = line.match(/\((.*?)\)(?:\s+\[(.*?)\])?/)
      if (indexMatch) {
        const fields = indexMatch[1].split(',').map(f => f.trim())
        const attrs = indexMatch[2] || ''
        currentTable.indexes.push({
          fields,
          isUnique: /\bunique\b/.test(attrs),
          isPrimaryKey: /\bpk\b/.test(attrs),
        })
      } else {
        // Single field index
        const singleMatch = line.match(/^(\w+)(?:\s+\[(.*?)\])?/)
        if (singleMatch) {
          const [, field, attrs = ''] = singleMatch
          currentTable.indexes.push({
            fields: [field],
            isUnique: /\bunique\b/.test(attrs),
            isPrimaryKey: /\bpk\b/.test(attrs),
          })
        }
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
