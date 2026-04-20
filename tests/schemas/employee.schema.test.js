import { describe, it, expect } from 'vitest'
import { createEmployeeSchema, updateEmployeeSchema } from '../../src/schemas/employee.schema.js'

describe('createEmployeeSchema', () => {
  it('passes with all required fields', () => {
    expect(createEmployeeSchema.safeParse({
      employee_id: 'EMP001',
      name: 'Ahmed Ali',
      father_name: 'Ali Khan',
      cnic: '12345-1234567-1',
      date_of_birth: '1990-01.01'
    }).success).toBe(true)
  })

  it('fails when name is missing', () => {
    expect(createEmployeeSchema.safeParse({
      employee_id: 'EMP001',
      father_name: 'Ali Khan',
      cnic: '12345-1234567-1',
      date_of_birth: '1990-01.01'
    }).success).toBe(false)
  })

  it('fails when employee_id exceeds 10 chars', () => {
    expect(createEmployeeSchema.safeParse({
      employee_id: 'EMP00100001',
      name: 'Ahmed Ali',
      father_name: 'Ali Khan',
      cnic: '12345-1234567-1',
      date_of_birth: '1990-01.01'
    }).success).toBe(false)
  })
})

describe('updateEmployeeSchema', () => {
  it('passes with partial data', () => {
    expect(updateEmployeeSchema.safeParse({ name: 'New Name' }).success).toBe(true)
  })

  it('passes with empty object (no fields required on update)', () => {
    expect(updateEmployeeSchema.safeParse({}).success).toBe(true)
  })
})
