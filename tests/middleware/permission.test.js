import { describe, it, expect, vi } from 'vitest'
import { requirePermission } from '../../src/middleware/permission-middleware.js'

describe('requirePermission middleware', () => {
  it('calls next() immediately for super_admin without checking permissions', async () => {
    const middleware = requirePermission('employees:write')
    const req = { user: { is_super_admin: true } }
    const res = {}
    const next = vi.fn()
    await middleware(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(req.permissions).toBeUndefined()
  })

  it('calls next() when cached permissions contain the key', async () => {
    const middleware = requirePermission('attendance:read')
    const req = {
      user: { is_super_admin: false, role_id: 'role-abc' },
      permissions: new Set(['attendance:read', 'employees:read'])
    }
    const res = {}
    const next = vi.fn()
    await middleware(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('returns 403 when cached permissions do NOT contain the key', async () => {
    const middleware = requirePermission('attendance:write')
    const req = {
      user: { is_super_admin: false, role_id: 'role-abc' },
      permissions: new Set(['attendance:read'])
    }
    const json = vi.fn()
    const res = { status: vi.fn(() => ({ json })) }
    const next = vi.fn()
    await middleware(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when req.user is missing', async () => {
    const middleware = requirePermission('employees:read')
    const req = {}
    const json = vi.fn()
    const res = { status: vi.fn(() => ({ json })) }
    const next = vi.fn()
    await middleware(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })
})
