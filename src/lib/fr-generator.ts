import type { IntentModel, Actor, Responsibility } from '@/domain/intent-model/types'

export type FunctionalRequirement = {
  id: string // e.g. "FR-LSP-01"
  category: 'lsp' | 'admin'
  description: string
  mapped_to: string[] // Actor responsibility IDs
  source_actor: string // Actor ID
}

/**
 * Auto-generates functional requirements from actor responsibilities.
 *
 * Mapping logic:
 * - LSP actor → FR-LSP-XX
 * - ACFS actor → FR-ADM-XX
 * - Other actors → skipped (deferred or not requiring FRs)
 *
 * FR description format: Converts responsibility to "System shall..." format
 */
export function generateFunctionalRequirements(model: IntentModel): FunctionalRequirement[] {
  const frs: FunctionalRequirement[] = []

  // Counter for FR IDs
  let lspCounter = 1
  let admCounter = 1

  for (const actor of model.actors) {
    // Skip deferred actors
    if (actor.deferred) continue

    const category = getActorCategory(actor)
    if (!category) continue // Skip actors that don't map to FR categories

    for (const responsibility of actor.responsibilities) {
      const id = category === 'lsp'
        ? `FR-LSP-${String(lspCounter++).padStart(2, '0')}`
        : `FR-ADM-${String(admCounter++).padStart(2, '0')}`

      frs.push({
        id,
        category,
        description: toSystemShallFormat(responsibility, actor),
        mapped_to: [responsibility.id],
        source_actor: actor.id,
      })
    }
  }

  return frs
}

/**
 * Determines FR category from actor ID
 */
function getActorCategory(actor: Actor): 'lsp' | 'admin' | null {
  if (actor.id === 'lsp') return 'lsp'
  if (actor.id === 'acfs') return 'admin'
  // p4tc, driver, gatehouse don't get FRs (deferred or no system requirements)
  return null
}

/**
 * Converts responsibility description to "System shall..." format
 *
 * Examples:
 * - "View list of assigned HBLs" → "System shall display list of assigned HBLs to LSP"
 * - "Delegate shipments to another LSP" → "System shall allow LSP to delegate shipments"
 */
function toSystemShallFormat(responsibility: Responsibility, actor: Actor): string {
  const desc = responsibility.description

  // If already in "system shall" format, return as-is
  if (desc.toLowerCase().includes('system') && desc.toLowerCase().includes('shall')) {
    return desc
  }

  // Pattern: "View X" → "System shall display X to [actor]"
  if (desc.match(/^View\s/i)) {
    return `System shall display ${desc.substring(5)} to ${actor.name}.`
  }

  // Pattern: "Select X" → "System shall allow [actor] to select X"
  if (desc.match(/^Select\s/i)) {
    return `System shall allow ${actor.name} to ${desc.toLowerCase()}.`
  }

  // Pattern: "Upload X" → "System shall allow [actor] to upload X"
  if (desc.match(/^Upload\s/i)) {
    return `System shall allow ${actor.name} to ${desc.toLowerCase()}.`
  }

  // Pattern: "Book X" → "System shall allow [actor] to book X"
  if (desc.match(/^Book\s/i)) {
    return `System shall allow ${actor.name} to ${desc.toLowerCase()}.`
  }

  // Pattern: "Delegate X" → "System shall allow [actor] to delegate X"
  if (desc.match(/^Delegate\s/i)) {
    return `System shall allow ${actor.name} to ${desc.toLowerCase()}.`
  }

  // Pattern: "Modify X" → "System shall allow [actor] to modify X"
  if (desc.match(/^Modify\s/i)) {
    return `System shall allow ${actor.name} to ${desc.toLowerCase()}.`
  }

  // Pattern: "Search X" → "System shall allow [actor] to search X"
  if (desc.match(/^Search\s/i)) {
    return `System shall allow ${actor.name} to ${desc.toLowerCase()}.`
  }

  // Pattern: "Configure X" → "System shall allow [actor] to configure X"
  if (desc.match(/^Configure\s/i)) {
    return `System shall allow ${actor.name} to ${desc.toLowerCase()}.`
  }

  // Pattern: "Flag X" → "System shall allow [actor] to flag X"
  if (desc.match(/^Flag\s/i)) {
    return `System shall allow ${actor.name} to ${desc.toLowerCase()}.`
  }

  // Pattern: "Request X" → "System shall allow [actor] to request X"
  if (desc.match(/^Request\s/i)) {
    return `System shall allow ${actor.name} to ${desc.toLowerCase()}.`
  }

  // Pattern: "Edit X" → "System shall allow [actor] to edit X"
  if (desc.match(/^Edit\s/i)) {
    return `System shall allow ${actor.name} to ${desc.toLowerCase()}.`
  }

  // Pattern: "Manage X" → "System shall allow [actor] to manage X"
  if (desc.match(/^Manage\s/i)) {
    return `System shall allow ${actor.name} to ${desc.toLowerCase()}.`
  }

  // Pattern: "Override X" → "System shall allow [actor] to override X"
  if (desc.match(/^Override\s/i)) {
    return `System shall allow ${actor.name} to ${desc.toLowerCase()}.`
  }

  // Pattern: "Create X" → "System shall allow [actor] to create X"
  if (desc.match(/^Create\s/i)) {
    return `System shall allow ${actor.name} to ${desc.toLowerCase()}.`
  }

  // Pattern: "Perform X" → "System shall allow [actor] to perform X"
  if (desc.match(/^Perform\s/i)) {
    return `System shall allow ${actor.name} to ${desc.toLowerCase()}.`
  }

  // Pattern: "Provide X" → "System shall provide X for [actor]"
  if (desc.match(/^Provide\s/i)) {
    return `System shall provide ${desc.substring(8)} for ${actor.name}.`
  }

  // Pattern: "Assign X" or "ECST Assignment" → "System shall allow [actor] to assign X"
  if (desc.match(/^(Assign|ECST Assignment)/i)) {
    return `System shall allow ${actor.name} to: ${desc}`
  }

  // Default: Wrap in "System shall allow [actor] to..."
  return `System shall allow ${actor.name} to: ${desc}`
}

/**
 * Groups FRs by category for rendering
 */
export function groupFunctionalRequirements(frs: FunctionalRequirement[]): {
  lsp: FunctionalRequirement[]
  admin: FunctionalRequirement[]
} {
  return {
    lsp: frs.filter(fr => fr.category === 'lsp'),
    admin: frs.filter(fr => fr.category === 'admin'),
  }
}
