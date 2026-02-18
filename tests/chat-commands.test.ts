import { describe, it, expect } from 'vitest'

const STATUS_REGEX = /^\/status\s*$/i

describe('chat commands', () => {
  it('/status matches correctly', () => {
    expect(STATUS_REGEX.test('/status')).toBe(true)
    expect(STATUS_REGEX.test('/status  ')).toBe(true)
    expect(STATUS_REGEX.test('/status extra')).toBe(false)
  })
})
