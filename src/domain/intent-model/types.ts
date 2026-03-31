// Co-dependencies: when modifying these types, also update:
// - src/lib/model-schemas.ts (zod schemas) — run: pnpm generate:schemas
// - Run 'pnpm generate:ai-types' to regenerate AI type definitions

export type IntentModel = {
  meta: ModelMeta
  actors: Actor[]
  entities: Entity[]
  journeys: Journey[]
  businessRules: BusinessRule[]
  constraints: Constraint[]
  openQuestions: OpenQuestion[]
}

export type ModelMeta = {
  version: string
  project: string
  lastUpdated: string
  status: 'draft' | 'in_review' | 'approved'
}

export type Actor = {
  id: string
  name: string
  description: string
  auth: string
  responsibilities: Responsibility[]
  deferred?: boolean
}

export type Responsibility = {
  id: string
  description: string
  warn?: string
  edge?: string
}

export type Entity = {
  id: string
  name: string
  description: string
  key_fields: Field[]
  lifecycle: {
    states: string[]
    transitions: Transition[]
    warn?: string
  }
  is_integration?: boolean
  deferred?: boolean
}

export type Field = {
  name: string
  type: string
  description: string
  warn?: string
}

export type Transition = {
  from: string
  to: string
  trigger: string
  guard?: string
  warn?: string
}

export type Journey = {
  id: string
  name: string
  primary_actor: string
  preconditions: string[]
  steps: JourneyStep[]
  success_outcome: string
  warn?: string
  deferred?: boolean
}

export type JourneyStep = {
  order: number
  title: string
  detail: string
  precondition?: string
  warn?: string
  edge?: string
}

export type BusinessRule = {
  id: string
  description: string
  applies_to: string[]
  source: string
  warn?: string
}

export type Constraint = {
  id: string
  constraint: string
  type: 'capacity' | 'pricing' | 'access' | 'compliance' | 'temporal' | 'admin' | 'platform' | 'notification'
}

export type OpenQuestion = {
  id: string
  question: string
  reason: string
  status: 'open' | 'deferred' | 'resolved'
  resolution?: string
}

// --- Review State Types ---

export type SectionType = 'actor' | 'entity' | 'journey' | 'business_rule' | 'constraint' | 'open_question'

export type ReviewState = {
  modelVersion: string
  sections: SectionReview[]
}

export type Comment = {
  text: string
  timestamp: string
}

export type SectionReview = {
  targetId: string
  targetType: SectionType
  status: 'pending' | 'approved' | 'disputed'
  comments: Comment[]
}

// --- Mapping utilities ---

export const SECTION_TYPE_TO_MODEL_KEY: Record<SectionType, keyof IntentModel> = {
  actor: 'actors',
  entity: 'entities',
  journey: 'journeys',
  business_rule: 'businessRules',
  constraint: 'constraints',
  open_question: 'openQuestions',
}

export const MODEL_KEY_TO_SECTION_TYPE: Record<string, SectionType> = {
  actors: 'actor',
  entities: 'entity',
  journeys: 'journey',
  businessRules: 'business_rule',
  constraints: 'constraint',
  openQuestions: 'open_question',
}

export const SECTION_TYPE_TO_URL_PARAM: Record<SectionType, string> = {
  actor: 'actors',
  entity: 'entities',
  journey: 'journeys',
  business_rule: 'business-rules',
  constraint: 'constraints',
  open_question: 'open-questions',
}

export const URL_PARAM_TO_SECTION_TYPE: Record<string, SectionType> = {
  actors: 'actor',
  entities: 'entity',
  journeys: 'journey',
  'business-rules': 'business_rule',
  constraints: 'constraint',
  'open-questions': 'open_question',
}
