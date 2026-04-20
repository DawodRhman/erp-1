import { z } from 'zod'

export const createLeaveTypeSchema = z.object({
    name: z.string().min(1).max(50),
    is_active: z.boolean().optional().default(true),
})

export const updateLeaveTypeSchema = createLeaveTypeSchema.partial()
