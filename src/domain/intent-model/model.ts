import type { IntentModel } from './types'

export const intentModel: IntentModel = {
  meta: {
    version: '0.1.0',
    project: 'Adapt Canvas',
    lastUpdated: '2026-03-31',
    status: 'draft',
  },
  actors: [
    // Example: Red Team, Client, Blue Team, Target Organization, etc.
    // Use the AI chat panel to build your model: "Add a Red Team actor responsible for reconnaissance and exploitation"
  ],
  entities: [
    // Example: Target, Vulnerability, Finding, Exploit, Report, etc.
    // Use AI: "Create a Target entity with fields for IP, hostname, services, and vulnerabilities"
  ],
  journeys: [
    // Example: Network Reconnaissance, Vulnerability Assessment, Exploitation, Reporting, etc.
    // Use AI: "Add a reconnaissance journey for network scanning and service enumeration"
  ],
  businessRules: [
    // Example: Scope boundaries, Authorization requirements, Notification rules, etc.
    // Use AI: "Add a rule that all exploitation attempts require explicit authorization"
  ],
  constraints: [
    // Example: Testing hours, Excluded systems, Approval gates, etc.
    // Use AI: "Add a constraint for testing windows and blackout periods"
  ],
  openQuestions: [
    // Track unresolved decisions during planning
  ],
}
