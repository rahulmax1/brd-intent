// Project requirements - context for delivery, not domain concepts
// These represent project management metadata, not domain model

export type ProjectRequirements = {
  assumptions: Assumption[]
  dependencies: Dependency[]
  nfrs: NonFunctionalRequirement[]
}

export type Assumption = {
  id: string // e.g. "A-001"
  category: string // e.g. "User Roles and Access"
  assumption: string // The assumption statement
  rationale?: string // Why this assumption exists
  impact?: string // Impact if assumption changes
}

export type Dependency = {
  id: string // e.g. "DEP-001"
  name: string // e.g. "Identity and SSO"
  description: string // What is needed
  owner: string // Who owns/provides this
  status?: 'defined' | 'pending' | 'blocked' | 'resolved'
  risk?: 'low' | 'medium' | 'high'
}

export type NonFunctionalRequirement = {
  id: string // e.g. "NFR-001"
  category: 'performance' | 'availability' | 'audit' | 'security' | 'scalability' | 'usability'
  requirement: string // The NFR statement
  measurement?: string // How to measure/verify
  target?: string // Specific target (e.g. "< 2 seconds")
}
