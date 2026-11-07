/**
 * `supabase.rpc` for a test whose code under test may page the result.
 *
 * The real builder is awaitable and also has `.order()` and `.range()`
 * (fetchEveryPropertyPerformanceRow pages get_property_performance_analytics
 * that way). This wraps a mocked `rpc` so that awaiting the call, or awaiting
 * it after any `.order()`/`.range()`, yields what the mock returned, and the
 * mock still records each call's name and arguments. A page shorter than the
 * page size ends the read, so a fixture of fewer rows is read in one call.
 */
export function pagedRpc(rpc: (...args: unknown[]) => unknown) {
	return (...args: unknown[]) => {
		const result = Promise.resolve(rpc(...args));
		const builder = Object.assign(result, {
			order: () => builder,
			range: () => result,
		});
		return builder;
	};
}
