import { z } from 'zod'

export const createExtraEmployeeInfoSchema = z.object({
    employee_id: z.string().min(1).max(10),
    contact_1: z.string().min(1).max(15),
    contact_2: z.string().max(15).optional().nullable(),
    emergence_contact_1: z.string().max(15).optional().nullable(),
    emergence_contact_2: z.string().max(15).optional().nullable(),
    bank_name: z.string().max(100).optional().nullable(),
    bank_acc_num: z.string().max(15).optional().nullable(),
    perment_address: z.string().max(255).optional().nullable(),
    postal_address: z.string().max(255).optional().nullable(),
})

export const updateExtraEmployeeInfoSchema = createExtraEmployeeInfoSchema.partial()
