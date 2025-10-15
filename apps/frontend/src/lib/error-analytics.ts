export async function trackRenderError(
	error: Error,
	context?: Record<string, unknown>,
	meta?: Record<string, unknown>
) {
	// reference to avoid unused var lint in stub
	void error
	void context
	void meta
	return Promise.resolve()
}
