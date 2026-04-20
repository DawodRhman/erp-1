import { z } from 'zod'

export const createLeavePolicySchema = z.object({
    department_id: z.string().uuid(),
    leave_type_id: z.string().uuid(),
    days_allowed: z.number().int().min(0),
    year: z.number().int().min(2020).max(2100),
    is_active: z.boolean().optional().default(true),
})

export const updateLeavePolicySchema = createLeavePolicySchema.partial()
