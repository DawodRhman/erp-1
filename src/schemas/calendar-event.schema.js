import { z } from 'zod'

const visibilitySchema = z.enum(['all', 'hr', 'employee'])

export const calendarEventQuerySchema = z.object({
    from: z.string().date().optional(),
    to: z.string().date().optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    type: z.string().trim().min(1).max(50).optional(),
    visibility: visibilitySchema.optional(),
    search: z.string().trim().max(255).optional(),
    all: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
    sort: z.enum(['date', 'title', 'type', 'created_at']).default('date'),
    order: z.enum(['asc', 'desc']).default('asc'),
}).refine((data) => {
    if (data.from && data.to) return data.from <= data.to;
    return true;
}, {
    message: 'From date must be before or equal to to date.',
    path: ['to'],
})

export const calendarEventParamsSchema = z.object({
    id: z.string().uuid(),
})

export const createCalendarEventSchema = z.object({
    type: z.string().trim().min(1).max(50),
    date: z.string().date(),
    title: z.string().trim().min(1).max(255),
    visibility: visibilitySchema.default('all'),
})

export const updateCalendarEventSchema = z.object({
    type: z.string().trim().min(1).max(50).optional(),
    date: z.string().date().optional(),
    title: z.string().trim().min(1).max(255).optional(),
    visibility: visibilitySchema.optional(),
}).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required.',
})
