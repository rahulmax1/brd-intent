'use client'

import { useState, useRef } from 'react'
import type { IntentModel } from '@/domain/intent-model/types'

const SECTION_COLORS = {
  actors: { bg: '#8B5CF618', color: '#8B5CF6', label: 'Actor' },
  entities: { bg: '#0081F218', color: '#0081F2', label: 'Entity' },
  journeys: { bg: '#10B98118', color: '#10B981', label: 'Journey' },
  businessRules: { bg: '#F59E0B18', color: '#F59E0B', label: 'Rule' },
  constraints: { bg: '#EF444418', color: '#EF4444', label: 'Constraint' },
  openQuestions: { bg: '#EC489918', color: '#EC4899', label: 'Question' },
  integrations: { bg: '#6B728018', color: '#6B7280', label: 'Integration' },
} as const

// Enhanced typography tokens for documentation/data UI context
const TYPOGRAPHY_TOKENS = `
  --text-xs: 0.75rem;      /* 12px - labels, metadata */
  --text-sm: 0.875rem;     /* 14px - captions, small body */
  --text-base: 1rem;       /* 16px - body text */
  --text-md: 1.125rem;     /* 18px - large body */
  --text-lg: 1.25rem;      /* 20px - H4 */
  --text-xl: 1.5rem;       /* 24px - H3 */
  --text-2xl: 1.75rem;     /* 28px - H2 */
  --text-3xl: 2rem;        /* 32px - H1 */

  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.6;

  --measure-narrow: 45ch;
  --measure-base: 65ch;
  --measure-wide: 75ch;

  --baseline: 4px;
  --space-section: 3rem;   /* 48px between major sections */
  --space-card: 1rem;      /* 16px between cards */
  --space-element: 0.75rem; /* 12px between elements */
`

type SectionKey = keyof typeof SECTION_COLORS

function SectionBadge({ section }: { section: SectionKey }) {
  const { bg, color, label } = SECTION_COLORS[section]
  return (
    <span
      className="inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ background: bg, color }}
    >
      {label}
    </span>
  )
}

function IdBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-block font-mono text-xs font-medium px-1.5 py-0.5 rounded"
      style={{ background: 'var(--bg-blue-subtle)', color: 'var(--accent-blue)' }}
    >
      {children}
    </span>
  )
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 py-2">
      <span style={{
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--text-muted)',
        width: 120,
        flexShrink: 0,
        lineHeight: 'var(--leading-normal)'
      }}>{label}</span>
      <span style={{
        fontSize: 'var(--text-base)',
        lineHeight: 'var(--leading-relaxed)',
        color: 'var(--text-secondary)',
        maxWidth: 'var(--measure-base)'
      }}>{value}</span>
    </div>
  )
}

function SectionHeading({ title, count, section }: { title: string; count: number; section: SectionKey }) {
  const { color } = SECTION_COLORS[section]
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginTop: 'var(--space-section)',
      marginBottom: '1.5rem',
      paddingTop: 'var(--space-section)',
      borderTop: '1px solid var(--border-light)'
    }}>
      <div style={{
        height: 24,
        width: 3,
        borderRadius: 2,
        background: color,
        flexShrink: 0
      }} />
      <h2 style={{
        fontSize: 'var(--text-2xl)',
        fontWeight: 600,
        lineHeight: 'var(--leading-tight)',
        color: 'var(--text-primary)',
        margin: 0,
        letterSpacing: '-0.01em'
      }}>{title}</h2>
      <span style={{
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
        padding: '4px 10px',
        borderRadius: 12,
        background: 'var(--bg-gray-subtle)',
        color: 'var(--text-muted)'
      }}>
        {count}
      </span>
    </div>
  )
}

function Card({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <div
      id={id}
      style={{
        marginBottom: 'var(--space-card)',
        padding: '1.5rem',
        background: 'var(--bg-white)',
        border: '1px solid var(--border-default)',
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'box-shadow 200ms ease',
      }}
    >
      {children}
    </div>
  )
}

function StatePill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="rounded px-2 py-0.5 text-xs font-mono font-medium"
      style={{ background: 'var(--bg-gray-subtle)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
    >
      {children}
    </span>
  )
}

export function ModelReader({ model }: { model: IntentModel }) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)

  const toggle = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
      <div ref={containerRef} className="h-full overflow-y-auto custom-scroll" style={{
        background: 'var(--bg-page)',
        fontKerning: 'normal',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale'
      }}>
        <style dangerouslySetInnerHTML={{ __html: `:root { ${TYPOGRAPHY_TOKENS} }` }} />
        <div style={{
          maxWidth: 'var(--measure-wide)',
          margin: '0 auto',
          padding: '3rem 2rem'
        }}>
        {/* Header */}
        <div style={{ marginBottom: 'var(--space-section)' }}>
          <h1 style={{
            fontSize: 'var(--text-3xl)',
            fontWeight: 600,
            lineHeight: 'var(--leading-tight)',
            color: 'var(--acfs-navy)',
            margin: 0,
            letterSpacing: '-0.02em'
          }}>
            {model.meta?.project ?? 'Intent Model'}
          </h1>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginTop: '0.75rem',
            fontSize: 'var(--text-sm)',
            lineHeight: 'var(--leading-normal)'
          }}>
            <span style={{
              fontWeight: 600,
              color: 'var(--accent-blue)',
              fontVariantNumeric: 'tabular-nums'
            }}>
              v{model.meta?.version ?? 1}
            </span>
            <span style={{
              textTransform: 'capitalize',
              color: 'var(--text-muted)'
            }}>
              {model.meta?.status ?? 'draft'}
            </span>
            {model.meta?.lastUpdated && (
            <span style={{
              color: 'var(--text-muted)',
              fontVariantNumeric: 'tabular-nums'
            }}>
              Updated {model.meta.lastUpdated}
            </span>
            )}
          </div>
        </div>

        {/* Table of contents */}
        <div style={{
          marginBottom: '2.5rem',
          padding: '1.5rem',
          background: 'var(--bg-white)',
          border: '1px solid var(--border-default)',
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <p style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '1rem',
            color: 'var(--text-muted)'
          }}>Contents</p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.5rem'
          }}>
            {([
              ['actors', 'Actors', model.actors.length],
              ['entities', 'Entities', model.entities.filter(e => !e.is_integration).length],
              ['integrations', 'Integrations', model.entities.filter(e => !!e.is_integration).length],
              ['journeys', 'Journeys', model.journeys.length],
              ['businessRules', 'Business Rules', model.businessRules.length],
              ['constraints', 'Constraints', (model.constraints ?? []).length],
              ['openQuestions', 'Open Questions', (model.openQuestions ?? []).length],
            ] as const).map(([key, label, count]) => (
              <a
                key={key}
                href={`#section-${key}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 8,
                  fontSize: 'var(--text-sm)',
                  fontWeight: 500,
                  lineHeight: 'var(--leading-normal)',
                  textDecoration: 'none',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-gray-subtle)',
                  transition: 'all 200ms ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-blue-subtle)'
                  e.currentTarget.style.color = 'var(--accent-blue)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-gray-subtle)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }}
              >
                <SectionBadge section={key} />
                {label}
                <span style={{
                  marginLeft: 'auto',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  fontVariantNumeric: 'tabular-nums'
                }}>{count}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Actors */}
        <div id="section-actors" className="mb-10">
          <SectionHeading title="Actors" count={model.actors.length} section="actors" />
          {model.actors.map(actor => (
            <Card key={actor.id} id={`actor-${actor.id}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <SectionBadge section="actors" />
                <h3 style={{
                  fontSize: 'var(--text-lg)',
                  fontWeight: 600,
                  lineHeight: 'var(--leading-tight)',
                  color: 'var(--text-primary)',
                  margin: 0
                }}>{actor.name}</h3>
              </div>
              <p style={{
                fontSize: 'var(--text-base)',
                lineHeight: 'var(--leading-relaxed)',
                color: 'var(--text-secondary)',
                maxWidth: 'var(--measure-base)',
                marginBottom: '1.25rem'
              }}>{actor.description}</p>
              {actor.auth && <FieldRow label="Auth" value={actor.auth} />}
              <div style={{ marginTop: '1.25rem' }}>
                <p style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.75rem',
                  color: 'var(--text-muted)'
                }}>
                  Responsibilities ({actor.responsibilities?.length ?? 0})
                </p>
                {(actor.responsibilities ?? []).map(r => (
                  <div key={r.id} style={{
                    paddingTop: '1rem',
                    paddingBottom: '1rem',
                    borderBottom: '1px solid var(--border-default)'
                  }}>
                    <IdBadge>{r.id}</IdBadge>
                    <p style={{
                      fontSize: 'var(--text-base)',
                      lineHeight: 'var(--leading-relaxed)',
                      marginTop: '0.5rem',
                      marginBottom: 0,
                      color: 'var(--text-secondary)',
                      maxWidth: 'var(--measure-base)'
                    }}>{r.description}</p>
                    {r.warn && <p style={{
                      fontSize: 'var(--text-sm)',
                      lineHeight: 'var(--leading-normal)',
                      marginTop: '0.5rem',
                      marginBottom: 0,
                      padding: '0.5rem 0.75rem',
                      borderRadius: 6,
                      background: 'rgba(245,158,11,0.08)',
                      color: '#92400E'
                    }}>{r.warn}</p>}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Entities */}
        <div id="section-entities" className="mb-10">
          <SectionHeading title="Entities" count={model.entities.filter(e => !e.is_integration).length} section="entities" />
          {model.entities.filter(e => !e.is_integration).map((entity) => {
            const isExpanded = expandedSections.has(entity.id)
            return (
              <Card key={entity.id} id={`entity-${entity.id}`}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.75rem'
                }}>
                  <SectionBadge section="entities" />
                  <h3 style={{
                    fontSize: 'var(--text-lg)',
                    fontWeight: 600,
                    lineHeight: 'var(--leading-tight)',
                    color: 'var(--text-primary)',
                    margin: 0
                  }}>{entity.name}</h3>
                  <span style={{
                    fontSize: 'var(--text-xs)',
                    marginLeft: 'auto',
                    color: 'var(--text-muted)',
                    fontVariantNumeric: 'tabular-nums'
                  }}>
                    {entity.key_fields?.length ?? 0} fields · {entity.lifecycle?.states?.length ?? 0} states
                  </span>
                </div>
                <p style={{
                  fontSize: 'var(--text-base)',
                  lineHeight: 'var(--leading-relaxed)',
                  color: 'var(--text-secondary)',
                  maxWidth: 'var(--measure-base)',
                  marginBottom: '1rem'
                }}>{entity.description}</p>

                <button
                  type="button"
                  onClick={() => toggle(entity.id)}
                  className="text-xs font-medium mb-2"
                  style={{ color: 'var(--accent-blue)' }}
                >
                  {isExpanded ? '▾ Hide details' : '▸ Show fields & lifecycle'}
                </button>

                {isExpanded && (
                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <p style={{
                        fontSize: 'var(--text-xs)',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.75rem',
                        color: 'var(--text-muted)'
                      }}>Fields</p>
                      {(entity.key_fields ?? []).map(f => (
                        <div key={f.name} style={{
                          paddingTop: '1rem',
                          paddingBottom: '1rem',
                          borderBottom: '1px solid var(--border-default)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                            <span style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 'var(--text-sm)',
                              fontWeight: 500,
                              color: 'var(--text-primary)'
                            }}>{f.name}</span>
                            <span style={{
                              fontSize: '0.6875rem',
                              fontWeight: 500,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: 'var(--bg-blue-subtle)',
                              color: 'var(--accent-blue)'
                            }}>{f.type}</span>
                          </div>
                          <p style={{
                            fontSize: 'var(--text-base)',
                            lineHeight: 'var(--leading-relaxed)',
                            margin: 0,
                            color: 'var(--text-secondary)',
                            maxWidth: 'var(--measure-base)'
                          }}>{f.description}</p>
                          {f.warn && <p style={{
                            fontSize: 'var(--text-sm)',
                            lineHeight: 'var(--leading-normal)',
                            marginTop: '0.5rem',
                            marginBottom: 0,
                            padding: '0.5rem 0.75rem',
                            borderRadius: 6,
                            background: 'rgba(245,158,11,0.08)',
                            color: '#92400E'
                          }}>{f.warn}</p>}
                        </div>
                      ))}
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Lifecycle</p>
                      <div className="flex flex-wrap items-center gap-1 mb-3">
                        {(entity.lifecycle?.states ?? []).map((s, i) => (
                          <span key={s} className="flex items-center gap-1">
                            <StatePill>{s}</StatePill>
                            {i < (entity.lifecycle?.states?.length ?? 0) - 1 && <span style={{ color: 'var(--text-muted)' }}>→</span>}
                          </span>
                        ))}
                      </div>
                      {(entity.lifecycle?.transitions?.length ?? 0) > 0 && (
                        <div className="space-y-2">
                          {(entity.lifecycle?.transitions ?? []).map((t, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs py-1.5" style={{ borderBottom: '1px solid var(--border-default)' }}>
                              <StatePill>{t.from}</StatePill>
                              <span style={{ color: 'var(--text-muted)' }}>→</span>
                              <StatePill>{t.to}</StatePill>
                              <span className="flex-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t.trigger}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>

        {/* Integrations */}
        <div id="section-integrations" className="mb-10">
          <SectionHeading title="Integrations" count={model.entities.filter(e => !!e.is_integration).length} section="entities" />
          {model.entities.filter(e => !!e.is_integration).map(entity => (
            <Card key={entity.id} id={`entity-${entity.id}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md" style={{ background: 'var(--bg-gray-subtle)', color: 'var(--text-muted)' }}>Integration</span>
                <h3 className="text-sm font-bold m-0" style={{ color: 'var(--text-primary)' }}>{entity.name}</h3>
              </div>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>{entity.description}</p>
              {(entity.key_fields ?? []).map(f => (
                <div key={f.name} className="py-1.5" style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{f.name}</span>
                  </div>
                  <p className="text-xs leading-relaxed m-0" style={{ color: 'var(--text-secondary)' }}>{f.description}</p>
                  {f.warn && <p className="text-xs mt-1 mb-0 px-2 py-1 rounded" style={{ background: 'rgba(245,158,11,0.08)', color: '#92400E' }}>{f.warn}</p>}
                </div>
              ))}
            </Card>
          ))}
        </div>

        {/* Journeys */}
        <div id="section-journeys" className="mb-10">
          <SectionHeading title="Journeys" count={model.journeys.length} section="journeys" />
          {model.journeys.map(journey => (
            <Card key={journey.id} id={`journey-${journey.id}`}>
              <div className="flex items-center gap-2 mb-2">
                <SectionBadge section="journeys" />
                <h3 className="text-sm font-bold m-0" style={{ color: 'var(--text-primary)' }}>{journey.name}</h3>
              </div>
              {journey.primary_actor && <FieldRow label="Actor" value={journey.primary_actor} />}
              {(journey.preconditions?.length ?? 0) > 0 && (
                <div className="text-xs px-3 py-2 rounded-lg my-2" style={{ background: 'rgba(245,158,11,0.06)', color: '#92400E', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <span className="font-semibold">Preconditions: </span>{journey.preconditions?.join(' · ')}
                </div>
              )}
              <div className="mt-3">
                {(journey.steps ?? []).map(s => (
                  <div key={s.order} className="flex gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                      style={{ background: 'var(--bg-blue-subtle)', color: 'var(--accent-blue)' }}
                    >
                      {s.order}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{s.title}</span>
                      <p className="text-xs leading-relaxed mt-0.5 mb-0" style={{ color: 'var(--text-secondary)' }}>{s.detail}</p>
                      {s.warn && <p className="text-xs mt-1 mb-0 px-2 py-1 rounded" style={{ background: 'rgba(245,158,11,0.08)', color: '#92400E' }}>{s.warn}</p>}
                    </div>
                  </div>
                ))}
              </div>
              {journey.success_outcome && (
                <div className="mt-3 text-sm">
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Outcome: </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{journey.success_outcome}</span>
                </div>
              )}
              {journey.warn && <p className="text-xs mt-2 mb-0 px-2 py-1 rounded" style={{ background: 'rgba(245,158,11,0.08)', color: '#92400E' }}>{journey.warn}</p>}
            </Card>
          ))}
        </div>

        {/* Business Rules */}
        <div id="section-businessRules" className="mb-10">
          <SectionHeading title="Business Rules" count={model.businessRules.length} section="businessRules" />
          {model.businessRules.map(rule => (
            <Card key={rule.id} id={`rule-${rule.id}`}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.75rem'
              }}>
                <IdBadge>{rule.id}</IdBadge>
                <span style={{
                  fontSize: 'var(--text-xs)',
                  marginLeft: 'auto',
                  color: 'var(--text-muted)'
                }}>{rule.source ?? ''}</span>
              </div>
              <p style={{
                fontSize: 'var(--text-base)',
                lineHeight: 'var(--leading-relaxed)',
                marginBottom: '0.75rem',
                color: 'var(--text-primary)',
                maxWidth: 'var(--measure-base)'
              }}>{rule.description}</p>
              {(rule.applies_to?.length ?? 0) > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {(rule.applies_to ?? []).map(ref => (
                    <span key={ref} style={{
                      fontSize: '0.6875rem',
                      fontWeight: 500,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'var(--bg-gray-subtle)',
                      color: 'var(--text-muted)'
                    }}>{ref}</span>
                  ))}
                </div>
              )}
              {rule.warn && <p style={{
                fontSize: 'var(--text-sm)',
                lineHeight: 'var(--leading-normal)',
                marginTop: '0.75rem',
                marginBottom: 0,
                padding: '0.5rem 0.75rem',
                borderRadius: 6,
                background: 'rgba(245,158,11,0.08)',
                color: '#92400E'
              }}>{rule.warn}</p>}
            </Card>
          ))}
        </div>

        {/* Constraints */}
        <div id="section-constraints" className="mb-10">
          <SectionHeading title="Constraints" count={(model.constraints ?? []).length} section="constraints" />
          {(model.constraints ?? []).map(constraint => (
            <Card key={constraint.id} id={`constraint-${constraint.id}`}>
              <div className="flex items-center gap-2 mb-2">
                <IdBadge>{constraint.id}</IdBadge>
                {constraint.type && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-gray-subtle)', color: 'var(--text-muted)' }}>{constraint.type}</span>}
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{constraint.constraint ?? ''}</p>
            </Card>
          ))}
        </div>

        {/* Open Questions */}
        <div id="section-openQuestions" className="mb-10">
          <SectionHeading title="Open Questions" count={(model.openQuestions ?? []).length} section="openQuestions" />
          {(model.openQuestions ?? []).map(q => {
            const statusColor = q.status === 'resolved' ? '#10B981' : q.status === 'deferred' ? '#F59E0B' : q.status ? '#EF4444' : 'var(--text-muted)'
            return (
              <Card key={q.id} id={`question-${q.id}`}>
                <div className="flex items-center gap-2 mb-2">
                  <IdBadge>{q.id}</IdBadge>
                  <span
                    className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded"
                    style={{ background: `${statusColor}18`, color: statusColor }}
                  >
                    {q.status ?? 'open'}
                  </span>
                </div>
                <p className="text-sm font-semibold leading-relaxed mb-1" style={{ color: 'var(--text-primary)' }}>{q.question ?? ''}</p>
                <p className="text-sm leading-relaxed mb-0" style={{ color: 'var(--text-secondary)' }}>{q.reason ?? ''}</p>
                {q.resolution && (
                  <p className="text-xs mt-2 mb-0 px-2 py-1.5 rounded" style={{ background: 'rgba(37,186,59,0.08)', color: '#166534' }}>
                    <span className="font-semibold">Resolution: </span>{q.resolution}
                  </p>
                )}
              </Card>
            )
          })}
        </div>
        </div>
      </div>
  )
}
