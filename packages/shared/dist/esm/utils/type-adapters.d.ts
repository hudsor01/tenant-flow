/**
 * Type Adapter Utilities
 * Provides type-safe bridges between domain types and API layer requirements
 */
/**
 * Generic type adapter interface that ensures type safety while satisfying API requirements
 */
export interface TypeAdapter<TDomain, TApi extends Record<string, unknown>> {
    toApi: (domain: TDomain) => TApi;
    fromApi: (api: TApi) => TDomain;
}
/**
 * Creates a type-safe query parameter adapter
 * Ensures domain query types are properly converted to API-compatible formats
 */
export declare function createQueryAdapter<T extends Record<string, unknown>>(query?: T): Record<string, unknown>;
/**
 * Creates a type-safe mutation data adapter
 * Ensures domain input types are properly converted to API-compatible formats
 */
export declare function createMutationAdapter<T extends Record<string, unknown>>(data: T): Record<string, unknown>;
/**
 * Type-safe parameter validator that ensures required fields are present
 */
export declare function validateApiParams<T extends Record<string, unknown>>(params: T, requiredFields: (keyof T)[]): asserts params is T & Required<Pick<T, typeof requiredFields[number]>>;
/**
 * Creates a type-safe response adapter
 * Converts API responses back to domain types with proper type checking
 */
export declare function createResponseAdapter<TApi, TDomain>(apiData: TApi, transformer: (data: TApi) => TDomain): TDomain;
/**
 * Enum validation helper
 * Ensures enum values are valid and provides type safety
 */
export declare function validateEnumValue<T extends Record<string, string>>(value: string, enumObject: T, fallback?: T[keyof T]): T[keyof T];
/**
 * Utility to safely convert strings to numbers for query parameters
 */
export declare function safeParseNumber(value: string | number | undefined): number | undefined;
/**
 * Utility to safely convert strings to dates for API parameters
 */
export declare function safeParseDate(value: string | Date | undefined): Date | undefined;
/**
 * Type-safe deep merge utility for combining API parameters
 */
export declare function mergeApiParams<T extends Record<string, unknown>, U extends Record<string, unknown>>(base: T, override: U): T & U;
/**
 * Creates a typed API call wrapper that ensures proper parameter conversion
 */
export declare function createApiCall<TParams extends Record<string, unknown>>(endpoint: string, method?: 'GET' | 'POST' | 'PUT' | 'DELETE'): {
    endpoint: string;
    method: string;
    prepareParams: (params: TParams) => Record<string, unknown>;
    prepareData: (data: TParams) => Record<string, unknown>;
};
export declare function isValidQueryParam(value: unknown): value is string | number | boolean;
export declare function isValidMutationData(value: unknown): value is Record<string, unknown>;
/**
 * Error handling utilities for type adapter operations
 */
export declare class TypeAdapterError extends Error {
    readonly operation: 'query' | 'mutation' | 'response';
    readonly originalData: unknown;
    constructor(message: string, operation: 'query' | 'mutation' | 'response', originalData: unknown);
}
export declare function handleAdapterError(error: unknown, operation: 'query' | 'mutation' | 'response', data: unknown): never;
//# sourceMappingURL=type-adapters.d.ts.map