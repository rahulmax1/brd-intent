#!/usr/bin/env tsx
import fs from 'fs'
import path from 'path'
import { projectConfig } from '../project.config'

/**
 * Generates AI-readable type definitions from TypeScript source types.
 *
 * This script parses the intent model types and produces a simplified
 * type definition string that can be consumed by the AI system prompt.
 * It preserves essential structure while removing TypeScript-specific
 * syntax that isn't needed for AI understanding.
 */

const TYPES_PATH = path.join(process.cwd(), 'src/domain/intent-model/types.ts')
const OUTPUT_PATH = path.join(process.cwd(), 'src/lib/ai-type-definitions.ts')

type TypeInfo = {
  name: string
  content: string
}

function parseTypes(source: string): TypeInfo[] {
  const types: TypeInfo[] = []

  // Match type and interface definitions with proper nested brace handling
  const typeRegex = /(?:export\s+)?(?:type|interface)\s+(\w+)\s*=?\s*(\{[\s\S]*?\n\})/g

  let match
  while ((match = typeRegex.exec(source)) !== null) {
    const name = match[1]
    let content = match[2]

    // Remove outer braces
    content = content.slice(1, -1).trim()

    // Skip review state types and mapping utilities
    if (name === 'SectionType' || name === 'ReviewState' || name === 'Comment' || name === 'SectionReview') {
      continue
    }

    types.push({ name, content })
  }

  return types
}

function simplifyTypeContent(content: string, typeName: string): string {
  let simplified = content
    // Remove export keywords
    .replace(/export\s+/g, '')
    // Clean up excessive whitespace
    .replace(/\n\s*\n/g, '\n')
    .trim()

  // Replace nested type references with inline definitions
  // Keep the structure readable for AI
  return simplified
}

function convertToAIFormat(types: TypeInfo[]): string {
  const lines: string[] = []

  // Only include these core types that AI needs
  const coreTypes = ['IntentModel', 'Actor', 'Entity', 'Journey', 'BusinessRule', 'Constraint', 'OpenQuestion']

  for (const type of types) {
    if (!coreTypes.includes(type.name)) {
      continue
    }

    const simplified = simplifyTypeContent(type.content, type.name)

    // Special handling for IntentModel - show as main type
    if (type.name === 'IntentModel') {
      lines.push(`type IntentModel = {`)
      lines.push(`  meta: { version: string; project: string; lastUpdated: string; status: 'draft' | 'in_review' | 'approved' }`)
      lines.push(`  actors: Actor[]`)
      lines.push(`  entities: Entity[]`)
      lines.push(`  journeys: Journey[]`)
      lines.push(`  businessRules: BusinessRule[]`)
      lines.push(`  constraints: Constraint[]`)
      lines.push(`  openQuestions: OpenQuestion[]`)
      lines.push(`}`)
      continue
    }

    // Handle other core types
    lines.push(``)
    lines.push(`type ${type.name} = {`)

    // Parse and add fields
    const fieldLines = simplified.split('\n').map(line => line.trim()).filter(line => line)
    let skipUntilBrace = false

    for (const line of fieldLines) {
      // Skip lifecycle object definition (we'll handle it specially)
      if (line.includes('lifecycle:')) {
        lines.push(`  lifecycle: {`)
        lines.push(`    states: string[]`)
        lines.push(`    transitions: { from: string; to: string; trigger: string; guard?: string; warn?: string }[]`)
        lines.push(`  }`)
        skipUntilBrace = true
        continue
      }

      // Skip until we close the lifecycle object
      if (skipUntilBrace) {
        if (line === '}') {
          skipUntilBrace = false
        }
        continue
      }

      // Add special comments for ID patterns
      if (line.includes('id: string') && type.name === 'Actor') {
        lines.push(`  id: string          // ${projectConfig.ai.idExamples}`)
      } else if (line.includes('id: string') && type.name === 'Journey') {
        lines.push(`  id: string           // ${projectConfig.ai.journeyIdExamples}`)
      } else if (line.includes('id: string') && type.name === 'BusinessRule') {
        lines.push(`  id: string           // pattern: 'BR-NNN'`)
      } else if (line.includes('id: string') && type.name === 'Constraint') {
        lines.push(`  id: string           // pattern: 'C-NNN'`)
      } else if (line.includes('id: string') && type.name === 'OpenQuestion') {
        lines.push(`  id: string           // pattern: 'OQ-NNN'`)
      } else if (line.includes('responsibilities: Responsibility[]')) {
        lines.push(`  responsibilities: { id: string; description: string; warn?: string; edge?: string }[]`)
        lines.push(`  // responsibility IDs follow pattern: actorId:rN (e.g. 'wff:r1')`)
      } else if (line.includes('key_fields: Field[]')) {
        lines.push(`  key_fields: { name: string; type: string; description: string; warn?: string }[]`)
      } else if (line.includes('steps: JourneyStep[]')) {
        lines.push(`  steps: { order: number; title: string; detail: string; precondition?: string; warn?: string; edge?: string }[]`)
      } else if (line.includes('primary_actor: string')) {
        lines.push(`  primary_actor: string  // must reference an existing actor ID`)
      } else if (line.includes('applies_to: string[]')) {
        lines.push(`  applies_to: string[] // must reference existing actor or entity IDs`)
      } else {
        lines.push(`  ${line}`)
      }
    }

    lines.push(`}`)
  }

  return lines.join('\n')
}

function generateOutput(typeDefinitions: string): string {
  return `// Auto-generated by scripts/generate-ai-types.ts
// Do not edit manually - run 'pnpm generate:ai-types' to regenerate

export function generateTypeDefinitions(): string {
  return \`${typeDefinitions}
\`
}
`
}

function main() {
  console.log('Generating AI type definitions...')

  // Read source types
  const source = fs.readFileSync(TYPES_PATH, 'utf-8')

  // Parse types
  const types = parseTypes(source)
  console.log(`Found ${types.length} type definitions`)

  // Convert to AI format
  const aiFormat = convertToAIFormat(types)

  // Generate output file
  const output = generateOutput(aiFormat)

  // Write to disk
  fs.writeFileSync(OUTPUT_PATH, output, 'utf-8')
  console.log(`✓ Generated ${OUTPUT_PATH}`)
}

main()
