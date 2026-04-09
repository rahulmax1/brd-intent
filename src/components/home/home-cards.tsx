'use client'

import Link from 'next/link'
import {
  Users,
  Box,
  Route,
  Scale,
  Lock,
  HelpCircle,
  LayoutDashboard,
  Network,
  FileText,
  ClipboardList,
  Code,
  Map,
  TableProperties,
  GitCompare,
  ArrowRight,
  FileCheck,
  Sparkles,
  ExternalLink,
  Layers,
} from 'lucide-react'

type Card = {
  title: string
  description: string
  href: string
  icon: typeof Users
  items?: string[]
  external?: boolean
}

const cardGroups = [
  {
    title: 'BRD & Discussions',
    description: 'Source requirements and context',
    cards: [
      {
        title: 'Current BRD',
        description: 'Original business requirements document (PDF)',
        href: '/brd-current',
        icon: FileText,
        items: ['Source requirements', 'PDF viewer', 'Reference document'],
      },
    ],
  },
  {
    title: 'Intent Model & Views',
    description: 'Structured understanding of requirements',
    cards: [
      {
        title: 'Consensus Dashboard',
        description: 'Review and approve model sections across the team',
        href: '/consensus',
        icon: LayoutDashboard,
        items: ['Track approval status', 'See disputed items', 'Monitor progress'],
      },
      {
        title: 'Model Sections',
        description: 'Actors, entities, journeys, rules, constraints, and questions',
        href: '/actors',
        icon: Users,
        items: ['Actors', 'Entities', 'Journeys', 'Business Rules', 'Constraints', 'Open Questions'],
      },
      {
        title: '3D Explorer',
        description: 'Interactive visualizations of the intent model',
        href: '/explorer',
        icon: Network,
        items: ['Force graph', 'Lifecycle view', 'Actor layers'],
      },
      {
        title: 'Version History & Diff',
        description: 'Track changes and compare versions',
        href: '/versions',
        icon: GitCompare,
        items: ['Side-by-side diffs', 'Version timeline', 'Rollback capability'],
      },
    ],
  },
  {
    title: 'Derived Artefacts',
    description: 'Generated outputs from the intent model',
    cards: [
      {
        title: 'Generated BRD',
        description: 'Auto-generated business requirements document',
        href: '/brd',
        icon: ClipboardList,
        items: ['Auto-generated', 'Version-controlled', 'Export to markdown'],
      },
      {
        title: 'Simple Version',
        description: 'ELI-5 summary of the project',
        href: '/simple',
        icon: Sparkles,
        items: ['Human-readable', 'Plain language', 'Quick overview'],
      },
      {
        title: 'Information Architecture',
        description: 'Implementation architecture mapping',
        href: '/architecture',
        icon: Map,
        items: ['Responsibility → screen mapping', 'Implementation tracking', 'Coverage analysis'],
      },
      {
        title: 'DB Schema',
        description: 'Database schema and entity relationships',
        href: '/data-model',
        icon: TableProperties,
        items: ['Entity-relationship diagram', 'Table definitions', 'Foreign keys'],
      },
      {
        title: 'API Specs',
        description: 'Technical API endpoints and integration details',
        href: '/api-spec',
        icon: Code,
        items: ['Endpoint documentation', 'Request/response schemas', 'Authentication flows'],
      },
      {
        title: 'Screens List',
        description: 'UI screens needed for implementation',
        href: '/screens',
        icon: Layers,
        items: ['Generated from journeys', 'Screen inventory', 'Implementation checklist'],
      },
      {
        title: 'Components Repository',
        description: 'Frontend components library and showcase',
        href: '#',
        icon: FileCheck,
        items: ['External repo', 'Component library', '/dev showcase'],
        external: true,
      },
    ],
  },
]

export function HomeCards() {
  return (
    <div className="mx-auto max-w-7xl px-8 py-12">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          BRD Intent
        </h1>
        <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
          AI-powered intent model platform for structuring project requirements
        </p>
      </div>

      {/* What is the Intent Model */}
      <div className="mb-16">
        <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          What is the Intent Model?
        </h2>
        <div className="space-y-4 max-w-4xl">
          <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            The intent model breaks down business requirements into four simple questions: <strong>who</strong> uses the system (actors), <strong>what</strong> they work with (entities), <strong>how</strong> they get things done (journeys), and <strong>why</strong> certain rules exist (business rules and constraints).
          </p>
          <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Each piece is structured, cross-referenced, and machine-readable. This means you can search, validate, and auto-generate specifications instead of hunting through Word documents or Confluence pages.
          </p>
          <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Without this structure, requirements live in prose. Stakeholders write "users should be able to book slots," but which user? Which slots? Under what conditions? Traditional documents bury these details in paragraphs, making them hard to find, easy to misinterpret, and nearly impossible for AI to reason about accurately.
          </p>
          <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            AI tools can read prose, but they struggle with ambiguity and scattered context. When AI reads an intent model, it sees explicit relationships—this journey involves these actors, touches these entities, and must respect these rules. This precision helps AI suggest coherent changes, catch conflicts, and generate accurate specs instead of plausible-sounding nonsense.
          </p>
        </div>
      </div>

      {/* How it helps */}
      <div className="mb-16">
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-6" style={{ color: 'var(--text-muted)' }}>
          How it helps
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            className="p-6 rounded-lg"
            style={{
              background: 'var(--bg-white)',
              border: '1px solid var(--border-default)',
            }}
          >
            <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Engineering
            </h3>
            <div className="space-y-3">
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Get structured, unambiguous requirements. Entity relationships and business rules are explicit, not buried in paragraphs.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Journey steps map directly to user stories. API specs and data models are auto-generated from the same source, eliminating translation errors.
              </p>
            </div>
          </div>

          <div
            className="p-6 rounded-lg"
            style={{
              background: 'var(--bg-white)',
              border: '1px solid var(--border-default)',
            }}
          >
            <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Design
            </h3>
            <div className="space-y-3">
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Journey maps show every screen and interaction needed. Actor roles inform information architecture before wireframes start.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Entity attributes and business rules surface validation requirements, empty states, and error conditions early—so you design for reality, not idealized happy paths.
              </p>
            </div>
          </div>

          <div
            className="p-6 rounded-lg"
            style={{
              background: 'var(--bg-white)',
              border: '1px solid var(--border-default)',
            }}
          >
            <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Product
            </h3>
            <div className="space-y-3">
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Track consensus on each section. Identify gaps and conflicts early. Maintain a living specification that evolves as requirements change.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Open questions are flagged in context. The structured format makes it easy to scope releases by actor or journey without losing system coherence.
              </p>
            </div>
          </div>

          <div
            className="p-6 rounded-lg"
            style={{
              background: 'var(--bg-white)',
              border: '1px solid var(--border-default)',
            }}
          >
            <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              AI
            </h3>
            <div className="space-y-3">
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                AI can reason about the system holistically. It suggests changes that respect cross-references and generates test cases from journey steps.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                The structured model provides schema and constraints that keep AI coherent. Instead of hallucinating plausible-sounding requirements, AI stays grounded in actual system rules.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Card groups */}
      <div className="space-y-12">
        {cardGroups.map(group => (
          <div key={group.title}>
            <div className="mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                {group.title}
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {group.description}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {group.cards.map(card => {
                const Icon = card.icon
                const CardWrapper = card.external ? 'a' : Link
                return (
                  <CardWrapper
                    key={card.href}
                    href={card.href}
                    {...(card.external && { target: '_blank', rel: 'noopener noreferrer' })}
                    className="group block rounded-lg transition-all duration-200"
                    style={{
                      background: 'var(--bg-white)',
                      border: '1px solid var(--border-default)',
                      boxShadow: 'var(--shadow-subtle)',
                    }}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-200"
                          style={{
                            background: 'var(--bg-blue-subtle)',
                            color: 'var(--accent-blue)',
                          }}
                        >
                          <Icon size={20} />
                        </div>
                        {card.external ? (
                          <ExternalLink
                            size={18}
                            className="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                            style={{ color: 'var(--accent-blue)' }}
                          />
                        ) : (
                          <ArrowRight
                            size={18}
                            className="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                            style={{ color: 'var(--accent-blue)' }}
                          />
                        )}
                      </div>
                      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                        {card.title}
                      </h3>
                      <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                        {card.description}
                      </p>
                      {card.items && (
                        <ul className="space-y-1">
                          {card.items.map(item => (
                            <li key={item} className="text-xs flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                              <div className="h-1 w-1 rounded-full" style={{ background: 'var(--border-dark)' }} />
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </CardWrapper>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
