import { z } from 'zod'

export const createDesignationSchema = z.object({
    title: z.string().min(1).max(50),
    is_active: z.boolean().optional().default(true),
})

export const updateDesignationSchema = createDesignationSchema.partial()
