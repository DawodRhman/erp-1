import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { validate } from '../../src/middleware/validate-middleware.js'

const schema = z.object({ name: z.string() })

describe('validate middleware', () => {
  it('calls next() and sets req.body when valid', () => {
    const middleware = validate(schema)
    const req = { body: { name: 'Ahmed', extra: 'stripped' } }
    const res = {}
    const next = vi.fn()
    middleware(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(req.body).toEqual({ name: 'Ahmed' })
  })

  it('returns 422 with issues when body is invalid', () => {
    const middleware = validate(schema)
    const req = { body: {} }
    const json = vi.fn()
    const res = { status: vi.fn(() => ({ json })) }
    const next = vi.fn()
    middleware(req, res, next)
    expect(res.status).toHaveBeenCalledWith(422)
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Validation failed',
      issues: expect.arrayContaining([
        expect.objectContaining({ field: 'name' })
      ])
    }))
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 422 when body is not an object', () => {
    const middleware = validate(schema)
    const req = { body: null }
    const json = vi.fn()
    const res = { status: vi.fn(() => ({ json })) }
    const next = vi.fn()
    middleware(req, res, next)
    expect(res.status).toHaveBeenCalledWith(422)
    expect(next).not.toHaveBeenCalled()
  })
})
