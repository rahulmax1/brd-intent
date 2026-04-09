import { type ProjectConfig } from '@/lib/project-config-schema'

export const projectConfig: ProjectConfig = {
  name: 'BRD Intent',
  shortName: 'BRD',
  iconLetter: 'B',
  description: 'AI-powered intent model platform for structuring project requirements',

  abbreviations: {
    // Empty - users add their own domain acronyms
    // Example: CVE: 'Common Vulnerabilities and Exposures'
  },

  brd: {
    introText: 'The {project} is a structured intent model for penetration testing engagements.',
    scopeText: 'Define actors (Red Team, Client, Blue Team), entities (Targets, Vulnerabilities, Findings), journeys (Reconnaissance → Exploitation → Reporting), and rules to reach consensus before testing begins.',
  },

  ai: {
    idExamples: "short lowercase, e.g. 'redteam', 'client', 'target'",
    journeyIdExamples: "kebab-case, e.g. 'recon-network-scan', 'exploit-vulnerability'",
    idPatternHint: 'use descriptive IDs that reflect security testing phases',
  },
}
