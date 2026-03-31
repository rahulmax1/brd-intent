import { readFile, writeFile } from 'node:fs/promises'
import { kv } from '@vercel/kv'
import { MODEL_HISTORY_PATH } from './paths'
import { intentModel } from '@/domain/intent-model/model'
import type { IntentModel } from '@/domain/intent-model/types'
import { quickValidate } from './model-sync-validator'

const isVercel = !!process.env.KV_REST_API_URL

const KV_INDEX_KEY = 'model-version-index'
const KV_VERSION_PREFIX = 'model-version:'
const KV_PROPOSAL_PREFIX = 'model-proposal:'

export type ModelVersion = {
  id: string
  timestamp: string
  author: string
  prompt: string
  model: IntentModel
  parentId: string | null
}

type VersionMeta = {
  id: string
  timestamp: string
  author: string
  prompt: string
  parentId: string | null
}

type ModelHistory = {
  versions: ModelVersion[]
}

// --- Seed ---

function createSeedVersion(): ModelVersion {
  return {
    id: 'seed',
    timestamp: new Date().toISOString(),
    author: 'system',
    prompt: 'Initial seed from model.ts',
    model: intentModel,
    parentId: null,
  }
}

// --- Local file helpers ---

async function readLocalHistory(): Promise<ModelHistory> {
  try {
    const raw = await readFile(MODEL_HISTORY_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch {
    const seed = createSeedVersion()
    const history: ModelHistory = { versions: [seed] }
    try {
      await writeFile(MODEL_HISTORY_PATH, JSON.stringify(history, null, 2))
    } catch {
      // Read-only filesystem (Vercel) — skip file write
    }
    return history
  }
}

async function writeLocalHistory(history: ModelHistory): Promise<void> {
  await writeFile(MODEL_HISTORY_PATH, JSON.stringify(history, null, 2))
}

// --- KV helpers ---

async function getKvIndex(): Promise<string[]> {
  const index = await kv.get<string[]>(KV_INDEX_KEY)
  if (index) return index

  // Seed
  const seed = createSeedVersion()
  await kv.set(`${KV_VERSION_PREFIX}${seed.id}`, seed)
  await kv.set(KV_INDEX_KEY, [seed.id])
  return [seed.id]
}

// --- Public API ---

export async function getCurrentModel(): Promise<IntentModel> {
  if (isVercel) {
    const index = await getKvIndex()
    const latestId = index[index.length - 1]
    // If only the seed exists, always use the local model.ts (it's the source of truth)
    // KV seed can be stale. Only trust KV for AI-edited versions (non-seed).
    if (latestId === 'seed') return intentModel
    const version = await kv.get<ModelVersion>(`${KV_VERSION_PREFIX}${latestId}`)
    return version?.model ?? intentModel
  }

  const history = await readLocalHistory()
  const latest = history.versions[history.versions.length - 1]
  // Same logic: seed = use model.ts, non-seed = use stored version
  if (!latest || latest.id === 'seed') return intentModel
  return latest.model
}

export async function getLatestVersionId(): Promise<string> {
  if (isVercel) {
    const index = await getKvIndex()
    return index[index.length - 1]
  }

  const history = await readLocalHistory()
  return history.versions[history.versions.length - 1]?.id ?? 'seed'
}

export async function addVersion(version: ModelVersion): Promise<void> {
  // Quick validation check before saving
  const validation = await quickValidate(version.model)
  if (!validation.valid) {
    throw new Error(`Model validation failed: ${validation.error}`)
  }

  if (isVercel) {
    await kv.set(`${KV_VERSION_PREFIX}${version.id}`, version)
    const index = await getKvIndex()
    index.push(version.id)
    await kv.set(KV_INDEX_KEY, index)
    return
  }

  const history = await readLocalHistory()
  history.versions.push(version)
  await writeLocalHistory(history)
}

export async function getVersions(): Promise<VersionMeta[]> {
  if (isVercel) {
    const index = await getKvIndex()
    const versions: VersionMeta[] = []
    for (const id of index) {
      const v = await kv.get<ModelVersion>(`${KV_VERSION_PREFIX}${id}`)
      if (v) {
        versions.push({
          id: v.id,
          timestamp: v.timestamp,
          author: v.author,
          prompt: v.prompt,
          parentId: v.parentId,
        })
      }
    }
    return versions
  }

  const history = await readLocalHistory()
  return history.versions.map(({ id, timestamp, author, prompt, parentId }) => ({
    id, timestamp, author, prompt, parentId,
  }))
}

export async function getVersion(id: string): Promise<ModelVersion | null> {
  if (isVercel) {
    return kv.get<ModelVersion>(`${KV_VERSION_PREFIX}${id}`)
  }

  const history = await readLocalHistory()
  return history.versions.find(v => v.id === id) ?? null
}

// --- Proposals (temporary storage for pending edits) ---

export type Proposal = {
  proposalId: string
  proposedModel: IntentModel
  latestVersionId: string
  prompt: string
}

export async function storeProposal(proposal: Proposal): Promise<void> {
  if (isVercel) {
    await kv.set(`${KV_PROPOSAL_PREFIX}${proposal.proposalId}`, proposal, { ex: 600 })
    return
  }

  // Dev: store in-memory (acceptable for local dev — single process)
  proposalCache.set(proposal.proposalId, proposal)
  setTimeout(() => proposalCache.delete(proposal.proposalId), 600_000)
}

export async function getProposal(proposalId: string): Promise<Proposal | null> {
  if (isVercel) {
    return kv.get<Proposal>(`${KV_PROPOSAL_PREFIX}${proposalId}`)
  }

  return proposalCache.get(proposalId) ?? null
}

const proposalCache = new Map<string, Proposal>()
