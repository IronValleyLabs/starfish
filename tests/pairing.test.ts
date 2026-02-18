import { describe, it, expect } from 'vitest'
import { peerId, isApproved, approveByCode } from '../packages/vision/src/lib/pairing'

describe('pairing', () => {
  it('peerId returns platform:userId', () => {
    expect(peerId('telegram', '123')).toBe('telegram:123')
  })
  it('isApproved returns true when in list', () => {
    expect(isApproved({ approved: ['telegram:123'], pending: {} }, 'telegram', '123')).toBe(true)
  })
  it('approveByCode moves pending to approved', () => {
    const data = { approved: [], pending: { C1: { platform: 'telegram', userId: '1', createdAt: 0 } } }
    const r = approveByCode(data, 'C1')
    expect(r).not.toBeNull()
    expect(r!.approved).toBe('telegram:1')
  })
})
