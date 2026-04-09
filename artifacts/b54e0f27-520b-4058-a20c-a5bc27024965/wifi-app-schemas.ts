import { z } from 'zod'

// Zod Validation Schemas
// Generated from Intent Model

export const guestRegistrationSchema = z.object({
  id: z.string().uuid(),
  // Add fields based on entity: Form used by visitors to register for Wi-Fi access.
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const accessTokenSchema = z.object({
  id: z.string().uuid(),
  // Add fields based on entity: Temporary credentials granting time-limited Wi-Fi access to guests.
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const adminDashboardSchema = z.object({
  id: z.string().uuid(),
  // Add fields based on entity: Interface for IT admins to manage guest sessions and policies.
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const sessionLogSchema = z.object({
  id: z.string().uuid(),
  // Add fields based on entity: Records of guest Wi-Fi usage for compliance and monitoring.
  createdAt: z.date(),
  updatedAt: z.date(),
})

