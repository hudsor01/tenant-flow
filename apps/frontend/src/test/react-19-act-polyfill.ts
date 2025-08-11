/**
 * React 19 + Testing Library Compatibility Polyfill
 *
 * React 19 removed React.act but @testing-library/react still expects it.
 * This polyfill provides the missing act function for compatibility.
 */

// Suppress the deprecation warning for ReactDOMTestUtils.act
const originalConsoleError = console.error
console.error = (...args: unknown[]) => {
	if (
		typeof args[0] === 'string' &&
		args[0].includes('ReactDOMTestUtils.act') &&
		args[0].includes('deprecated')
	) {
		return // Suppress act deprecation warnings
	}
	originalConsoleError.apply(console, args)
}

// Simple act implementation that just calls the callback
// This is sufficient for most test cases
const act = (callback: (() => void) | (() => Promise<void>)) => {
	const result = callback()
	if (result && typeof result.then === 'function') {
		return result
	}
	return Promise.resolve()
}

// Patch React to include act for Testing Library compatibility
import * as React from 'react'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(React as any).act = act

// Export for direct use if needed
export { act }
