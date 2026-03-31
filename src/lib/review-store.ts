import { readFile, writeFile } from 'node:fs/promises'
import { kv } from '@vercel/kv'
import { REVIEW_STATE_PATH } from './paths'
import type { ReviewState } from '@/domain/intent-model/types'

const KV_KEY = 'review-state'

const isVercel = !!process.env.KV_REST_API_URL

const EMPTY_STATE: ReviewState = {
  modelVersion: '0.7.0',
  sections: [],
}

// Ensure review state has the expected shape (handles old KV data)
function normalize(data: unknown): ReviewState {
  if (!data || typeof data !== 'object') return EMPTY_STATE
  const obj = data as Record<string, unknown>
  return {
    modelVersion: (obj.modelVersion as string) ?? '0.0.0',
    sections: Array.isArray(obj.sections) ? obj.sections : [],
  }
}

export async function getReviewState(): Promise<ReviewState> {
  if (isVercel) {
    const cached = await kv.get<ReviewState>(KV_KEY)
    if (cached) return normalize(cached)
  }

  try {
    const raw = await readFile(REVIEW_STATE_PATH, 'utf-8')
    return normalize(JSON.parse(raw))
  } catch {
    return EMPTY_STATE
  }
}

export async function resetReviewState(): Promise<ReviewState> {
  try {
    const raw = await readFile(REVIEW_STATE_PATH, 'utf-8')
    const state = normalize(JSON.parse(raw))
    if (isVercel) {
      await kv.set(KV_KEY, state)
    }
    return state
  } catch {
    return EMPTY_STATE
  }
}

export async function setReviewState(state: ReviewState): Promise<void> {
  if (isVercel) {
    await kv.set(KV_KEY, state)
    return
  }

  await writeFile(REVIEW_STATE_PATH, JSON.stringify(state, null, 2))
}
