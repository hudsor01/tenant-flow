/**
 * Deterministic sleep helper to avoid re-writing this logic across tests.
 */
export function sleep(ms: number) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms)
	})
}
