export interface TestBedResult<T> {
    unit: T;
    unitRef: any;
    get: <TDep>(token: new (...args: any[]) => TDep) => any;
}
export declare function createTestBed<T>(classType: new (...args: any[]) => T): Promise<TestBedResult<T>>;
export declare function createTestBedWithOverrides<T>(classType: new (...args: any[]) => T, customProviders: any[]): Promise<TestBedResult<T>>;
export declare function createSupabaseChainMock(finalResult?: {
    data: any;
    error: any;
}): any;
export declare function createMockConfigService(env?: Record<string, string | number | boolean>): {
    get: jest.Mock<any, [key: string, defaultValue?: any], any>;
    getOrThrow: jest.Mock<string | number | boolean | undefined, [key: string], any>;
};
export declare function createMockLogger(): {
    log: jest.Mock<any, any, any>;
    error: jest.Mock<any, any, any>;
    warn: jest.Mock<any, any, any>;
    debug: jest.Mock<any, any, any>;
    verbose: jest.Mock<any, any, any>;
    setContext: jest.Mock<any, any, any>;
    setLogLevels: jest.Mock<any, any, any>;
};
export declare function createMockCacheManager(): {
    get: jest.Mock<Promise<any>, [key: string], any>;
    set: jest.Mock<Promise<void>, [key: string, value: any], any>;
    del: jest.Mock<Promise<void>, [key: string], any>;
    reset: jest.Mock<Promise<void>, [], any>;
    wrap: jest.Mock<Promise<any>, [key: string, fn: () => Promise<any>], any>;
};
export declare const TestCleanup: {
    clearMocks: () => void;
    resetMocks: () => void;
    restoreMocks: () => void;
};
//# sourceMappingURL=test-bed.utils.d.ts.map