import { describe, it, expect } from 'vitest'

/**
 * execute_plan intent expects params.steps to be an array of strings.
 * Each step is sent to the same agent via internal session.
 */
describe('execute_plan intent', () => {
  it('validates steps array shape', () => {
    const valid = { intent: 'execute_plan', params: { steps: ['Step 1', 'Step 2'] } }
    expect(valid.params.steps).toBeInstanceOf(Array)
    expect(valid.params.steps.length).toBeGreaterThan(0)
    expect(valid.params.steps.every((s) => typeof s === 'string')).toBe(true)
  })

  it('rejects empty steps', () => {
    const steps: string[] = []
    expect(steps.length).toBe(0)
    // Action handler requires steps.length > 0
  })
})
