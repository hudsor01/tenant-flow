export async function recoverFromError(
	error: Error,
	context?: { entityType?: string; operation?: string },
	options?: { showToast?: boolean }
) {
	void error
	void context
	void options
	// noop in test/typecheck environment
	return Promise.resolve()
}
