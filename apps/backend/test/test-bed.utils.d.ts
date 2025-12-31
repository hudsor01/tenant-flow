type Constructor<T> = new (...args: unknown[]) => T
type UnitRef = {
	get: <TDep>(token: Constructor<TDep>) => TDep
}
export interface TestBedResult<T> {
	unit: T
	unitRef: UnitRef
	get: <TDep>(token: Constructor<TDep>) => TDep
}
export declare function createTestBed<T>(
	classType: Constructor<T>
): Promise<TestBedResult<T>>
export declare function createTestBedWithOverrides<T>(
	classType: Constructor<T>,
	customProviders: Array<unknown>
): Promise<TestBedResult<T>>
export declare function createSupabaseChainMock(finalResult?: {
	data: unknown
	error: unknown
}): Record<string, jest.Mock> & {
	then?: jest.Mock
}
export declare function createMockConfigService(
	env?: Record<string, string | number | boolean>
): {
	get: jest.Mock<unknown, [key: string, defaultValue?: unknown], unknown>
	getOrThrow: jest.Mock<
		string | number | boolean | undefined,
		[key: string],
		unknown
	>
}
export declare function createMockLogger(): {
	log: jest.Mock<unknown, unknown[], unknown>
	error: jest.Mock<unknown, unknown[], unknown>
	warn: jest.Mock<unknown, unknown[], unknown>
	debug: jest.Mock<unknown, unknown[], unknown>
	verbose: jest.Mock<unknown, unknown[], unknown>
	setContext: jest.Mock<unknown, unknown[], unknown>
	setLogLevels: jest.Mock<unknown, unknown[], unknown>
}
export declare function createMockCacheManager(): {
	get: jest.Mock<Promise<unknown>, [key: string], unknown>
	set: jest.Mock<Promise<void>, [key: string, value: unknown], unknown>
	del: jest.Mock<Promise<void>, [key: string], unknown>
	reset: jest.Mock<Promise<void>, [], unknown>
	wrap: jest.Mock<
		Promise<unknown>,
		[key: string, fn: () => Promise<unknown>],
		unknown
	>
}
export declare const TestCleanup: {
	clearMocks: () => void
	resetMocks: () => void
	restoreMocks: () => void
}
//# sourceMappingURL=test-bed.utils.d.ts.map
