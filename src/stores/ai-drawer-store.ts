import { create } from 'zustand'
import type { ModelDiff } from '@/lib/model-diff'
import type { IntentModel } from '@/domain/intent-model/types'

type Proposal = {
  proposalId: string
  diff: ModelDiff
  proposedModel: IntentModel
  warnings: string[]
}

type DrawerStatus = 'idle' | 'planning' | 'plan_ready' | 'loading' | 'diff_preview' | 'applying' | 'success' | 'error'

type DrawerState = {
  isOpen: boolean
  status: DrawerStatus
  scope: 'section' | 'full'
  width: number
  currentProposal: Proposal | null
  plan: string
  error: string | null
  lastPrompt: string | null
  open: () => void
  close: () => void
  setScope: (scope: 'section' | 'full') => void
  setWidth: (width: number) => void
  setStatus: (status: DrawerStatus) => void
  setProposal: (proposal: Proposal | null) => void
  setPlan: (plan: string) => void
  appendPlan: (chunk: string) => void
  setError: (error: string | null) => void
  setLastPrompt: (prompt: string | null) => void
  reject: () => void
  reset: () => void
}

export const useDrawerStore = create<DrawerState>((set) => ({
  isOpen: false,
  status: 'idle',
  scope: 'section',
  width: 400,
  currentProposal: null,
  plan: '',
  error: null,
  lastPrompt: null,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false, status: 'idle', currentProposal: null, error: null, plan: '' }),
  setScope: (scope) => set({ scope }),
  setWidth: (width) => set({ width: Math.max(320, Math.min(700, width)) }),
  setStatus: (status) => set({ status }),
  setProposal: (currentProposal) => set({ currentProposal }),
  setPlan: (plan) => set({ plan }),
  appendPlan: (chunk) => set((state) => ({ plan: state.plan + chunk })),
  setError: (error) => set({ error, status: 'error' }),
  setLastPrompt: (lastPrompt) => set({ lastPrompt }),
  reject: () => set({ status: 'idle', currentProposal: null, plan: '' }),
  reset: () => set({ status: 'idle', currentProposal: null, error: null, plan: '' }),
}))
