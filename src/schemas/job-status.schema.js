import { z } from 'zod'

export const createJobStatusSchema = z.object({
    status_name: z.string().min(1).max(50),
    is_active: z.boolean().optional().default(true),
})

export const updateJobStatusSchema = createJobStatusSchema.partial()
