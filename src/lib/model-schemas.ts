// AUTO-GENERATED from types.ts - Do not edit manually
// Run: pnpm generate:schemas

import { z } from 'zod'

export const ModelMetaSchema = z.object({
  version: z.string(),
  project: z.string(),
  lastUpdated: z.string(),
  status: z.enum(['draft', 'in_review', 'approved'])
})

export const ResponsibilitySchema = z.object({
  id: z.string(),
  description: z.string(),
  warn: z.string().optional(),
  edge: z.string().optional()
})

export const ActorSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  auth: z.string(),
  responsibilities: z.array(ResponsibilitySchema),
  deferred: z.boolean().optional()
})

export const FieldSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string(),
  warn: z.string().optional()
})

export const TransitionSchema = z.object({
  from: z.string(),
  to: z.string(),
  trigger: z.string(),
  guard: z.string().optional(),
  warn: z.string().optional()
})

export const EntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  key_fields: z.array(FieldSchema),
  lifecycle: z.object({
    states: z.array(z.string()),
    transitions: z.array(TransitionSchema),
    warn: z.string().optional()
  }),
  is_integration: z.boolean().optional(),
  deferred: z.boolean().optional()
})

export const JourneyStepSchema = z.object({
  order: z.number(),
  title: z.string(),
  detail: z.string(),
  precondition: z.string().optional(),
  warn: z.string().optional(),
  edge: z.string().optional()
})

export const JourneySchema = z.object({
  id: z.string(),
  name: z.string(),
  primary_actor: z.string(),
  preconditions: z.array(z.string()),
  steps: z.array(JourneyStepSchema),
  success_outcome: z.string(),
  warn: z.string().optional(),
  deferred: z.boolean().optional()
})

export const BusinessRuleSchema = z.object({
  id: z.string(),
  description: z.string(),
  applies_to: z.array(z.string()),
  source: z.string(),
  warn: z.string().optional()
})

export const ConstraintSchema = z.object({
  id: z.string(),
  constraint: z.string(),
  type: z.enum(['capacity', 'pricing', 'access', 'compliance', 'temporal', 'admin', 'platform', 'notification'])
})

export const OpenQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  reason: z.string(),
  status: z.enum(['open', 'deferred', 'resolved']),
  resolution: z.string().optional()
})

export const IntentModelSchema = z.object({
  meta: ModelMetaSchema,
  actors: z.array(ActorSchema),
  entities: z.array(EntitySchema),
  journeys: z.array(JourneySchema),
  businessRules: z.array(BusinessRuleSchema),
  constraints: z.array(ConstraintSchema),
  openQuestions: z.array(OpenQuestionSchema)
})

// Section-level schemas for scoped edits
export const SectionSchemas = {
  actors: z.object({ actors: z.array(ActorSchema) }),
  entities: z.object({ entities: z.array(EntitySchema) }),
  journeys: z.object({ journeys: z.array(JourneySchema) }),
  businessRules: z.object({ businessRules: z.array(BusinessRuleSchema) }),
  constraints: z.object({ constraints: z.array(ConstraintSchema) }),
  openQuestions: z.object({ openQuestions: z.array(OpenQuestionSchema) }),
} as const

