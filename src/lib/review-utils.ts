import type {
  IntentModel,
  SectionReview,
  SectionType,
} from '@/domain/intent-model/types'
import { MODEL_KEY_TO_SECTION_TYPE } from '@/domain/intent-model/types'

type ModelItem = { id: string; [key: string]: unknown }

export function getAllModelItems(model: IntentModel): Array<{ item: ModelItem; type: SectionType }> {
  const items: Array<{ item: ModelItem; type: SectionType }> = []
  const { meta, ...sections } = model

  for (const [key, value] of Object.entries(sections)) {
    const sectionType = MODEL_KEY_TO_SECTION_TYPE[key]
    if (!sectionType || !Array.isArray(value)) continue
    for (const item of value) {
      items.push({ item: item as ModelItem, type: sectionType })
    }
  }

  return items
}

export function buildTargetId(type: SectionType, id: string): string {
  return `${type}:${id}`
}

export function getReviewForTarget(sections: SectionReview[], targetId: string): SectionReview {
  return sections.find(s => s.targetId === targetId) ?? {
    targetId,
    targetType: targetId.split(':')[0] as SectionType,
    status: 'pending',
    comments: [],
  }
}

// --- Structural diff (kept for diff page) ---

export type DiffItem = {
  targetId: string
  targetType: SectionType
  change: 'added' | 'removed' | 'modified' | 'unchanged'
  current?: ModelItem
  previous?: ModelItem
}

export function computeStructuralDiff(
  current: IntentModel,
  previous: IntentModel
): DiffItem[] {
  const currentItems = getAllModelItems(current)
  const previousItems = getAllModelItems(previous)
  const diffs: DiffItem[] = []

  const previousMap = new Map(
    previousItems.map(({ item, type }) => [buildTargetId(type, item.id), { item, type }])
  )

  for (const { item, type } of currentItems) {
    const targetId = buildTargetId(type, item.id)
    const prev = previousMap.get(targetId)

    if (!prev) {
      diffs.push({ targetId, targetType: type, change: 'added', current: item })
    } else {
      const currentJson = JSON.stringify(item)
      const prevJson = JSON.stringify(prev.item)
      diffs.push({
        targetId,
        targetType: type,
        change: currentJson === prevJson ? 'unchanged' : 'modified',
        current: item,
        previous: prev.item,
      })
      previousMap.delete(targetId)
    }
  }

  for (const [targetId, { item, type }] of previousMap) {
    diffs.push({ targetId, targetType: type, change: 'removed', previous: item })
  }

  return diffs
}
