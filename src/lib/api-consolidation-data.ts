export interface ConsolidationChange {
  type: 'removed' | 'merged' | 'added' | 'kept'
  endpoint?: string
  path?: string
  rationale: string
  alternative?: string
  status: 'validated' | 'deferred'
}

export interface DomainConsolidation {
  domain: string
  domainLetter: string
  currentCount: number
  proposedCount: number
  savings: number
  changes: ConsolidationChange[]
}

export interface ConsolidationSummary {
  initialProposal: number
  validated: number
  netChange: number
  removed: number
  added: number
  kept: number
}

// API consolidation analysis
// Track proposed API changes, removals, and optimizations here

export const consolidationSummary: ConsolidationSummary = {
  initialProposal: 0,
  validated: 0,
  netChange: 0,
  removed: 0,
  added: 0,
  kept: 0,
}

export const domainConsolidations: DomainConsolidation[] = [
  // Example:
  // {
  //   domain: 'Users',
  //   domainLetter: 'U',
  //   currentCount: 8,
  //   proposedCount: 6,
  //   savings: 2,
  //   changes: [
  //     {
  //       type: 'removed',
  //       endpoint: 'API-U123',
  //       path: 'GET /api/users/search',
  //       rationale: 'Consolidate into main list endpoint',
  //       alternative: 'Use GET /api/users with ?q= parameter',
  //       status: 'validated'
  //     }
  //   ]
  // }
]

export interface ConsolidationPrinciple {
  title: string
  description: string
  examples: string[]
}

export const consolidationPrinciples: ConsolidationPrinciple[] = [
  // Add your API design principles here
  // Example:
  // {
  //   title: 'Consolidate search into list',
  //   description: 'Search endpoints should be query parameters on list endpoints',
  //   examples: ['GET /api/users?q=search instead of GET /api/users/search']
  // }
]
