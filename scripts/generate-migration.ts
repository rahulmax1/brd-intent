#!/usr/bin/env tsx

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { intentModel } from '../src/domain/intent-model/model'
import type { Entity, Field } from '../src/domain/intent-model/types'

// =============================================================================
// Type Definitions
// =============================================================================

type TableSchema = {
  name: string
  columns: ColumnSchema[]
}

type ColumnSchema = {
  name: string
  type: string
  nullable: boolean
  defaultValue?: string
}

type MigrationChange = {
  type: 'CREATE_TABLE' | 'ALTER_TABLE' | 'DROP_TABLE' | 'ADD_COLUMN' | 'MODIFY_COLUMN' | 'DROP_COLUMN'
  tableName: string
  details: string
  upSQL: string
  downSQL: string
}

// =============================================================================
// Type Mapping: Intent Model -> PostgreSQL
// =============================================================================

function mapFieldTypeToPostgres(fieldType: string): string {
  // Handle enum types
  if (fieldType.includes('|')) {
    return 'VARCHAR(100)' // Will create enum separately if needed
  }

  // Handle array types
  if (fieldType.endsWith('[]')) {
    const baseType = fieldType.slice(0, -2)
    if (baseType === 'string') return 'TEXT[]'
    if (baseType === 'number') return 'INTEGER[]'
    return 'JSONB' // Fallback for complex arrays
  }

  // Basic type mapping
  const typeMap: Record<string, string> = {
    string: 'TEXT',
    number: 'DECIMAL(10,2)',
    boolean: 'BOOLEAN',
    date: 'DATE',
    time: 'TIME',
    timestamp: 'TIMESTAMP',
    'Booking[]': 'JSONB', // Related entities as JSON for now
    PickupWindow: 'JSONB',
  }

  return typeMap[fieldType] || 'TEXT'
}

function extractEnumType(fieldType: string): string[] | null {
  if (!fieldType.includes('|')) return null

  // Extract enum values from union type like "'on_vessel' | 'at_wharf' | 'in_yard'"
  const matches = fieldType.matchAll(/'([^']+)'/g)
  const values = Array.from(matches).map(m => m[1])
  return values.length > 0 ? values : null
}

// =============================================================================
// Parse Existing Schema
// =============================================================================

function parseExistingSchema(schemaPath: string): Map<string, TableSchema> {
  const tables = new Map<string, TableSchema>()

  if (!existsSync(schemaPath)) {
    console.warn(`⚠️  Schema file not found: ${schemaPath}`)
    return tables
  }

  const schemaSQL = readFileSync(schemaPath, 'utf-8')

  // Parse CREATE TABLE statements
  const tableRegex = /CREATE TABLE (\w+)\s*\(([\s\S]*?)\);/g
  let match

  while ((match = tableRegex.exec(schemaSQL)) !== null) {
    const tableName = match[1]
    const columnsBlock = match[2]

    const columns: ColumnSchema[] = []
    const columnLines = columnsBlock.split('\n')

    for (const line of columnLines) {
      const trimmed = line.trim()

      // Skip empty lines, comments, and constraints
      if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('CONSTRAINT') ||
          trimmed.startsWith('PRIMARY KEY') || trimmed.startsWith('UNIQUE') ||
          trimmed.startsWith('FOREIGN KEY') || trimmed.startsWith('CHECK')) {
        continue
      }

      // Parse column definition: column_name TYPE [NOT NULL] [DEFAULT value]
      const columnMatch = trimmed.match(/^(\w+)\s+([\w()]+(?:\s+GENERATED[^,]+)?)/i)
      if (columnMatch) {
        const name = columnMatch[1]
        const rest = columnMatch[2]

        const nullable = !rest.includes('NOT NULL')
        const defaultMatch = rest.match(/DEFAULT\s+([^,\s]+)/)
        const defaultValue = defaultMatch ? defaultMatch[1] : undefined

        // Extract base type
        const typeMatch = rest.match(/^([\w()]+)/)
        const type = typeMatch ? typeMatch[1] : 'TEXT'

        columns.push({ name, type, nullable, defaultValue })
      }
    }

    tables.set(tableName, { name: tableName, columns })
  }

  return tables
}

// =============================================================================
// Convert Entity to Table Name
// =============================================================================

function entityIdToTableName(entityId: string): string {
  // Convert entity ID to snake_case table name
  // e.g., 'hbl' -> 'hbls', 'booking' -> 'bookings', 'delivery_order' -> 'delivery_orders'

  const tableNameMap: Record<string, string> = {
    hbl: 'hbls',
    booking: 'bookings',
    slot: 'slots',
    site: 'sites',
    driver_record: 'driver_records',
    delivery_order: 'delivery_orders',
    delegation: 'delegations',
    payment: 'payments',
    user: 'users',
    booking_hbl_link: 'booking_hbls',
  }

  return tableNameMap[entityId] || `${entityId}s`
}

function fieldNameToColumnName(fieldName: string): string {
  // Convert camelCase/PascalCase to snake_case
  return fieldName.replace(/([A-Z])/g, '_$1').toLowerCase()
}

// =============================================================================
// Detect Changes
// =============================================================================

function detectChanges(
  entities: Entity[],
  existingSchema: Map<string, TableSchema>
): MigrationChange[] {
  const changes: MigrationChange[] = []

  // Filter out integration entities and deferred entities
  const relevantEntities = entities.filter(
    e => !e.is_integration && !e.deferred
  )

  for (const entity of relevantEntities) {
    const tableName = entityIdToTableName(entity.id)
    const existingTable = existingSchema.get(tableName)

    if (!existingTable) {
      // NEW TABLE
      changes.push(createTableChange(entity, tableName))
    } else {
      // CHECK FOR COLUMN CHANGES
      const columnChanges = detectColumnChanges(entity, existingTable, tableName)
      changes.push(...columnChanges)
    }
  }

  // CHECK FOR REMOVED TABLES
  for (const [tableName, _] of existingSchema) {
    const entityExists = relevantEntities.some(
      e => entityIdToTableName(e.id) === tableName
    )

    if (!entityExists) {
      // Warn about removed table - don't auto-drop
      console.warn(`⚠️  Table "${tableName}" exists in database but not in intent model`)
      console.warn(`   → Manual review required - not generating DROP TABLE statement`)
    }
  }

  return changes
}

// =============================================================================
// Create Table Change
// =============================================================================

function createTableChange(entity: Entity, tableName: string): MigrationChange {
  const columns: string[] = []
  const enumTypes: Set<string> = new Set()

  // Add id column
  columns.push('  id SERIAL PRIMARY KEY')

  // Add entity fields
  for (const field of entity.key_fields) {
    const columnName = fieldNameToColumnName(field.name)
    const pgType = mapFieldTypeToPostgres(field.type)

    // Check for enum
    const enumValues = extractEnumType(field.type)
    if (enumValues) {
      const enumTypeName = `${tableName}_${columnName}_enum`
      enumTypes.add(`CREATE TYPE ${enumTypeName} AS ENUM (${enumValues.map(v => `'${v}'`).join(', ')});`)
      columns.push(`  ${columnName} ${enumTypeName} NOT NULL`)
    } else {
      columns.push(`  ${columnName} ${pgType}`)
    }
  }

  // Add timestamps
  columns.push('  created_at TIMESTAMP NOT NULL DEFAULT NOW()')
  columns.push('  updated_at TIMESTAMP NOT NULL DEFAULT NOW()')

  const enumSQL = Array.from(enumTypes).join('\n')
  const createSQL = `${enumSQL ? enumSQL + '\n\n' : ''}CREATE TABLE IF NOT EXISTS ${tableName} (\n${columns.join(',\n')}\n);`

  const upSQL = `-- Create table: ${tableName}\n${createSQL}`
  const downSQL = `-- Drop table: ${tableName}\nDROP TABLE IF EXISTS ${tableName};${enumSQL ? '\n' + Array.from(enumTypes).map(e => {
    const typeName = e.match(/CREATE TYPE (\w+)/)?.[1]
    return `DROP TYPE IF EXISTS ${typeName};`
  }).join('\n') : ''}`

  return {
    type: 'CREATE_TABLE',
    tableName,
    details: `Create new table "${tableName}" with ${entity.key_fields.length} fields`,
    upSQL,
    downSQL,
  }
}

// =============================================================================
// Detect Column Changes
// =============================================================================

function detectColumnChanges(
  entity: Entity,
  existingTable: TableSchema,
  tableName: string
): MigrationChange[] {
  const changes: MigrationChange[] = []
  const existingColumns = new Map(existingTable.columns.map(c => [c.name, c]))

  for (const field of entity.key_fields) {
    const columnName = fieldNameToColumnName(field.name)
    const existingColumn = existingColumns.get(columnName)

    if (!existingColumn) {
      // NEW COLUMN
      const pgType = mapFieldTypeToPostgres(field.type)
      const enumValues = extractEnumType(field.type)

      let upSQL: string
      let downSQL: string

      if (enumValues) {
        const enumTypeName = `${tableName}_${columnName}_enum`
        upSQL = `-- Add column: ${tableName}.${columnName}\n` +
                `CREATE TYPE ${enumTypeName} AS ENUM (${enumValues.map(v => `'${v}'`).join(', ')});\n` +
                `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${enumTypeName};`
        downSQL = `-- Drop column: ${tableName}.${columnName}\n` +
                  `ALTER TABLE ${tableName} DROP COLUMN ${columnName};\n` +
                  `DROP TYPE IF EXISTS ${enumTypeName};`
      } else {
        upSQL = `-- Add column: ${tableName}.${columnName}\n` +
                `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${pgType};`
        downSQL = `-- Drop column: ${tableName}.${columnName}\n` +
                  `ALTER TABLE ${tableName} DROP COLUMN ${columnName};`
      }

      changes.push({
        type: 'ADD_COLUMN',
        tableName,
        details: `Add column "${columnName}" (${field.type}) to "${tableName}"`,
        upSQL,
        downSQL,
      })
    } else {
      // CHECK FOR TYPE CHANGES
      const expectedType = mapFieldTypeToPostgres(field.type)
      const actualType = existingColumn.type.toUpperCase()
      const expectedTypeNormalized = expectedType.toUpperCase()

      // Simple type comparison - can be enhanced for more precise matching
      if (!actualType.startsWith(expectedTypeNormalized.split('(')[0])) {
        changes.push({
          type: 'MODIFY_COLUMN',
          tableName,
          details: `Change column "${columnName}" type from ${actualType} to ${expectedType}`,
          upSQL: `-- Modify column: ${tableName}.${columnName}\n` +
                 `ALTER TABLE ${tableName} ALTER COLUMN ${columnName} TYPE ${expectedType};`,
          downSQL: `-- Revert column: ${tableName}.${columnName}\n` +
                   `ALTER TABLE ${tableName} ALTER COLUMN ${columnName} TYPE ${actualType};`,
        })
      }
    }
  }

  return changes
}

// =============================================================================
// Generate Migration File
// =============================================================================

function generateMigrationFile(changes: MigrationChange[]): string {
  const today = new Date().toISOString().split('T')[0]
  const version = intentModel.meta.version

  const upStatements = changes.map(c => c.upSQL).join('\n\n')
  const downStatements = changes.reverse().map(c => c.downSQL).join('\n\n')

  return `-- =============================================================================
-- Migration: Sync with intent model v${version}
-- Generated: ${today}
-- =============================================================================

-- UP Migration
-- Apply changes to bring database in sync with intent model

${upStatements}

-- =============================================================================

-- DOWN Migration
-- Rollback changes

${downStatements}

-- =============================================================================
-- END
-- =============================================================================
`
}

// =============================================================================
// Main
// =============================================================================

function main() {
  console.log('🔍 Analyzing intent model and database schema...\n')

  const projectRoot = join(__dirname, '..')
  const schemaPath = join(projectRoot, 'migrations', '001-production-schema-v1.1-FIXED.sql')
  const migrationsDir = join(projectRoot, 'migrations')

  // Parse existing schema
  const existingSchema = parseExistingSchema(schemaPath)
  console.log(`✓ Parsed existing schema: ${existingSchema.size} tables found\n`)

  // Detect changes
  const changes = detectChanges(intentModel.entities, existingSchema)

  if (changes.length === 0) {
    console.log('✅ No changes detected - database schema is in sync with intent model\n')
    process.exit(0)
  }

  console.log(`📋 Detected ${changes.length} change(s):\n`)
  for (const change of changes) {
    console.log(`   ${change.type}: ${change.details}`)
  }
  console.log('')

  // Generate migration file
  const migrationSQL = generateMigrationFile(changes)

  // Find next migration number
  const today = new Date().toISOString().split('T')[0]
  const migrationFileName = `002-model-sync-${today}.sql`
  const migrationPath = join(migrationsDir, migrationFileName)

  // Write migration file
  writeFileSync(migrationPath, migrationSQL)
  console.log(`✅ Migration file generated: ${migrationFileName}\n`)

  console.log('⚠️  IMPORTANT: Review the migration file before applying!\n')
  console.log('   To apply migration:')
  console.log(`   psql -U your_user -d your_database -f ${migrationPath}\n`)
}

// Run
main()
