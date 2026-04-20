import { describe, it, expect } from 'vitest'
import { batchAttendanceSchema } from '../../src/schemas/attendance.schema.js'

const validRow = {
  employee_id: 'EMP001',
  shift_id: '123e4567-e89b-12d3-a456-426614174000',
  status: 'present',
  check_in: '09:00',
  check_out: '17:00',
  notes: null,
  ack: false
}

describe('batchAttendanceSchema', () => {
  it('passes with valid batch', () => {
    expect(batchAttendanceSchema.safeParse({
      date: '2026-04-20',
      rows: [validRow]
    }).success).toBe(true)
  })

  it('fails with empty rows array', () => {
    expect(batchAttendanceSchema.safeParse({
      date: '2026-04-20',
      rows: []
    }).success).toBe(false)
  })

  it('fails with invalid status', () => {
    expect(batchAttendanceSchema.safeParse({
      date: '2026-04-20',
      rows: [{ ...validRow, status: 'sleeping' }]
    }).success).toBe(false)
  })

  it('fails with invalid date format', () => {
    expect(batchAttendanceSchema.safeParse({
      date: '20-04-2026',
      rows: [validRow]
    }).success).toBe(false)
  })

  it('fails with invalid time format in check_in', () => {
    expect(batchAttendanceSchema.safeParse({
      date: '2026-04-20',
      rows: [{ ...validRow, check_in: '9:00am' }]
    }).success).toBe(false)
  })

  it('allows null check_in and check_out for absent status', () => {
    expect(batchAttendanceSchema.safeParse({
      date: '2026-04-20',
      rows: [{ ...validRow, status: 'absent', check_in: null, check_out: null }]
    }).success).toBe(true)
  })
})
