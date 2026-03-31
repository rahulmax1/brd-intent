import { z } from 'zod'

export const ReviewActionSchema = z.object({
  targetId: z.string().regex(/^[a-z_]+:.+$/, 'targetId must be in format "type:id"'),
  action: z.enum(['approve', 'dispute', 'comment']),
  comment: z.string().optional(),
})

export type ReviewAction = z.infer<typeof ReviewActionSchema>
