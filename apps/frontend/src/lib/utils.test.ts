import { describe, it, expect } from 'vitest'

// Simple smoke test to verify test infrastructure
describe('Test Infrastructure', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2)
  })

  it('should handle string operations', () => {
    const str = 'Hello World'
    expect(str.toLowerCase()).toBe('hello world')
    expect(str.includes('World')).toBe(true)
  })

  it('should work with arrays', () => {
    const arr = [1, 2, 3]
    expect(arr.length).toBe(3)
    expect(arr.includes(2)).toBe(true)
  })
})