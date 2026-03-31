'use client'

import { usePathname } from 'next/navigation'
import type { IntentModel } from '@/domain/intent-model/types'

function getSuggestions(pathname: string, model: IntentModel): string[] {
  if (pathname === '/consensus' || pathname === '/consensus/') {
    return [
      'Add a new open question',
      'Add a new business rule',
      'Summarize all open warnings',
    ]
  }

  if (pathname.includes('/versions')) return []

  const segment = pathname.split('/').pop()

  switch (segment) {
    case 'actors': {
      const actor = model.actors[0]
      return [
        'Add a new actor',
        actor ? `Add a responsibility to ${actor.name}` : 'Add a responsibility',
        model.actors.length > 1 ? `Clarify the auth method for ${model.actors[1].name}` : 'Clarify an auth method',
      ]
    }
    case 'entities': {
      const entity = model.entities[0]
      return [
        'Add a new entity',
        entity ? `Add a field to ${entity.name}` : 'Add a field',
        entity ? `Add a lifecycle state to ${entity.name}` : 'Add a lifecycle state',
      ]
    }
    case 'journeys': {
      const journey = model.journeys[0]
      return [
        'Add a new journey',
        journey ? `Add a step to ${journey.name}` : 'Add a step',
        journey ? `Add a precondition to ${journey.name}` : 'Add a precondition',
      ]
    }
    case 'business-rules':
      return [
        'Add a new business rule',
        'Add a warning to an existing rule',
        'Link a rule to a new entity',
      ]
    case 'constraints':
      return [
        'Add a new constraint',
        'Add a pricing constraint',
        'Add a compliance constraint',
      ]
    case 'open-questions':
      return [
        'Add a new open question',
        model.openQuestions.find(q => q.status === 'open')
          ? `Resolve ${model.openQuestions.find(q => q.status === 'open')!.id}`
          : 'Resolve an open question',
        'Add a follow-up question',
      ]
    default:
      return []
  }
}

export function SuggestionChips({
  model,
  onSelect,
}: {
  model: IntentModel
  onSelect: (prompt: string) => void
}) {
  const pathname = usePathname()
  const suggestions = getSuggestions(pathname, model)

  if (suggestions.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onSelect(s)}
          className="rounded-[15px] px-3 py-1.5 text-sm transition-colors duration-200"
          style={{
            background: 'var(--bg-gray-subtle)',
            border: '1px solid var(--border-light)',
            color: 'var(--text-primary)',
          }}
        >
          {s}
        </button>
      ))}
    </div>
  )
}
