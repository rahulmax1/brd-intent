import { z } from 'zod'

// Zod Validation Schemas
// Generated from Intent Model

export const topicSchema = z.object({
  id: z.string().uuid(),
  // Add fields based on entity: Discussion topic with title, description, votes, and status
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const voteSchema = z.object({
  id: z.string().uuid(),
  // Add fields based on entity: Member vote record for a specific topic
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const memberNameSchema = z.object({
  id: z.string().uuid(),
  // Add fields based on entity: Hardcoded team member identity from dropdown picker
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const sessionSchema = z.object({
  id: z.string().uuid(),
  // Add fields based on entity: Past completed design jam session with done topics
  createdAt: z.date(),
  updatedAt: z.date(),
})

