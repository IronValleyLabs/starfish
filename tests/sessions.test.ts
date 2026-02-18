import { describe, it, expect } from 'vitest'

describe('sessions', () => {
  it('session list item has conversationId and agentId', () => {
    const session = { conversationId: 'telegram_123', agentId: 'mini-jelly-abc' }
    expect(session).toHaveProperty('conversationId')
    expect(session).toHaveProperty('agentId')
  })

  it('internal conversationId format is internal:session:requestId', () => {
    const requestId = 'abc-uuid'
    const convId = 'internal:session:' + requestId
    expect(convId.startsWith('internal:session:')).toBe(true)
    expect(convId.replace('internal:session:', '')).toBe(requestId)
  })
})
