import { z } from 'zod'

export const createLeaveRequestSchema = z.object({
    employee_id: z.string().min(1).max(10),
    leave_type_id: z.string().uuid(),
    start_date: z.string().date(),
    end_date: z.string().date(),
    reason: z.string().optional().nullable(),
})

export const earlyReturnSchema = z.object({
    end_by_force: z.string().date(),
})
