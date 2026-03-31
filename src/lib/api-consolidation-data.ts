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

export const consolidationSummary: ConsolidationSummary = {
  initialProposal: 52,
  validated: 48,
  netChange: -4,
  removed: 10,
  added: 8,
  kept: 42,
}

export const domainConsolidations: DomainConsolidation[] = [
  {
    domain: 'HBLs/Shipments',
    domainLetter: 'H',
    currentCount: 6,
    proposedCount: 4,
    savings: 2,
    changes: [
      {
        type: 'removed',
        endpoint: 'API-H047',
        path: 'GET /api/hbls/search',
        rationale: 'Search is a filtered list operation — consolidate into GET /api/hbls with query parameter',
        alternative: 'Use GET /api/hbls with ?q= search parameter',
        status: 'validated',
      },
      {
        type: 'removed',
        endpoint: 'API-H931',
        path: 'POST /api/hbls/:id/flag-under-bond',
        rationale: 'Flagging is a property update, not a separate action — combine with general PATCH endpoint',
        alternative: 'Use PATCH /api/hbls/:id with { under_bond: true }',
        status: 'validated',
      },
    ],
  },
  {
    domain: 'Bookings',
    domainLetter: 'B',
    currentCount: 7,
    proposedCount: 6,
    savings: 1,
    changes: [
      {
        type: 'removed',
        endpoint: 'API-B591',
        path: 'GET /api/bookings/search',
        rationale: 'Search is a filtered list operation — consolidate into GET /api/bookings with query parameter',
        alternative: 'Use GET /api/bookings with ?q= search parameter',
        status: 'validated',
      },
    ],
  },
  {
    domain: 'Slots',
    domainLetter: 'S',
    currentCount: 6,
    proposedCount: 4,
    savings: 2,
    changes: [
      {
        type: 'removed',
        endpoint: 'API-S758',
        path: 'DELETE /api/slots/:id',
        rationale: 'Deletion should be soft delete via status flag rather than hard delete',
        alternative: 'Use PATCH /api/slots/:id with { is_active: false }',
        status: 'validated',
      },
      {
        type: 'removed',
        endpoint: 'API-S203',
        path: 'POST /api/slots/:id/block',
        rationale: 'Blocking is a property update, not a separate action — combine with general PATCH endpoint',
        alternative: 'Use PATCH /api/slots/:id with { is_blocked: true }',
        status: 'validated',
      },
    ],
  },
  {
    domain: 'Delivery Orders',
    domainLetter: 'D',
    currentCount: 6,
    proposedCount: 5,
    savings: 1,
    changes: [
      {
        type: 'merged',
        endpoint: 'API-D827',
        path: 'PATCH /api/delivery-orders/:id/flag',
        rationale: 'Flagging endpoint functionality merged into validation endpoint',
        alternative: 'Use API-D148 (validation endpoint) which handles flagging',
        status: 'validated',
      },
    ],
  },
  {
    domain: 'Drivers',
    domainLetter: 'R',
    currentCount: 4,
    proposedCount: 3,
    savings: 1,
    changes: [
      {
        type: 'removed',
        endpoint: 'API-R491',
        path: 'DELETE /api/drivers/:id',
        rationale: 'Deletion should be soft delete via status flag rather than hard delete',
        alternative: 'Use PATCH /api/drivers/:id with { is_active: false }',
        status: 'validated',
      },
    ],
  },
  {
    domain: 'Users',
    domainLetter: 'U',
    currentCount: 5,
    proposedCount: 4,
    savings: 1,
    changes: [
      {
        type: 'removed',
        endpoint: 'API-U493',
        path: 'POST /api/users/:id/reactivate',
        rationale: 'Reactivation is a property update, not a separate action — combine with general PATCH endpoint',
        alternative: 'Use PATCH /api/users/:id with { is_active: true }',
        status: 'validated',
      },
    ],
  },
  {
    domain: 'Sites',
    domainLetter: 'Si',
    currentCount: 1,
    proposedCount: 2,
    savings: -1,
    changes: [
      {
        type: 'added',
        path: 'PATCH /api/sites/:id',
        rationale: 'Site management capability gap — ACFS admins need to update site details (name, address, contact)',
        status: 'validated',
      },
    ],
  },
  {
    domain: 'Containers',
    domainLetter: 'C',
    currentCount: 0,
    proposedCount: 2,
    savings: -2,
    changes: [
      {
        type: 'added',
        path: 'GET /api/containers',
        rationale: 'New domain — list containers with filters (carrier, status, location)',
        status: 'validated',
      },
      {
        type: 'added',
        path: 'PATCH /api/containers/:id',
        rationale: 'New domain — update container status (in-transit, delivered, damaged)',
        status: 'validated',
      },
    ],
  },
  {
    domain: 'Pricing Zones',
    domainLetter: 'P',
    currentCount: 0,
    proposedCount: 4,
    savings: -4,
    changes: [
      {
        type: 'added',
        path: 'GET /api/pricing-zones',
        rationale: 'New domain — list pricing zones with region and rate information',
        status: 'validated',
      },
      {
        type: 'added',
        path: 'POST /api/pricing-zones',
        rationale: 'New domain — create new pricing zone (required for ACFS pricing management)',
        status: 'validated',
      },
      {
        type: 'added',
        path: 'PATCH /api/pricing-zones/:id',
        rationale: 'New domain — update pricing zone rates and region boundaries',
        status: 'validated',
      },
      {
        type: 'added',
        path: 'DELETE /api/pricing-zones/:id',
        rationale: 'New domain — soft delete (deactivate) pricing zone to preserve history',
        status: 'validated',
      },
    ],
  },
  {
    domain: 'Notifications',
    domainLetter: 'N',
    currentCount: 0,
    proposedCount: 1,
    savings: -1,
    changes: [
      {
        type: 'added',
        path: 'GET /api/notifications',
        rationale: 'New endpoint — list email notifications for audit trail and compliance tracking',
        status: 'validated',
      },
    ],
  },
  {
    domain: 'P4TC Auth',
    domainLetter: 'T',
    currentCount: 2,
    proposedCount: 0,
    savings: 2,
    changes: [
      {
        type: 'removed',
        endpoint: 'API-T647',
        path: 'POST /api/p4tc/verify-otp',
        rationale: 'Phase 1 deferred — P4TC integration scheduled for Phase 2',
        status: 'deferred',
      },
      {
        type: 'removed',
        endpoint: 'API-T392',
        path: 'GET /api/p4tc/session',
        rationale: 'Phase 1 deferred — P4TC integration scheduled for Phase 2',
        status: 'deferred',
      },
    ],
  },
]

export interface ConsolidationPrinciple {
  title: string
  description: string
  examples: string[]
}

export const consolidationPrinciples: ConsolidationPrinciple[] = [
  {
    title: 'Search is a filtered list',
    description: 'Use query parameters on list endpoints rather than separate /search routes',
    examples: [
      'GET /api/hbls?q=search-term',
      'GET /api/bookings?status=pending&customer=acme',
    ],
  },
  {
    title: 'Property updates use PATCH',
    description: 'Status changes and flag toggles are property updates, not separate actions',
    examples: [
      'PATCH /api/slots/:id { is_blocked: true }',
      'PATCH /api/users/:id { is_active: false }',
    ],
  },
  {
    title: 'Soft delete over hard delete',
    description: 'Preserve audit trail by deactivating records rather than removing them',
    examples: [
      'PATCH /api/drivers/:id { is_active: false }',
      'PATCH /api/pricing-zones/:id { is_deleted: true }',
    ],
  },
  {
    title: 'Consolidate related actions',
    description: 'Merge functionally similar endpoints that differ only in scope or minor behavior',
    examples: [
      'API-D827 (flagging) merged into API-D148 (validation)',
    ],
  },
  {
    title: 'Fill schema gaps',
    description: 'Add missing CRUD operations for domains that exist but lack management endpoints',
    examples: [
      'PATCH /api/sites/:id (update site details)',
      'GET /api/containers (list containers)',
    ],
  },
  {
    title: 'Defer non-MVP scope',
    description: 'Push Phase 2 features to fast follow rather than bloating initial release',
    examples: [
      'P4TC authentication endpoints deferred to Phase 2',
    ],
  },
]
