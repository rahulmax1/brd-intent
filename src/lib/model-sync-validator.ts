import type { IntentModel } from '@/domain/intent-model/types'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface SyncValidationResult {
  valid: boolean
  issues: SyncIssue[]
  suggestions: string[]
}

export interface SyncIssue {
  severity: 'error' | 'warning'
  type: 'schema-mismatch' | 'ai-prompt-mismatch' | 'orphaned-reference' | 'missing-type' | 'constraint-type-mismatch'
  message: string
  fix?: string
}

const TYPES_PATH = join(process.cwd(), 'src/domain/intent-model/types.ts')
const SCHEMAS_PATH = join(process.cwd(), 'src/lib/model-schemas.ts')
const AI_TYPE_DEFINITIONS_PATH = join(process.cwd(), 'src/lib/ai-type-definitions.ts')

/**
 * Main validation function - runs all sync checks
 */
export async function validateModelSync(model: IntentModel): Promise<SyncValidationResult> {
  const issues: SyncIssue[] = []
  const suggestions: string[] = []

  // 1. Validate against Zod schema
  const schemaIssues = await validateAgainstSchema(model)
  issues.push(...schemaIssues)

  // 2. Check constraint types sync
  const constraintIssues = await validateConstraintTypes(model)
  issues.push(...constraintIssues)

  // 3. Check AI prompt type definitions
  const aiPromptIssues = await validateAiPromptSync(model)
  issues.push(...aiPromptIssues)

  // 4. Validate entity references
  const referenceIssues = validateEntityReferences(model)
  issues.push(...referenceIssues)

  // 5. Check for orphaned references
  const orphanedIssues = validateOrphanedReferences(model)
  issues.push(...orphanedIssues)

  // Generate suggestions based on issues
  if (issues.some(i => i.type === 'schema-mismatch' || i.type === 'constraint-type-mismatch')) {
    suggestions.push('Run: pnpm generate:schemas')
  }

  if (issues.some(i => i.type === 'ai-prompt-mismatch')) {
    suggestions.push('Run: pnpm generate:ai-types to sync ai-type-definitions.ts with types.ts')
  }

  if (issues.some(i => i.type === 'orphaned-reference')) {
    suggestions.push('Review and fix entity references in journeys and business rules')
  }

  const valid = !issues.some(i => i.severity === 'error')

  return { valid, issues, suggestions }
}

/**
 * Validate model against Zod schema
 */
async function validateAgainstSchema(model: IntentModel): Promise<SyncIssue[]> {
  const issues: SyncIssue[] = []

  try {
    // Dynamic import to avoid circular dependency issues
    const { IntentModelSchema } = await import('./model-schemas')
    IntentModelSchema.parse(model)
  } catch (error) {
    if (error && typeof error === 'object' && 'errors' in error) {
      const zodErrors = error.errors as Array<{ path: unknown[]; message: string }>
      for (const err of zodErrors) {
        issues.push({
          severity: 'error',
          type: 'schema-mismatch',
          message: `Schema validation failed at ${err.path.join('.')}: ${err.message}`,
          fix: 'Ensure model structure matches Zod schema in model-schemas.ts',
        })
      }
    } else {
      issues.push({
        severity: 'error',
        type: 'schema-mismatch',
        message: 'Schema validation failed with unknown error',
      })
    }
  }

  return issues
}

/**
 * Validate constraint types match between types.ts and model-schemas.ts
 */
async function validateConstraintTypes(model: IntentModel): Promise<SyncIssue[]> {
  const issues: SyncIssue[] = []

  try {
    // Extract constraint types from types.ts
    const typesContent = await readFile(TYPES_PATH, 'utf-8')
    const typeMatch = typesContent.match(/type:\s*'([^']+)'(?:\s*\|\s*'([^']+)')*/g)

    if (!typeMatch) {
      issues.push({
        severity: 'warning',
        type: 'constraint-type-mismatch',
        message: 'Could not extract constraint types from types.ts',
      })
      return issues
    }

    // Parse constraint types from the match
    const typesStr = typeMatch[0]
    const typesFromTypes = new Set(
      Array.from(typesStr.matchAll(/'([^']+)'/g)).map(m => m[1])
    )

    // Extract constraint types from model-schemas.ts
    const schemasContent = await readFile(SCHEMAS_PATH, 'utf-8')
    const schemaMatch = schemasContent.match(/type:\s*z\.enum\(\[([^\]]+)\]\)/)

    if (!schemaMatch) {
      issues.push({
        severity: 'error',
        type: 'constraint-type-mismatch',
        message: 'Could not extract constraint types from model-schemas.ts',
        fix: 'Run: pnpm generate:schemas',
      })
      return issues
    }

    const typesFromSchema = new Set(
      Array.from(schemaMatch[1].matchAll(/'([^']+)'/g)).map(m => m[1])
    )

    // Compare sets
    const inTypesNotInSchema = Array.from(typesFromTypes).filter(t => !typesFromSchema.has(t))
    const inSchemaNotInTypes = Array.from(typesFromSchema).filter(t => !typesFromTypes.has(t))

    if (inTypesNotInSchema.length > 0) {
      issues.push({
        severity: 'error',
        type: 'constraint-type-mismatch',
        message: `Constraint types in types.ts but not in model-schemas.ts: ${inTypesNotInSchema.join(', ')}`,
        fix: 'Run: pnpm generate:schemas',
      })
    }

    if (inSchemaNotInTypes.length > 0) {
      issues.push({
        severity: 'error',
        type: 'constraint-type-mismatch',
        message: `Constraint types in model-schemas.ts but not in types.ts: ${inSchemaNotInTypes.join(', ')}`,
        fix: 'Update types.ts Constraint type definition',
      })
    }

    // Check if model contains any constraint types not in types.ts
    const modelConstraintTypes = new Set(model.constraints.map(c => c.type))
    const invalidTypes = Array.from(modelConstraintTypes).filter(t => !typesFromTypes.has(t))

    if (invalidTypes.length > 0) {
      issues.push({
        severity: 'error',
        type: 'constraint-type-mismatch',
        message: `Model contains invalid constraint types: ${invalidTypes.join(', ')}`,
        fix: 'Update constraint types in model or add new types to types.ts',
      })
    }

  } catch (error) {
    issues.push({
      severity: 'warning',
      type: 'constraint-type-mismatch',
      message: `Could not validate constraint types: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }

  return issues
}

/**
 * Validate AI prompt type definitions match types.ts
 */
async function validateAiPromptSync(_model: IntentModel): Promise<SyncIssue[]> {
  const issues: SyncIssue[] = []

  try {
    const typesContent = await readFile(TYPES_PATH, 'utf-8')
    const aiPromptContent = await readFile(AI_TYPE_DEFINITIONS_PATH, 'utf-8')

    // Extract constraint types from both files
    const typesMatch = typesContent.match(/type:\s*'([^']+)'(?:\s*\|\s*'([^']+)')*/g)
    const aiPromptMatch = aiPromptContent.match(/type:\s*'([^']+)'(?:\s*\|\s*'([^']+)')*/g)

    if (!typesMatch || !aiPromptMatch) {
      issues.push({
        severity: 'warning',
        type: 'ai-prompt-mismatch',
        message: 'Could not extract constraint types for comparison',
      })
      return issues
    }

    const typesFromTypes = new Set(
      Array.from(typesMatch[0].matchAll(/'([^']+)'/g)).map(m => m[1])
    )
    const typesFromAiPrompt = new Set(
      Array.from(aiPromptMatch[0].matchAll(/'([^']+)'/g)).map(m => m[1])
    )

    // Compare constraint types
    const inTypesNotInAi = Array.from(typesFromTypes).filter(t => !typesFromAiPrompt.has(t))
    const inAiNotInTypes = Array.from(typesFromAiPrompt).filter(t => !typesFromTypes.has(t))

    if (inTypesNotInAi.length > 0) {
      issues.push({
        severity: 'warning',
        type: 'ai-prompt-mismatch',
        message: `Constraint types in types.ts but not in ai-type-definitions.ts: ${inTypesNotInAi.join(', ')}`,
        fix: 'Run: pnpm generate:ai-types',
      })
    }

    if (inAiNotInTypes.length > 0) {
      issues.push({
        severity: 'warning',
        type: 'ai-prompt-mismatch',
        message: `Constraint types in ai-type-definitions.ts but not in types.ts: ${inAiNotInTypes.join(', ')}`,
        fix: 'Update Constraint type in types.ts',
      })
    }

    // Check for optional fields mismatch (deferred, is_integration, etc.)
    const optionalFieldsInTypes = [
      { type: 'Actor', field: 'deferred', present: typesContent.includes('deferred?: boolean') },
      { type: 'Entity', field: 'is_integration', present: typesContent.includes('is_integration?: boolean') },
      { type: 'Entity', field: 'deferred', present: typesContent.includes('deferred?: boolean') && typesContent.indexOf('deferred?: boolean', typesContent.indexOf('export type Entity')) > -1 },
    ]

    for (const field of optionalFieldsInTypes) {
      if (field.present && !aiPromptContent.includes(`${field.field}?:`)) {
        issues.push({
          severity: 'warning',
          type: 'ai-prompt-mismatch',
          message: `Optional field '${field.field}' in ${field.type} exists in types.ts but not in ai-type-definitions.ts`,
          fix: 'Run: pnpm generate:ai-types',
        })
      }
    }

  } catch (error) {
    issues.push({
      severity: 'warning',
      type: 'ai-prompt-mismatch',
      message: `Could not validate AI prompt sync: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }

  return issues
}

/**
 * Validate entity references are valid
 */
function validateEntityReferences(model: IntentModel): SyncIssue[] {
  const issues: SyncIssue[] = []

  // Build ID sets
  const actorIds = new Set(model.actors.map(a => a.id))
  const entityIds = new Set(model.entities.map(e => e.id))

  // Check journey primary_actor references
  for (const journey of model.journeys) {
    if (!actorIds.has(journey.primary_actor)) {
      issues.push({
        severity: 'error',
        type: 'orphaned-reference',
        message: `Journey "${journey.name}" (${journey.id}) references non-existent actor: ${journey.primary_actor}`,
        fix: 'Update primary_actor to reference a valid actor ID or add the missing actor',
      })
    }
  }

  // Check business rule applies_to references
  for (const rule of model.businessRules) {
    for (const targetId of rule.applies_to) {
      if (!actorIds.has(targetId) && !entityIds.has(targetId)) {
        issues.push({
          severity: 'error',
          type: 'orphaned-reference',
          message: `Business rule "${rule.description}" (${rule.id}) references non-existent actor/entity: ${targetId}`,
          fix: 'Update applies_to to reference valid actor or entity IDs',
        })
      }
    }
  }

  return issues
}

/**
 * Check for orphaned references (references to deleted entities)
 */
function validateOrphanedReferences(model: IntentModel): SyncIssue[] {
  const issues: SyncIssue[] = []

  // Check for duplicate IDs
  const idCounts = new Map<string, number>()
  const addId = (id: string) => {
    idCounts.set(id, (idCounts.get(id) || 0) + 1)
  }

  model.actors.forEach(a => {
    addId(a.id)
    a.responsibilities.forEach(r => addId(r.id))
  })
  model.entities.forEach(e => addId(e.id))
  model.journeys.forEach(j => addId(j.id))
  model.businessRules.forEach(r => addId(r.id))
  model.constraints.forEach(c => addId(c.id))
  model.openQuestions.forEach(q => addId(q.id))

  for (const [id, count] of idCounts) {
    if (count > 1) {
      issues.push({
        severity: 'error',
        type: 'orphaned-reference',
        message: `Duplicate ID found: "${id}" appears ${count} times`,
        fix: 'Ensure all IDs are unique across the model',
      })
    }
  }

  return issues
}

/**
 * Quick validation for use in hot paths - only checks critical errors
 */
export async function quickValidate(model: IntentModel): Promise<{ valid: boolean; error?: string }> {
  try {
    const { IntentModelSchema } = await import('./model-schemas')
    IntentModelSchema.parse(model)
    return { valid: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown validation error'
    return { valid: false, error: message }
  }
}
