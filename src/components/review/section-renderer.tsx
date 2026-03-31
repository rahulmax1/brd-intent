'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { StatusBadge, WarnIndicator, EdgeIndicator } from './status-badge'
import { ReviewControls } from './review-controls'
import { HelpTip } from './help-tip'
import { AbbrText } from './abbr-text'
import type { SectionReview } from '@/domain/intent-model/types'
import type {
  Actor, Entity, Journey, BusinessRule, Constraint, OpenQuestion, SectionType
} from '@/domain/intent-model/types'


type SectionRendererProps = {
  item: Actor | Entity | Journey | BusinessRule | Constraint | OpenQuestion
  type: SectionType
  review: SectionReview
}

const sectionTypeExplanations: Record<SectionType, string> = {
  actor: 'A person or role that interacts with the system. Each actor has specific responsibilities.',
  entity: 'A core data object in the system that has fields and goes through lifecycle stages.',
  journey: 'A step-by-step flow showing how an actor completes a task in the system.',
  business_rule: 'A rule the system must enforce — something that must always be true.',
  constraint: 'A limit on the system — capacity, pricing, access, or compliance boundaries.',
  open_question: 'Something that still needs to be decided or clarified before building.',
}

/* ---------- Shared sub-components ---------- */

function FieldRow({ label, value, warn, edge }: { label: string; value: string; warn?: string; edge?: string }) {
  return (
    <div className="row-border flex gap-3 py-2 items-start">
      <span className="text-sm font-semibold min-w-[160px] shrink-0" style={{ color: 'var(--text-primary)' }}>{label.includes(':') ? label.toUpperCase() : label}</span>
      <span className="text-sm leading-relaxed flex-1" style={{ color: 'var(--text-secondary)' }}>
        <AbbrText text={value} />
        {warn && <WarnIndicator text={warn} />}
        {edge && <EdgeIndicator text={edge} />}
      </span>
    </div>
  )
}

function StateBadge({ children }: { children: React.ReactNode; variant?: string }) {
  return (
    <span
      className="inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold"
      style={{ background: 'var(--bg-blue-subtle)', color: 'var(--accent-blue)', border: '1px solid rgba(0,129,242,0.15)' }}
    >
      {children}
    </span>
  )
}

/* ---------- Section renderers ---------- */

function ActorRenderer({ actor }: { actor: Actor }) {
  return (
    <div>
      <FieldRow label="Description" value={actor.description} />
      <FieldRow label="Auth" value={actor.auth} />
      {actor.responsibilities.map(r => (
        <FieldRow key={r.id} label={r.id} value={r.description} warn={r.warn} edge={r.edge} />
      ))}
    </div>
  )
}

function EntityRenderer({ entity }: { entity: Entity }) {
  const [showTransitions, setShowTransitions] = useState(false)

  return (
    <div className="space-y-4">
      {/* Fields as a clean table */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Fields</p>
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
              <th className="py-1.5 pr-3 text-left font-medium" style={{ color: 'var(--text-muted)', width: '140px' }}>Name</th>
              <th className="py-1.5 pr-3 text-left font-medium" style={{ color: 'var(--text-muted)', width: '120px' }}>Type</th>
              <th className="py-1.5 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {entity.key_fields.map((f, i) => (
              <tr key={f.name} style={{ borderBottom: i < entity.key_fields.length - 1 ? '1px solid var(--border-default)' : 'none' }}>
                <td className="py-2 pr-3 align-top font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{f.name}</td>
                <td className="py-2 pr-3 align-top"><StateBadge>{f.type}</StateBadge></td>
                <td className="py-2 align-top leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <AbbrText text={f.description} />
                  {f.warn && <WarnIndicator text={f.warn} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Lifecycle — states as flow, transitions collapsible */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
          Lifecycle — {entity.lifecycle.states.length} states, {entity.lifecycle.transitions.length} transitions
        </p>
        <div className="flex flex-wrap items-center gap-1 mb-2">
          {entity.lifecycle.states.map((s, i) => (
            <span key={s} className="flex items-center gap-1">
              <span
                className="rounded px-2 py-0.5 text-xs font-mono font-medium"
                style={{ background: 'var(--bg-gray-subtle)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
              >
                {s}
              </span>
              {i < entity.lifecycle.states.length - 1 && <span style={{ color: 'var(--text-muted)' }}>→</span>}
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowTransitions(!showTransitions)}
          className="text-xs font-medium transition-colors duration-200"
          style={{ color: 'var(--accent-blue)' }}
        >
          {showTransitions ? '▾ Hide transitions' : '▸ Show transitions'}
        </button>

        {showTransitions && (
          <table className="mt-2 w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                <th className="py-1.5 pr-2 text-left font-medium" style={{ color: 'var(--text-muted)', width: '100px' }}>From</th>
                <th className="py-1.5 pr-2 text-left font-medium" style={{ color: 'var(--text-muted)', width: '100px' }}>To</th>
                <th className="py-1.5 pr-2 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Trigger</th>
                <th className="py-1.5 text-left font-medium" style={{ color: 'var(--text-muted)', width: '180px' }}>Guard</th>
              </tr>
            </thead>
            <tbody>
              {entity.lifecycle.transitions.map((t, i) => (
                <tr key={i} style={{ borderBottom: i < entity.lifecycle.transitions.length - 1 ? '1px solid var(--border-default)' : 'none' }}>
                  <td className="py-2 pr-2 align-top font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{t.from}</td>
                  <td className="py-2 pr-2 align-top font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{t.to}</td>
                  <td className="py-2 pr-2 align-top leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    <AbbrText text={t.trigger} />
                    {t.warn && <WarnIndicator text={t.warn} />}
                  </td>
                  <td className="py-2 align-top text-xs" style={{ color: 'var(--text-muted)', fontStyle: t.guard ? 'normal' : 'italic' }}>
                    {t.guard || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function JourneyRenderer({ journey }: { journey: Journey }) {
  return (
    <div className="space-y-4">
      <FieldRow label="Primary actor" value={journey.primary_actor} />

      {journey.preconditions.length > 0 && (
        <div className="text-sm px-3 py-2 rounded-lg" style={{ background: 'rgba(245,158,11,0.06)', color: '#92400E', border: '1px solid rgba(245,158,11,0.15)' }}>
          <span className="font-semibold">Preconditions: </span>
          {journey.preconditions.join(' · ')}
        </div>
      )}

      <div>
        {journey.steps.map(s => (
          <div key={s.order} className="row-border flex gap-3 py-3">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: 'var(--bg-blue-subtle)', color: 'var(--accent-blue)' }}
            >
              {s.order}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{s.title}</span>
                {s.warn && <WarnIndicator text={s.warn} />}
                {s.edge && <EdgeIndicator text={s.edge} />}
                <HelpTip text={`Step ${s.order}: ${s.detail}`} />
              </div>
              <p className="text-sm leading-relaxed mt-0.5" style={{ color: 'var(--text-secondary)' }}><AbbrText text={s.detail} /></p>
              {s.precondition && (
                <span className="inline-block text-xs px-2 py-0.5 rounded mt-1" style={{ background: 'rgba(245,158,11,0.06)', color: '#92400E' }}>
                  Precondition: {s.precondition}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <FieldRow label="Success outcome" value={journey.success_outcome} />
    </div>
  )
}

function RuleRenderer({ rule }: { rule: BusinessRule }) {
  return (
    <div className="grid grid-cols-[70px_1fr_120px] gap-3 items-start">
      <StateBadge>{rule.id}</StateBadge>
      <span className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
        <AbbrText text={rule.description} />
        {rule.warn && <WarnIndicator text={rule.warn} />}
      </span>
      <span className="text-xs text-right" style={{ color: 'var(--text-muted)' }}>{rule.source}</span>
    </div>
  )
}

function ConstraintRenderer({ constraint }: { constraint: Constraint }) {
  return (
    <div className="flex gap-3 items-start">
      <StateBadge>{constraint.type}</StateBadge>
      <span className="text-sm leading-relaxed flex-1" style={{ color: 'var(--text-primary)' }}><AbbrText text={constraint.constraint} /></span>
      <HelpTip text={`${constraint.type} constraint: ${constraint.constraint}`} />
    </div>
  )
}

function OpenQuestionRenderer({ question }: { question: OpenQuestion }) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <StateBadge>{question.status}</StateBadge>
        <span className="text-sm font-semibold flex-1" style={{ color: 'var(--text-primary)' }}><AbbrText text={question.question} /></span>
        <HelpTip text={`This question is ${question.status}. ${question.reason}`} />
      </div>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}><AbbrText text={question.reason} /></p>
      {question.resolution && (
        <p className="text-sm px-2 py-1 rounded inline-block" style={{ background: 'rgba(37,186,59,0.08)', color: '#166534' }}>
          Resolution: {question.resolution}
        </p>
      )}
    </div>
  )
}

function renderItem(item: SectionRendererProps['item'], type: SectionType) {
  switch (type) {
    case 'actor': return <ActorRenderer actor={item as Actor} />
    case 'entity': return <EntityRenderer entity={item as Entity} />
    case 'journey': return <JourneyRenderer journey={item as Journey} />
    case 'business_rule': return <RuleRenderer rule={item as BusinessRule} />
    case 'constraint': return <ConstraintRenderer constraint={item as Constraint} />
    case 'open_question': return <OpenQuestionRenderer question={item as OpenQuestion} />
  }
}

export function SectionCard({ item, type, review }: SectionRendererProps) {
  const [isOpen, setIsOpen] = useState(false)
  const displayId = 'name' in item ? (item as { name: string }).name : item.id
  const description = 'description' in item ? (item as { description: string }).description : ''
  return (
    <div
      id={review.targetId}
      className="mb-3 overflow-hidden rounded-xl transition-shadow"
      style={{ background: 'var(--bg-white)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-subtle)' }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen(!isOpen) } }}
        className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left transition-colors duration-200"
        style={{ background: isOpen ? 'var(--bg-card-gray)' : 'var(--bg-white)', borderBottom: isOpen ? '1px solid var(--border-default)' : 'none' }}
      >
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />}
          <h3 className="m-0 text-sm font-bold" style={{ color: 'var(--acfs-navy)' }}>{displayId}</h3>
          <HelpTip text={`${sectionTypeExplanations[type]} — ${description || displayId}`} />
          {(review.comments?.length ?? 0) > 0 && (
            <span className="text-xs rounded-full px-1.5 py-0.5" style={{ background: 'var(--bg-card-gray)', color: 'var(--text-muted)' }}>
              {review.comments?.length}
            </span>
          )}
        </div>
        <StatusBadge status={review.status} />
      </div>

      {isOpen && (
        <div className="p-4">
          {renderItem(item, type)}
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-default)' }}>
            <ReviewControls section={review} />
          </div>
        </div>
      )}
    </div>
  )
}
