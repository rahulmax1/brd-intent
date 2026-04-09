import { z } from 'zod'

// Zod Validation Schemas
// Generated from Intent Model

export const userAccountSchema = z.object({
  id: z.string().uuid(),
  // Add fields based on entity: Represents a registered user with authentication credentials and profile information
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const documentSchema = z.object({
  id: z.string().uuid(),
  // Add fields based on entity: An uploaded file containing requirements, specifications, or other project information
  createdAt: z.date(),
  updatedAt: z.date(),
})

