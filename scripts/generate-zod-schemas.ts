#!/usr/bin/env tsx

/**
 * Generate Zod schemas from TypeScript types in types.ts
 *
 * This script parses the TypeScript types and generates corresponding Zod schemas.
 * It handles: primitive types, objects, arrays, unions, optional fields, nested types.
 */

import * as fs from 'fs'
import * as path from 'path'

const TYPES_PATH = path.join(__dirname, '../src/domain/intent-model/types.ts')
const OUTPUT_PATH = path.join(__dirname, '../src/lib/model-schemas.ts')

interface TypeDefinition {
  name: string
  properties: PropertyDefinition[]
  isExported: boolean
}

interface PropertyDefinition {
  name: string
  type: string
  isOptional: boolean
  isArray: boolean
  isEnum: boolean
  enumValues?: string[]
}

function parseTypeDefinitions(content: string): TypeDefinition[] {
  const types: TypeDefinition[] = []

  // Match exported type definitions with proper brace matching
  const typeRegex = /export type (\w+) = (\{[\s\S]*?\n\})/g

  let match
  while ((match = typeRegex.exec(content)) !== null) {
    const typeName = match[1]
    const fullTypeBody = match[2]

    // Skip review state types and mapping utilities
    if (typeName === 'SectionType') continue
    if (typeName === 'ReviewState') continue
    if (typeName === 'Comment') continue
    if (typeName === 'SectionReview') continue

    const properties = parsePropertiesAdvanced(fullTypeBody)

    types.push({
      name: typeName,
      properties,
      isExported: true,
    })
  }

  return types
}

function parsePropertiesAdvanced(typeBody: string): PropertyDefinition[] {
  const properties: PropertyDefinition[] = []

  // Remove outer braces
  const content = typeBody.slice(1, -1).trim()

  let i = 0
  while (i < content.length) {
    // Skip whitespace and newlines
    while (i < content.length && /\s/.test(content[i])) i++
    if (i >= content.length) break

    // Parse property name
    const nameMatch = content.slice(i).match(/^(\w+)(\?)?:\s*/)
    if (!nameMatch) {
      i++
      continue
    }

    const name = nameMatch[1]
    const isOptional = nameMatch[2] === '?'
    i += nameMatch[0].length

    // Parse property type
    let typeStr = ''
    let braceDepth = 0
    let bracketDepth = 0

    while (i < content.length) {
      const char = content[i]

      if (char === '{') braceDepth++
      if (char === '}') braceDepth--
      if (char === '[') bracketDepth++
      if (char === ']') bracketDepth--

      // End of property if we hit a newline at depth 0
      if (braceDepth === 0 && bracketDepth === 0 && char === '\n') {
        break
      }

      typeStr += char
      i++
    }

    typeStr = typeStr.trim()

    const property = parseTypeString(name, typeStr, isOptional, '')
    properties.push(property)
  }

  return properties
}

function parseTypeString(name: string, typeStr: string, isOptional: boolean, fullContent: string): PropertyDefinition {
  // Remove trailing comma if present
  typeStr = typeStr.replace(/,$/, '').trim()

  // Check for array types: Type[]
  const isArray = typeStr.endsWith('[]')
  if (isArray) {
    typeStr = typeStr.slice(0, -2).trim()
  }

  // Check for union types (enums)
  const isEnum = typeStr.includes('|')
  let enumValues: string[] | undefined

  if (isEnum) {
    // Extract enum values from union type
    enumValues = typeStr
      .split('|')
      .map(v => v.trim().replace(/'/g, ''))
  }

  // Check for object literal types
  const isObjectLiteral = typeStr.startsWith('{')

  return {
    name,
    type: typeStr,
    isOptional,
    isArray,
    isEnum,
    enumValues,
  }
}

function generateZodSchema(type: TypeDefinition, allTypes: TypeDefinition[]): string {
  const schemaName = `${type.name}Schema`
  const properties = type.properties.map(prop => generatePropertySchema(prop, allTypes))

  return `export const ${schemaName} = z.object({\n${properties.join(',\n')}\n})`
}

function generatePropertySchema(prop: PropertyDefinition, allTypes: TypeDefinition[]): string {
  let schema = generateBaseSchema(prop, allTypes)

  if (prop.isArray) {
    schema = `z.array(${schema})`
  }

  if (prop.isOptional) {
    schema = `${schema}.optional()`
  }

  return `  ${prop.name}: ${schema}`
}

function generateBaseSchema(prop: PropertyDefinition, allTypes: TypeDefinition[]): string {
  // Handle primitive types
  if (prop.type === 'string') return 'z.string()'
  if (prop.type === 'number') return 'z.number()'
  if (prop.type === 'boolean') return 'z.boolean()'

  // Handle enums (union types)
  if (prop.isEnum && prop.enumValues) {
    const values = prop.enumValues.map(v => `'${v}'`).join(', ')
    return `z.enum([${values}])`
  }

  // Handle object literal types
  if (prop.type.startsWith('{')) {
    return generateInlineObjectSchema(prop.type)
  }

  // Handle referenced types (check if it's a defined type)
  const referencedType = allTypes.find(t => t.name === prop.type)
  if (referencedType) {
    return `${prop.type}Schema`
  }

  // Default to string for unknown types
  console.warn(`Unknown type: ${prop.type}, defaulting to z.string()`)
  return 'z.string()'
}

function generateInlineObjectSchema(objectType: string): string {
  // Parse properties from object literal
  const nestedProps = parsePropertiesAdvanced(objectType)
  const properties: string[] = []

  for (const prop of nestedProps) {
    let schema: string

    // Handle arrays
    if (prop.isArray) {
      if (prop.type === 'string') {
        schema = 'z.array(z.string())'
      } else {
        schema = `z.array(${prop.type}Schema)`
      }
    } else if (prop.type === 'string') {
      schema = 'z.string()'
    } else if (prop.type === 'number') {
      schema = 'z.number()'
    } else if (prop.type === 'boolean') {
      schema = 'z.boolean()'
    } else {
      // Assume it's a referenced type
      schema = `${prop.type}Schema`
    }

    if (prop.isOptional) {
      schema = `${schema}.optional()`
    }

    properties.push(`    ${prop.name}: ${schema}`)
  }

  return `z.object({\n${properties.join(',\n')}\n  })`
}

function sortTypesByDependency(types: TypeDefinition[]): TypeDefinition[] {
  const sorted: TypeDefinition[] = []
  const visited = new Set<string>()
  const visiting = new Set<string>()

  function extractTypeDependencies(prop: PropertyDefinition): string[] {
    const deps: string[] = []

    // Handle simple types
    let cleanType = prop.type.replace(/\[\]$/, '').trim()

    // If it's an object literal, parse it to find nested dependencies
    if (cleanType.startsWith('{')) {
      const nestedProps = parsePropertiesAdvanced(cleanType)
      for (const nested of nestedProps) {
        deps.push(...extractTypeDependencies(nested))
      }
    } else {
      deps.push(cleanType)
    }

    return deps
  }

  function visit(type: TypeDefinition) {
    if (visited.has(type.name)) return
    if (visiting.has(type.name)) {
      // Circular dependency, skip
      return
    }

    visiting.add(type.name)

    // Visit dependencies first
    for (const prop of type.properties) {
      const dependencies = extractTypeDependencies(prop)

      for (const depTypeName of dependencies) {
        const depType = types.find(t => t.name === depTypeName)
        if (depType && !visited.has(depType.name)) {
          visit(depType)
        }
      }
    }

    visiting.delete(type.name)
    visited.add(type.name)
    sorted.push(type)
  }

  // Visit all types
  for (const type of types) {
    visit(type)
  }

  return sorted
}

function generateOutput(types: TypeDefinition[]): string {
  // Sort types by dependency order
  const sortedTypes = sortTypesByDependency(types)

  // Generate schemas
  const schemas = sortedTypes.map(type => generateZodSchema(type, types))

  // Generate section schemas
  const sectionSchemas = `
// Section-level schemas for scoped edits
export const SectionSchemas = {
  actors: z.object({ actors: z.array(ActorSchema) }),
  entities: z.object({ entities: z.array(EntitySchema) }),
  journeys: z.object({ journeys: z.array(JourneySchema) }),
  businessRules: z.object({ businessRules: z.array(BusinessRuleSchema) }),
  constraints: z.object({ constraints: z.array(ConstraintSchema) }),
  openQuestions: z.object({ openQuestions: z.array(OpenQuestionSchema) }),
} as const
`

  return `// AUTO-GENERATED from types.ts - Do not edit manually
// Run: pnpm generate:schemas

import { z } from 'zod'

${schemas.join('\n\n')}
${sectionSchemas}
`
}

function main() {
  console.log('Reading types.ts...')
  const content = fs.readFileSync(TYPES_PATH, 'utf-8')

  console.log('Parsing type definitions...')
  const types = parseTypeDefinitions(content)

  console.log(`Found ${types.length} type definitions:`)
  types.forEach(t => console.log(`  - ${t.name}`))

  console.log('\nGenerating Zod schemas...')
  const output = generateOutput(types)

  console.log(`Writing to ${OUTPUT_PATH}...`)
  fs.writeFileSync(OUTPUT_PATH, output, 'utf-8')

  console.log('Done!')
}

main()
