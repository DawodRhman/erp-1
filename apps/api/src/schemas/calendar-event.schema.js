import { z } from 'zod'

export const calendarEventQuerySchema = z.object({
    from: z.string().date().optional(),
    to: z.string().date().optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    type: z.string().trim().min(1).max(50).optional(),
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
    date: z.string().date().optional(),
    start_date: z.string().date().optional(),
    end_date: z.string().date().optional(),
    title: z.string().trim().min(1).max(255),
    target_department_ids: z.array(z.string().uuid()).optional(),
    target_designation_ids: z.array(z.string().uuid()).optional(),
}).refine((data) => data.date || data.start_date, {
    message: 'Start date is mandatory.',
    path: ['start_date'],
}).refine((data) => {
    const startDate = data.start_date || data.date;
    const endDate = data.end_date || startDate;
    return !startDate || !endDate || endDate >= startDate;
}, {
    message: 'To date cannot be before from date.',
    path: ['end_date'],
})

export const updateCalendarEventSchema = z.object({
    type: z.string().trim().min(1).max(50).optional(),
    date: z.string().date().optional(),
    start_date: z.string().date().optional(),
    end_date: z.string().date().optional(),
    title: z.string().trim().min(1).max(255).optional(),
    target_department_ids: z.array(z.string().uuid()).optional(),
    target_designation_ids: z.array(z.string().uuid()).optional(),
}).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required.',
}).refine((data) => {
    const startDate = data.start_date || data.date;
    const endDate = data.end_date;
    return !startDate || !endDate || endDate >= startDate;
}, {
    message: 'To date cannot be before from date.',
    path: ['end_date'],
})
