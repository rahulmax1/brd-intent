import type { IntentModel, SectionType } from '@/domain/intent-model/types'
import { SECTION_TYPE_TO_MODEL_KEY } from '@/domain/intent-model/types'

export type FieldChange = {
  field: string
  old: unknown
  new: unknown
}

export type ItemChange = {
  type: 'added' | 'removed' | 'modified'
  itemId: string
  itemName: string
  fields?: FieldChange[]
}

export type SectionDiff = {
  sectionType: SectionType
  changes: ItemChange[]
}

export type ModelDiff = {
  sections: SectionDiff[]
}

type ModelItem = { id: string; name?: string; question?: string; constraint?: string; description?: string }

function getItemName(item: ModelItem): string {
  return item.name ?? item.question ?? item.constraint ?? item.description ?? item.id
}

function diffFields(oldItem: Record<string, unknown>, newItem: Record<string, unknown>): FieldChange[] {
  const changes: FieldChange[] = []
  const allKeys = new Set([...Object.keys(oldItem), ...Object.keys(newItem)])

  for (const key of allKeys) {
    const oldVal = JSON.stringify(oldItem[key])
    const newVal = JSON.stringify(newItem[key])
    if (oldVal !== newVal) {
      changes.push({ field: key, old: oldItem[key], new: newItem[key] })
    }
  }

  return changes
}

export function computeModelDiff(oldModel: IntentModel, newModel: IntentModel): ModelDiff {
  const sectionTypes = Object.keys(SECTION_TYPE_TO_MODEL_KEY) as SectionType[]
  const sections: SectionDiff[] = []

  for (const sectionType of sectionTypes) {
    const modelKey = SECTION_TYPE_TO_MODEL_KEY[sectionType]
    const oldItems = (oldModel[modelKey] as ModelItem[]) ?? []
    const newItems = (newModel[modelKey] as ModelItem[]) ?? []

    const oldMap = new Map(oldItems.map(item => [item.id, item]))
    const newMap = new Map(newItems.map(item => [item.id, item]))

    const changes: ItemChange[] = []

    // Added items
    for (const [id, item] of newMap) {
      if (!oldMap.has(id)) {
        changes.push({ type: 'added', itemId: id, itemName: getItemName(item) })
      }
    }

    // Removed items
    for (const [id, item] of oldMap) {
      if (!newMap.has(id)) {
        changes.push({ type: 'removed', itemId: id, itemName: getItemName(item) })
      }
    }

    // Modified items
    for (const [id, newItem] of newMap) {
      const oldItem = oldMap.get(id)
      if (!oldItem) continue
      const fields = diffFields(
        oldItem as unknown as Record<string, unknown>,
        newItem as unknown as Record<string, unknown>,
      )
      if (fields.length > 0) {
        changes.push({ type: 'modified', itemId: id, itemName: getItemName(newItem), fields })
      }
    }

    if (changes.length > 0) {
      sections.push({ sectionType, changes })
    }
  }

  return { sections }
}
