import { describe, it, expect } from 'vitest'
import { createLeaveRequestSchema, earlyReturnSchema } from '../../src/schemas/leave-request.schema.js'

describe('createLeaveRequestSchema', () => {
  it('passes with valid data', () => {
    expect(createLeaveRequestSchema.safeParse({
      employee_id: 'EMP001',
      leave_type_id: '123e4567-e89b-12d3-a456-426614174000',
      start_date: '2026-05-01',
      end_date: '2026-05-05',
      reason: 'Family vacation'
    }).success).toBe(true)
  })

  it('fails when employee_id is missing', () => {
    expect(createLeaveRequestSchema.safeParse({
      leave_type_id: '123e4567-e89b-12d3-a456-426614174000',
      start_date: '2026-05-01',
      end_date: '2026-05-05'
    }).success).toBe(false)
  })

  it('fails when leave_type_id is not a UUID', () => {
    expect(createLeaveRequestSchema.safeParse({
      employee_id: 'EMP001',
      leave_type_id: 'not-a-uuid',
      start_date: '2026-05-01',
      end_date: '2026-05-05'
    }).success).toBe(false)
  })

  it('fails when date format is invalid', () => {
    expect(createLeaveRequestSchema.safeParse({
      employee_id: 'EMP001',
      leave_type_id: '123e4567-e89b-12d3-a456-426614174000',
      start_date: '01-05-2026',
      end_date: '05-05-2026'
    }).success).toBe(false)
  })

  it('passes without reason (optional)', () => {
    expect(createLeaveRequestSchema.safeParse({
      employee_id: 'EMP001',
      leave_type_id: '123e4567-e89b-12d3-a456-426614174000',
      start_date: '2026-05-01',
      end_date: '2026-05-05'
    }).success).toBe(true)
  })
})

describe('earlyReturnSchema', () => {
  it('passes with valid date', () => {
    expect(earlyReturnSchema.safeParse({ end_by_force: '2026-05-03' }).success).toBe(true)
  })

  it('fails when end_by_force is missing', () => {
    expect(earlyReturnSchema.safeParse({}).success).toBe(false)
  })
})
