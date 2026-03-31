import { getCurrentModel } from '@/lib/model-store'
import { matchDecisionsToSections } from '@/lib/brd-generator'
import type { DecisionMatch } from '@/lib/brd-generator'
import type { OpenQuestion } from '@/domain/intent-model/types'
import { BRDExportButtons } from './brd-export-buttons'
import { projectConfig } from '@/lib/project-config'
import { projectRequirements } from '@/domain/project-requirements/requirements'
import type { Assumption, NonFunctionalRequirement } from '@/domain/project-requirements/types'
import { generateFunctionalRequirements, groupFunctionalRequirements } from '@/lib/fr-generator'

export const dynamic = 'force-dynamic'

function DecisionCallout({ question }: { question: OpenQuestion }) {
  return (
    <div className="my-4 rounded-lg border border-blue-200 bg-blue-50/60 px-5 py-4">
      <p className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
        ✅ Decision ({question.id})
      </p>
      <p className="mt-1.5 text-[15px] leading-7" style={{ color: 'var(--text-secondary)' }}>{question.resolution}</p>
      <p className="mt-1.5 text-[13px] italic leading-6" style={{ color: 'var(--text-muted)' }}>{question.reason}</p>
    </div>
  )
}

function WarnCallout({ text }: { text: string }) {
  return (
    <div className="my-3 rounded-lg border border-amber-200 bg-amber-50/60 px-5 py-3.5">
      <p className="text-[14px] leading-6" style={{ color: 'var(--text-secondary)' }}>⚠️ {text}</p>
    </div>
  )
}

function EdgeCallout({ text }: { text: string }) {
  return (
    <div className="my-3 rounded-lg border border-slate-200 bg-slate-50/60 px-5 py-3.5">
      <p className="text-[14px] leading-6" style={{ color: 'var(--text-secondary)' }}>🔄 {text}</p>
    </div>
  )
}

function SectionDivider() {
  return <hr className="my-10 border-t" style={{ borderColor: 'var(--border-default)' }} />
}

function decisionsFor(decisions: DecisionMatch[], type: DecisionMatch['matchedType'], id: string) {
  return decisions
    .filter(d => d.matchedType === type && d.matchedId === id)
    .map(d => <DecisionCallout key={d.question.id} question={d.question} />)
}

export default async function BRDPage() {
  const model = await getCurrentModel()
  const decisions = matchDecisionsToSections(model)

  const journeysByActor = new Map<string, typeof model.journeys>()
  for (const j of model.journeys) {
    const group = journeysByActor.get(j.primary_actor) ?? []
    group.push(j)
    journeysByActor.set(j.primary_actor, group)
  }

  const constraintsByType = new Map<string, typeof model.constraints>()
  for (const c of model.constraints) {
    const group = constraintsByType.get(c.type) ?? []
    group.push(c)
    constraintsByType.set(c.type, group)
  }

  const openQs = model.openQuestions.filter(q => q.status === 'open' || q.status === 'deferred')
  const resolvedQs = model.openQuestions.filter(q => q.status === 'resolved')

  // Generate functional requirements
  const frs = generateFunctionalRequirements(model)
  const groupedFRs = groupFunctionalRequirements(frs)

  // Group assumptions by category
  const assumptionsByCategory = new Map<string, Assumption[]>()
  for (const assumption of projectRequirements.assumptions) {
    const group = assumptionsByCategory.get(assumption.category) ?? []
    group.push(assumption)
    assumptionsByCategory.set(assumption.category, group)
  }

  // Group NFRs by category
  const nfrsByCategory = new Map<string, NonFunctionalRequirement[]>()
  for (const nfr of projectRequirements.nfrs) {
    const group = nfrsByCategory.get(nfr.category) ?? []
    group.push(nfr)
    nfrsByCategory.set(nfr.category, group)
  }

  return (
    <div className="brd-print-root flex h-full flex-col overflow-hidden">
      {/* Header toolbar */}
      <div
        className="flex h-[54px] shrink-0 items-center justify-between border-b px-6 print:hidden"
        style={{ borderColor: 'var(--border-default)' }}
      >
        <div>
          <h2 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
            Business Requirements Document
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            v{model.meta.version} — {model.meta.status}
          </p>
        </div>
        <BRDExportButtons version={model.meta.version} />
      </div>

      {/* Scrollable BRD content */}
      <div className="brd-print-scroll flex-1 overflow-y-auto custom-scroll">
        <div className="brd-prose mx-auto max-w-[780px] px-10 py-10 print:max-w-none print:px-0">

          {/* Header */}
          <h1 className="text-2xl font-bold" style={{ color: 'var(--acfs-navy)' }}>
            {model.meta.project}
          </h1>
          <h2 className="mt-1 text-lg font-normal" style={{ color: 'var(--text-secondary)' }}>
            Business Requirements Document
          </h2>
          <div className="mt-4 flex gap-6 text-sm" style={{ color: 'var(--text-muted)' }}>
            <span>Version {model.meta.version}</span>
            <span>Status: {model.meta.status}</span>
            <span>Updated: {model.meta.lastUpdated}</span>
          </div>

          <SectionDivider />

          {/* 1. Purpose & Scope */}
          <section className="print:break-before-auto">
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--acfs-navy)' }}>
              1. Purpose & Scope
            </h2>
            <p className="text-[15px] leading-7" style={{ color: 'var(--text-secondary)' }}>
              {projectConfig.brd.introText.replace('{project}', model.meta.project)}{' '}
              {projectConfig.brd.scopeText}
            </p>
          </section>

          <SectionDivider />

          {/* 2. Actors */}
          <section className="print:break-before-auto">
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--acfs-navy)' }}>
              2. Actors — Who Is Involved
            </h2>
            {model.actors.map(actor => (
              <div key={actor.id} className="mb-10">
                <h3 className="text-[17px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  {actor.name}
                </h3>
                <p className="text-[15px] leading-7 mb-3" style={{ color: 'var(--text-secondary)' }}>{actor.description}</p>
                <p className="text-[15px] leading-7 mb-4" style={{ color: 'var(--text-muted)' }}>
                  <strong>Authentication:</strong> {actor.auth}
                </p>
                <p className="text-[15px] font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Responsibilities:</p>
                <ol className="list-decimal pl-6 space-y-2.5 text-[15px] leading-7" style={{ color: 'var(--text-secondary)' }}>
                  {actor.responsibilities.map(r => (
                    <li key={r.id} className="pl-1">
                      {r.description}
                      {r.warn && <WarnCallout text={r.warn} />}
                      {r.edge && <EdgeCallout text={r.edge} />}
                    </li>
                  ))}
                </ol>
                {decisionsFor(decisions, 'actor', actor.id)}
              </div>
            ))}
          </section>

          <SectionDivider />

          {/* 3. Entities */}
          <section className="print:break-before-auto">
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--acfs-navy)' }}>
              3. Entities — Key Data with Lifecycle
            </h2>
            {model.entities.filter(e => !e.is_integration).map(entity => (
              <div key={entity.id} className="mb-10">
                <h3 className="text-[17px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  {entity.name}
                </h3>
                <p className="text-[15px] leading-7 mb-4" style={{ color: 'var(--text-secondary)' }}>{entity.description}</p>

                {entity.key_fields.length > 0 && (
                  <>
                    <p className="text-[15px] font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Key Fields:</p>
                    <table className="mb-5 w-full text-[14px] leading-6 border-collapse" style={{ tableLayout: 'fixed' }}>
                      <colgroup>
                        <col style={{ width: '22%' }} />
                        <col style={{ width: '18%' }} />
                        <col style={{ width: '60%' }} />
                      </colgroup>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-default)' }}>
                          <th className="py-2 pr-4 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Field</th>
                          <th className="py-2 pr-4 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Type</th>
                          <th className="py-2 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entity.key_fields.map(f => (
                          <tr key={f.name} style={{ borderBottom: '1px solid var(--border-default)' }}>
                            <td className="py-2 pr-4 font-mono text-xs break-all" style={{ color: 'var(--text-primary)' }}>{f.name}</td>
                            <td className="py-2 pr-4 break-words" style={{ color: 'var(--text-muted)' }}>{f.type}</td>
                            <td className="py-2 break-words" style={{ color: 'var(--text-secondary)' }}>
                              {f.description}
                              {f.warn && <WarnCallout text={f.warn} />}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}

                {entity.lifecycle.states.length > 0 && (
                  <>
                    <p className="text-[15px] font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Lifecycle States:</p>
                    <div className="mb-4 flex flex-wrap gap-2">
                      {entity.lifecycle.states.map(s => (
                        <span key={s} className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: 'var(--bg-card-gray)', color: 'var(--text-secondary)' }}>
                          {s}
                        </span>
                      ))}
                    </div>
                    {entity.lifecycle.warn && <WarnCallout text={entity.lifecycle.warn} />}
                  </>
                )}

                {entity.lifecycle.transitions.length > 0 && (
                  <>
                    <p className="text-[15px] font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Transitions:</p>
                    <table className="mb-5 w-full text-[14px] leading-6 border-collapse" style={{ tableLayout: 'fixed' }}>
                      <colgroup>
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '40%' }} />
                        <col style={{ width: '30%' }} />
                      </colgroup>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-default)' }}>
                          <th className="py-2 pr-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>From</th>
                          <th className="py-2 pr-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>To</th>
                          <th className="py-2 pr-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Trigger</th>
                          <th className="py-2 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Guard</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entity.lifecycle.transitions.map((t, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border-default)' }}>
                            <td className="py-2 pr-3 break-words" style={{ color: 'var(--text-secondary)' }}>{t.from}</td>
                            <td className="py-2 pr-3 break-words" style={{ color: 'var(--text-secondary)' }}>{t.to}</td>
                            <td className="py-2 pr-3 break-words" style={{ color: 'var(--text-secondary)' }}>{t.trigger}</td>
                            <td className="py-2 break-words" style={{ color: 'var(--text-muted)' }}>{t.guard ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}

                {decisionsFor(decisions, 'entity', entity.id)}
              </div>
            ))}
          </section>

          {/* 3b. Integrations */}
          {model.entities.some(e => e.is_integration) && (
            <section className="mt-8">
              <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
                Integrations
              </h3>
              {model.entities.filter(e => e.is_integration).map(entity => (
                <div key={entity.id} className="mb-6">
                  <h4 className="text-[15px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{entity.name}</h4>
                  <p className="text-[14px] leading-7 mb-3" style={{ color: 'var(--text-secondary)' }}>{entity.description}</p>
                  {entity.key_fields.length > 0 && (
                    <table className="mb-3 w-full text-[14px] leading-6 border-collapse">
                      <tbody>
                        {entity.key_fields.map(f => (
                          <tr key={f.name} style={{ borderBottom: '1px solid var(--border-default)' }}>
                            <td className="py-2 pr-4 font-medium whitespace-nowrap align-top" style={{ color: 'var(--text-primary)', width: '20%' }}>{f.name}</td>
                            <td className="py-2" style={{ color: 'var(--text-secondary)' }}>{f.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {entity.lifecycle.warn && <WarnCallout text={entity.lifecycle.warn} />}
                </div>
              ))}
            </section>
          )}

          <SectionDivider />

          {/* 4. User Journeys */}
          <section className="print:break-before-auto">
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--acfs-navy)' }}>
              4. User Journeys
            </h2>
            {Array.from(journeysByActor.entries()).map(([actorId, journeys]) => {
              const actor = model.actors.find(a => a.id === actorId)
              return (
                <div key={actorId} className="mb-10">
                  <h3 className="text-[17px] font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>
                    {actor?.name ?? actorId} Journeys
                  </h3>
                  {journeys.map(journey => (
                    <div key={journey.id} className="mb-8 pl-5" style={{ borderLeft: '2px solid var(--border-default)' }}>
                      <h4 className="text-[15px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                        {journey.name}
                      </h4>
                      {journey.warn && <WarnCallout text={journey.warn} />}

                      {journey.preconditions.length > 0 && (
                        <div className="mb-4">
                          <p className="text-[13px] font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Preconditions:</p>
                          <ul className="list-disc pl-6 text-[15px] leading-7 space-y-1" style={{ color: 'var(--text-secondary)' }}>
                            {journey.preconditions.map((p, i) => <li key={i} className="pl-1">{p}</li>)}
                          </ul>
                        </div>
                      )}

                      <ol className="list-decimal pl-6 space-y-3 text-[15px] leading-7" style={{ color: 'var(--text-secondary)' }}>
                        {journey.steps.map(step => (
                          <li key={step.order} className="pl-1">
                            <strong>{step.title}</strong> — {step.detail}
                            {step.precondition && (
                              <span className="text-[13px] italic" style={{ color: 'var(--text-muted)' }}> (Requires: {step.precondition})</span>
                            )}
                            {step.warn && <WarnCallout text={step.warn} />}
                            {step.edge && <EdgeCallout text={step.edge} />}
                          </li>
                        ))}
                      </ol>

                      <p className="mt-4 text-[15px] leading-7" style={{ color: 'var(--text-muted)' }}>
                        <strong>Outcome:</strong> {journey.success_outcome}
                      </p>

                      {decisionsFor(decisions, 'journey', journey.id)}
                    </div>
                  ))}
                </div>
              )
            })}
          </section>

          <SectionDivider />

          {/* 5. Business Rules */}
          <section className="print:break-before-auto">
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--acfs-navy)' }}>
              5. Business Rules
            </h2>
            <div className="space-y-5">
              {model.businessRules.map(rule => (
                <div key={rule.id} className="rounded-lg p-5" style={{ background: 'var(--bg-card-gray)' }}>
                  <p className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {rule.id}
                  </p>
                  <p className="mt-2 text-[15px] leading-7" style={{ color: 'var(--text-secondary)' }}>{rule.description}</p>
                  <div className="mt-3 flex gap-6 text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    <span>Applies to: {rule.applies_to.join(', ')}</span>
                    <span>Source: {rule.source}</span>
                  </div>
                  {rule.warn && <WarnCallout text={rule.warn} />}
                </div>
              ))}
            </div>
          </section>

          <SectionDivider />

          {/* 6. Constraints */}
          <section>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--acfs-navy)' }}>
              6. Constraints
            </h2>
            {Array.from(constraintsByType.entries()).map(([type, constraints]) => (
              <div key={type} className="mb-6">
                <h3 className="text-[15px] font-semibold mb-3 capitalize" style={{ color: 'var(--text-primary)' }}>
                  {type}
                </h3>
                <ul className="list-disc pl-6 space-y-2 text-[15px] leading-7" style={{ color: 'var(--text-secondary)' }}>
                  {constraints.map(c => (
                    <li key={c.id} className="pl-1"><strong>{c.id}:</strong> {c.constraint}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          <div className="print:hidden">
            <SectionDivider />
          </div>

          {/* 7. Open Questions & Decision Log — visible on screen only */}
          <section className="print:hidden">
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--acfs-navy)' }}>
              7. Open Questions & Decision Log
            </h2>

            {openQs.length > 0 && (
              <>
                <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  7a. Open Questions
                </h3>
                <div className="space-y-4 mb-10">
                  {openQs.map(q => (
                    <div key={q.id} className="rounded-lg border p-5" style={{ borderColor: 'var(--border-default)' }}>
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>{q.id}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                          q.status === 'deferred'
                            ? 'bg-slate-100 text-slate-500'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {q.status}
                        </span>
                      </div>
                      <p className="text-[15px] leading-7" style={{ color: 'var(--text-secondary)' }}>{q.question}</p>
                      <p className="mt-2 text-[13px] italic leading-6" style={{ color: 'var(--text-muted)' }}>{q.reason}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {resolvedQs.length > 0 && (
              <>
                <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  7b. Decision Log
                </h3>
                <div className="space-y-4">
                  {resolvedQs.map(q => (
                    <div key={q.id} className="rounded-lg p-5" style={{ background: 'var(--bg-card-gray)' }}>
                      <span className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>{q.id}</span>
                      <p className="text-[15px] leading-7 mt-1" style={{ color: 'var(--text-secondary)' }}>{q.question}</p>
                      <p className="mt-2 text-[15px] leading-7 font-medium" style={{ color: 'var(--accent-blue)' }}>{q.resolution}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          <SectionDivider />

          {/* 8. Functional Requirements */}
          <section className="print:break-before-auto">
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--acfs-navy)' }}>
              8. Functional Requirements
            </h2>
            <p className="text-[14px] italic leading-6 mb-6" style={{ color: 'var(--text-muted)' }}>
              Functional requirements are auto-generated from actor responsibilities for traceability.
            </p>

            {groupedFRs.lsp.length > 0 && (
              <div className="mb-8">
                <h3 className="text-[17px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  8.1 LSP Functional Requirements
                </h3>
                <div className="space-y-4">
                  {groupedFRs.lsp.map(fr => (
                    <div key={fr.id} className="pl-5" style={{ borderLeft: '2px solid var(--border-default)' }}>
                      <p className="text-[15px] leading-7" style={{ color: 'var(--text-secondary)' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{fr.id}:</strong> {fr.description}
                      </p>
                      <p className="mt-1 text-[13px] italic leading-6" style={{ color: 'var(--text-muted)' }}>
                        Derived from: {fr.mapped_to.join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {groupedFRs.admin.length > 0 && (
              <div className="mb-8">
                <h3 className="text-[17px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  8.2 ACFS Admin Functional Requirements
                </h3>
                <div className="space-y-4">
                  {groupedFRs.admin.map(fr => (
                    <div key={fr.id} className="pl-5" style={{ borderLeft: '2px solid var(--border-default)' }}>
                      <p className="text-[15px] leading-7" style={{ color: 'var(--text-secondary)' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{fr.id}:</strong> {fr.description}
                      </p>
                      <p className="mt-1 text-[13px] italic leading-6" style={{ color: 'var(--text-muted)' }}>
                        Derived from: {fr.mapped_to.join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <SectionDivider />

          {/* 9. Assumptions */}
          <section className="print:break-before-auto">
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--acfs-navy)' }}>
              9. Assumptions
            </h2>
            {Array.from(assumptionsByCategory.entries()).map(([category, assumptions]) => (
              <div key={category} className="mb-8">
                <h3 className="text-[17px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  {category}
                </h3>
                <div className="space-y-4">
                  {assumptions.map(a => (
                    <div key={a.id} className="pl-5" style={{ borderLeft: '2px solid var(--border-default)' }}>
                      <p className="text-[15px] leading-7" style={{ color: 'var(--text-secondary)' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{a.id}:</strong> {a.assumption}
                      </p>
                      {a.rationale && (
                        <p className="mt-1 text-[13px] italic leading-6" style={{ color: 'var(--text-muted)' }}>
                          Rationale: {a.rationale}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <SectionDivider />

          {/* 10. Dependencies and Ownership */}
          <section className="print:break-before-auto">
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--acfs-navy)' }}>
              10. Dependencies and Ownership
            </h2>
            <div className="space-y-8">
              {projectRequirements.dependencies.map(dep => (
                <div key={dep.id} className="rounded-lg p-5" style={{ background: 'var(--bg-card-gray)' }}>
                  <h3 className="text-[17px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                    {dep.name}
                  </h3>
                  <p className="text-[15px] leading-7 mb-3" style={{ color: 'var(--text-secondary)' }}>
                    <strong>Dependency:</strong> {dep.description}
                  </p>
                  <p className="text-[15px] leading-7 mb-2" style={{ color: 'var(--text-secondary)' }}>
                    <strong>Owner:</strong> {dep.owner}
                  </p>
                  {dep.status && (
                    <p className="text-[15px] leading-7 mb-2" style={{ color: 'var(--text-secondary)' }}>
                      <strong>Status:</strong>{' '}
                      <span className="capitalize">{dep.status}</span>
                    </p>
                  )}
                  {dep.risk && (
                    <p className="text-[15px] leading-7" style={{ color: 'var(--text-secondary)' }}>
                      <strong>Risk:</strong>{' '}
                      <span className={`capitalize ${
                        dep.risk === 'high' ? 'text-amber-700' :
                        dep.risk === 'medium' ? 'text-yellow-700' :
                        'text-green-700'
                      }`}>
                        {dep.risk}
                      </span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          <SectionDivider />

          {/* 11. High-Level Non-Functional Expectations */}
          <section className="print:break-before-auto">
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--acfs-navy)' }}>
              11. High-Level Non-Functional Expectations
            </h2>
            {Array.from(nfrsByCategory.entries()).map(([category, nfrs]) => (
              <div key={category} className="mb-8">
                <h3 className="text-[17px] font-semibold mb-4 capitalize" style={{ color: 'var(--text-primary)' }}>
                  {category}
                </h3>
                <div className="space-y-4">
                  {nfrs.map(nfr => (
                    <div key={nfr.id} className="pl-5" style={{ borderLeft: '2px solid var(--border-default)' }}>
                      <p className="text-[15px] leading-7" style={{ color: 'var(--text-secondary)' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{nfr.id}:</strong> {nfr.requirement}
                      </p>
                      {nfr.target && (
                        <p className="mt-1 text-[13px] italic leading-6" style={{ color: 'var(--text-muted)' }}>
                          Target: {nfr.target}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {/* Print footer */}
          <div className="hidden print:block mt-12 pt-4 border-t text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            Generated from Intent Model v{model.meta.version} on {new Date().toISOString().split('T')[0]}
          </div>

        </div>
      </div>
    </div>
  )
}
