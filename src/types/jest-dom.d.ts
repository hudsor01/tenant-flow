/**
 * Type augmentation for @testing-library/jest-dom with Vitest 4.x.
 *
 * jest-dom@6.x ships types that augment `Assertion` on `declare module 'vitest'`,
 * but Vitest 4.x declares `Assertion` in `@vitest/expect` and only re-exports it.
 * Module augmentation doesn't cross re-export boundaries, so we augment
 * `Matchers` (the unified interface since Vitest 3.2+) instead.
 *
 * Remove this file when @testing-library/jest-dom ships Vitest 4.x-compatible types.
 */
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'

declare module 'vitest' {
	interface Matchers<T = unknown>
		extends TestingLibraryMatchers<typeof expect.stringContaining, T> {}
}
