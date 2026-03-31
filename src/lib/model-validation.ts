import type { IntentModel, SectionType } from '@/domain/intent-model/types'
import { SECTION_TYPE_TO_MODEL_KEY } from '@/domain/intent-model/types'

export type ValidationResult = {
  valid: boolean
  errors: string[]
  warnings: string[]
  model: IntentModel // potentially patched (annotation restoration)
}

export function validateModel(
  proposed: IntentModel,
  original: IntentModel,
  prompt: string,
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const model = structuredClone(proposed)

  // 1. Referential integrity
  const actorIds = new Set(model.actors.map(a => a.id))
  const entityIds = new Set(model.entities.map(e => e.id))
  const allRefIds = new Set([...actorIds, ...entityIds])

  for (const journey of model.journeys) {
    if (!actorIds.has(journey.primary_actor)) {
      errors.push(`Journey "${journey.name}" references actor "${journey.primary_actor}" which does not exist`)
    }
  }

  for (const rule of model.businessRules) {
    for (const ref of rule.applies_to) {
      if (!allRefIds.has(ref)) {
        errors.push(`Business rule "${rule.id}" references "${ref}" in applies_to which does not exist`)
      }
    }
  }

  for (const actor of model.actors) {
    for (const resp of actor.responsibilities) {
      if (!resp.id.startsWith(`${actor.id}:`)) {
        errors.push(`Responsibility "${resp.id}" should start with "${actor.id}:" to match parent actor`)
      }
    }
  }

  // 2. ID uniqueness
  const allIds: string[] = []
  const sectionTypes = Object.keys(SECTION_TYPE_TO_MODEL_KEY) as SectionType[]
  for (const st of sectionTypes) {
    const key = SECTION_TYPE_TO_MODEL_KEY[st]
    const items = model[key] as Array<{ id: string }>
    for (const item of items) {
      allIds.push(item.id)
    }
  }
  const respIds: string[] = []
  for (const actor of model.actors) {
    for (const resp of actor.responsibilities) {
      respIds.push(resp.id)
    }
  }

  const idCounts = new Map<string, number>()
  for (const id of allIds) {
    idCounts.set(id, (idCounts.get(id) ?? 0) + 1)
  }
  for (const [id, count] of idCounts) {
    if (count > 1) errors.push(`Duplicate item ID: "${id}"`)
  }

  const respIdCounts = new Map<string, number>()
  for (const id of respIds) {
    respIdCounts.set(id, (respIdCounts.get(id) ?? 0) + 1)
  }
  for (const [id, count] of respIdCounts) {
    if (count > 1) errors.push(`Duplicate responsibility ID: "${id}"`)
  }

  // 3. Item count guard (top-level sections)
  const promptLower = prompt.toLowerCase()
  const mentionsDeletion = ['remove', 'delete', 'replace'].some(w => promptLower.includes(w))

  for (const st of sectionTypes) {
    const key = SECTION_TYPE_TO_MODEL_KEY[st]
    const oldItems = original[key] as Array<{ id: string; name?: string }>
    const newItems = model[key] as Array<{ id: string; name?: string }>

    if (newItems.length < oldItems.length) {
      const newIds = new Set(newItems.map(i => i.id))
      const dropped = oldItems.filter(i => !newIds.has(i.id))
      const droppedNames = dropped.map(i => i.name ?? i.id)

      if (mentionsDeletion) {
        warnings.push(`${String(key)}: removing ${dropped.length} item(s): ${droppedNames.join(', ')}`)
      } else {
        warnings.push(`${String(key)}: ${dropped.length} item(s) would be deleted but prompt doesn't mention removal: ${droppedNames.join(', ')}`)
      }
    }
  }

  // 3b. Nested field deletion guard + restoration
  // Detects dropped key_fields, responsibilities, steps, and transitions within
  // items that still exist. If the prompt doesn't mention deletion, dropped nested
  // items are restored — unless the prompt mentions them by name (intentional change)
  // or a replacement field already exists in the new set.
  const nestedArrayFields = ['responsibilities', 'key_fields', 'steps', 'transitions'] as const

  for (const st of sectionTypes) {
    const key = SECTION_TYPE_TO_MODEL_KEY[st]
    const oldItems = original[key] as Array<Record<string, unknown>>
    const newItems = model[key] as Array<Record<string, unknown>>
    const oldMap = new Map(oldItems.map(i => [i.id, i]))

    for (const newItem of newItems) {
      const oldItem = oldMap.get(newItem.id as string)
      if (!oldItem) continue

      for (const field of nestedArrayFields) {
        const oldNested = oldItem[field] as Array<Record<string, unknown>> | undefined
        const newNested = newItem[field] as Array<Record<string, unknown>> | undefined
        if (!oldNested || oldNested.length === 0) continue
        if (!newNested) {
          // Entire nested array was removed — restore it
          if (!mentionsDeletion) {
            newItem[field] = oldNested
            warnings.push(`${newItem.id}.${field}: entire array was removed by AI — restored. Use "remove" or "delete" in your prompt to drop fields intentionally.`)
          }
          continue
        }

        // Check for individually dropped nested items
        const newNestedKeys = new Set(
          newNested.map(n => (n.id ?? n.order ?? n.name) as string | number),
        )
        const droppedNested = oldNested.filter(
          n => !newNestedKeys.has((n.id ?? n.order ?? n.name) as string | number),
        )

        if (droppedNested.length > 0) {
          // Filter out items that should NOT be restored:
          // 1. Prompt mentions the item by name/id → user intended the change
          // 2. A new item with a similar key already exists (replacement)
          const newNestedNames = new Set(
            newNested.map(n => String(n.name ?? n.id ?? '').toLowerCase()),
          )
          const shouldRestore = droppedNested.filter(n => {
            const itemKey = String(n.name ?? n.id ?? n.title ?? '')
            const keyLower = itemKey.toLowerCase()
            // Normalize underscores to spaces for prompt matching (e.g., "release_type" matches "release type")
            const keyNormalized = keyLower.replace(/_/g, ' ')
            const keyParts = keyLower.split('_').filter(Boolean)

            // If the prompt mentions this item by name (with underscores or spaces), don't restore
            if (promptLower.includes(keyLower) || promptLower.includes(keyNormalized)) return false

            // If the prompt mentions all significant parts of the name, don't restore
            // e.g., "release" and "type" both appear in prompt → "release_type" was discussed
            if (keyParts.length > 1 && keyParts.every(part => part.length > 2 && promptLower.includes(part))) return false

            // If a new item contains part of this item's name (or vice versa), likely a replacement
            for (const newName of newNestedNames) {
              if (newName && keyLower && (newName.includes(keyLower) || keyLower.includes(newName))) return false
            }

            return true
          })

          const intentionallyDropped = droppedNested.filter(n => !shouldRestore.includes(n))

          if (intentionallyDropped.length > 0) {
            const labels = intentionallyDropped.map(
              n => (n.name ?? n.id ?? n.title ?? `#${n.order}`) as string,
            )
            warnings.push(`${newItem.id}.${field}: ${labels.join(', ')} dropped (mentioned in prompt or replaced by new field)`)
          }

          if (shouldRestore.length > 0) {
            const droppedLabels = shouldRestore.map(
              n => (n.name ?? n.id ?? n.title ?? `#${n.order}`) as string,
            )

            if (mentionsDeletion) {
              warnings.push(`${newItem.id}.${field}: removing ${shouldRestore.length} item(s): ${droppedLabels.join(', ')}`)
            } else {
              newItem[field] = [...newNested, ...shouldRestore]
              warnings.push(`${newItem.id}.${field}: AI dropped ${shouldRestore.length} item(s) not mentioned in prompt — restored: ${droppedLabels.join(', ')}`)
            }
          }

          // Deduplicate by key (safety net)
          const finalNested = newItem[field] as Array<Record<string, unknown>>
          const seen = new Set<string | number>()
          newItem[field] = finalNested.filter(n => {
            const nKey = (n.id ?? n.order ?? n.name) as string | number
            if (seen.has(nKey)) return false
            seen.add(nKey)
            return true
          })
        }
      }
    }
  }

  // 3c. Duplicate nested item detection
  // If AI added a new field that replaces an old one but kept both, remove the old one.
  // e.g., AI adds "hbl_status" but keeps "status" — remove "status" since it's superseded.
  for (const st of sectionTypes) {
    const key = SECTION_TYPE_TO_MODEL_KEY[st]
    const oldItems = original[key] as Array<Record<string, unknown>>
    const newItems = model[key] as Array<Record<string, unknown>>
    const oldMap = new Map(oldItems.map(i => [i.id, i]))

    for (const newItem of newItems) {
      const oldItem = oldMap.get(newItem.id as string)
      if (!oldItem) continue

      for (const field of nestedArrayFields) {
        const oldNested = oldItem[field] as Array<Record<string, unknown>> | undefined
        const newNested = newItem[field] as Array<Record<string, unknown>> | undefined
        if (!oldNested || !newNested || newNested.length <= oldNested.length) continue

        // There are more items than before — AI may have added new fields while keeping old ones
        const oldKeys = new Set(oldNested.map(n => String(n.id ?? n.order ?? n.name ?? '')))
        const addedItems = newNested.filter(n => !oldKeys.has(String(n.id ?? n.order ?? n.name ?? '')))

        if (addedItems.length === 0) continue

        // For each old item, check if a new item supersedes it
        const superseded = new Set<string>()
        for (const oldN of oldNested) {
          const oldKey = String(oldN.name ?? oldN.id ?? '').toLowerCase()
          const oldKeyNormalized = oldKey.replace(/_/g, ' ')
          const oldKeyParts = oldKey.split('_').filter(p => p.length > 2)

          for (const addedN of addedItems) {
            const addedKey = String(addedN.name ?? addedN.id ?? '').toLowerCase()

            // New field name contains old field name → replacement (hbl_status supersedes status)
            const isReplacement = (addedKey.includes(oldKey) && addedKey !== oldKey)
              || (oldKeyParts.length > 1 && oldKeyParts.every(p => addedKey.includes(p)))

            // Prompt mentions both old and new → user intended a replacement
            const promptMentionsBoth = (promptLower.includes(oldKey) || promptLower.includes(oldKeyNormalized))
              && promptLower.includes(addedKey.replace(/_/g, ' '))

            if (isReplacement || promptMentionsBoth) {
              superseded.add(String(oldN.name ?? oldN.id ?? oldN.order ?? ''))
            }
          }
        }

        if (superseded.size > 0) {
          newItem[field] = newNested.filter(n => {
            const nKey = String(n.name ?? n.id ?? n.order ?? '')
            return !superseded.has(nKey)
          })
          warnings.push(`${newItem.id}.${field}: removed superseded field(s): ${[...superseded].join(', ')} (replaced by new fields)`)
        }
      }
    }
  }

  // 4. Annotation preservation
  for (const st of sectionTypes) {
    const key = SECTION_TYPE_TO_MODEL_KEY[st]
    const oldItems = original[key] as Array<Record<string, unknown>>
    const newItems = model[key] as Array<Record<string, unknown>>
    const oldMap = new Map(oldItems.map(i => [i.id, i]))

    const mentionsAnnotations = ['warn', 'edge'].some(w => promptLower.includes(w))

    for (const newItem of newItems) {
      const oldItem = oldMap.get(newItem.id as string)
      if (!oldItem || mentionsAnnotations) continue

      // Restore warn/edge on top-level item
      if (oldItem.warn && !newItem.warn) newItem.warn = oldItem.warn
      if (oldItem.edge && !newItem.edge) newItem.edge = oldItem.edge

      // Restore on nested items (responsibilities, key_fields, steps, transitions)
      for (const field of ['responsibilities', 'key_fields', 'steps', 'transitions']) {
        const oldNested = oldItem[field] as Array<Record<string, unknown>> | undefined
        const newNested = newItem[field] as Array<Record<string, unknown>> | undefined
        if (!oldNested || !newNested) continue

        const oldNestedMap = new Map(oldNested.map(n => [n.id ?? n.order ?? n.name, n]))
        for (const newN of newNested) {
          const key2 = newN.id ?? newN.order ?? newN.name
          const oldN = oldNestedMap.get(key2)
          if (!oldN) continue
          if (oldN.warn && !newN.warn) newN.warn = oldN.warn
          if (oldN.edge && !newN.edge) newN.edge = oldN.edge
        }
      }
    }
  }

  // 5. Lifecycle consistency (entities only)
  for (const entity of model.entities) {
    const stateSet = new Set(entity.lifecycle.states)
    for (const t of entity.lifecycle.transitions) {
      if (!stateSet.has(t.from)) {
        errors.push(`Entity "${entity.name}" transition from "${t.from}" references unknown state`)
      }
      if (!stateSet.has(t.to)) {
        errors.push(`Entity "${entity.name}" transition to "${t.to}" references unknown state`)
      }
    }
  }

  // 6. Auto-compute meta.status based on open questions and warnings
  model.meta.status = computeModelStatus(model)
  model.meta.lastUpdated = new Date().toISOString().split('T')[0]

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    model,
  }
}

/**
 * Derives meta.status from the model's open questions and warn flags.
 *
 * - 'draft'      — open questions with no resolution, or warn flags exist
 * - 'in_review'  — some questions resolved but others still open
 * - 'approved'   — all questions resolved (or none exist) and no warn flags
 */
export function computeModelStatus(model: IntentModel): 'draft' | 'in_review' | 'approved' {
  const questions = model.openQuestions
  const openCount = questions.filter(q => q.status === 'open' && !q.resolution).length
  const totalCount = questions.length
  const resolvedCount = questions.filter(q => q.status === 'resolved').length

  // Check for any warn flags across the model
  const hasWarnings = hasWarnFlags(model)

  if (totalCount === 0 && !hasWarnings) return 'approved'
  if (openCount === 0 && resolvedCount === totalCount && !hasWarnings) return 'approved'
  if (resolvedCount > 0 || (totalCount > 0 && openCount < totalCount)) return 'in_review'
  return 'draft'
}

function hasWarnFlags(model: IntentModel): boolean {
  for (const actor of model.actors) {
    for (const r of actor.responsibilities) {
      if (r.warn) return true
    }
  }
  for (const entity of model.entities) {
    for (const f of entity.key_fields) {
      if (f.warn) return true
    }
    for (const t of entity.lifecycle.transitions) {
      if (t.warn) return true
    }
  }
  for (const rule of model.businessRules) {
    if (rule.warn) return true
  }
  for (const journey of model.journeys) {
    for (const s of journey.steps) {
      if (s.warn) return true
    }
  }
  return false
}
