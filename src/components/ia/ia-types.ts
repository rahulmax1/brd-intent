import { z } from 'zod'

// --- JSON file schemas (ia-positions.json) ---

export const screenDefSchema = z.object({
  label: z.string(),
  icon: z.string(),
  actor: z.string(),
  refs: z.array(z.string()),
  status: z.enum(['done', 'partial', 'not-built']),
})

export const edgeDefSchema = z.object({
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
  cross: z.boolean().optional(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
})

export const laneDefSchema = z.object({
  y: z.number(),
  height: z.number(),
  color: z.string(),
  label: z.string().optional(),
})

export const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
})

export const iaPositionsSchema = z.object({
  _screens: z.record(z.string(), screenDefSchema),
  _edges: z.record(z.string(), edgeDefSchema),
  _lanes: z.record(z.string(), laneDefSchema),
}).catchall(positionSchema)

// --- Runtime types ---

export type ScreenDef = z.infer<typeof screenDefSchema>
export type EdgeDef = z.infer<typeof edgeDefSchema>
export type LaneDef = z.infer<typeof laneDefSchema>
export type IAPositions = z.infer<typeof iaPositionsSchema>

export type IANodeData = {
  label: string
  iconName: string
  status: 'done' | 'partial' | 'not-built'
  actor: string
  description: string
  refs: string[]
}

export type LaneNodeData = {
  label: string
  color: string
  width: number
  height: number
}

export type DriftWarning = {
  type: 'unmapped-responsibility' | 'stale-ref' | 'removed-actor'
  message: string
}
