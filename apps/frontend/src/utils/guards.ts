/**
 * Type guard utilities
 * 
 * TODO: This is a GitHub example that needs proper integration
 */

// Placeholder exports to prevent import errors
export function isLoadable() {
    return false
}

export function isPromise(value: unknown): value is Promise<unknown> {
    return value instanceof Promise
}