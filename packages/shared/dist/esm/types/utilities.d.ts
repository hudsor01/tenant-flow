/**
 * Shared Utility Types for TenantFlow
 *
 * Common TypeScript utility types that enhance type safety and developer experience
 * across both frontend and backend applications.
 */
/**
 * Make specific properties of T optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
/**
 * Make specific properties of T required
 */
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;
/**
 * Create a type that excludes null and undefined
 */
export type NonNullable<T> = T extends null | undefined ? never : T;
/**
 * Deep readonly for nested objects
 */
export type DeepReadonly<T> = {
    readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};
/**
 * Deep partial for nested objects
 */
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
/**
 * Extract keys from T where the value extends U
 */
export type KeysOfType<T, U> = {
    [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];
/**
 * Pick properties from T where the value extends U
 */
export type PickByType<T, U> = Pick<T, KeysOfType<T, U>>;
/**
 * Omit properties from T where the value extends U
 */
export type OmitByType<T, U> = Omit<T, KeysOfType<T, U>>;
/**
 * Get the value type of an object property
 */
export type ValueOf<T> = T[keyof T];
/**
 * Create a union type from array values
 */
export type ArrayElement<T extends readonly unknown[]> = T extends readonly (infer U)[] ? U : never;
/**
 * Create a type that represents a function with specific parameters
 */
export type FunctionWithParams<TParams extends readonly unknown[], TReturn = void> = (...params: TParams) => TReturn;
/**
 * Extract the return type of a promise
 */
export type PromiseReturnType<T> = T extends Promise<infer U> ? U : T;
/**
 * Create a type that excludes functions from T
 */
export type NonFunctionKeys<T> = {
    [K in keyof T]: T[K] extends (...args: unknown[]) => unknown ? never : K;
}[keyof T];
export type NonFunctionProps<T> = Pick<T, NonFunctionKeys<T>>;
/**
 * Check if a type is an array
 */
export type IsArray<T> = T extends readonly unknown[] ? true : false;
/**
 * Check if a type is a function
 */
export type IsFunction<T> = T extends (...args: unknown[]) => unknown ? true : false;
/**
 * Check if a type is a promise
 */
export type IsPromise<T> = T extends Promise<unknown> ? true : false;
/**
 * Check if two types are equal
 */
export type IsEqual<T, U> = [T] extends [U] ? [U] extends [T] ? true : false : false;
/**
 * Check if a type is never
 */
export type IsNever<T> = [T] extends [never] ? true : false;
/**
 * Convert string to camelCase type
 */
export type CamelCase<S extends string> = S extends `${infer P1}_${infer P2}${infer P3}` ? `${P1}${Uppercase<P2>}${CamelCase<P3>}` : S;
/**
 * Convert string to snake_case type
 */
export type SnakeCase<S extends string> = S extends `${infer T}${infer U}` ? `${T extends Capitalize<T> ? '_' : ''}${Lowercase<T>}${SnakeCase<U>}` : S;
/**
 * Convert string to kebab-case type
 */
export type KebabCase<S extends string> = S extends `${infer T}${infer U}` ? `${T extends Capitalize<T> ? '-' : ''}${Lowercase<T>}${KebabCase<U>}` : S;
/**
 * Convert keys of an object to camelCase
 */
export type CamelCaseKeys<T> = {
    [K in keyof T as K extends string ? CamelCase<K> : K]: T[K];
};
/**
 * Convert keys of an object to snake_case
 */
export type SnakeCaseKeys<T> = {
    [K in keyof T as K extends string ? SnakeCase<K> : K]: T[K];
};
/**
 * Merge two types, with the second type taking precedence
 */
export type Merge<A, B> = {
    [K in keyof A | keyof B]: K extends keyof B ? B[K] : K extends keyof A ? A[K] : never;
};
/**
 * Create a type with all properties optional except specified keys
 */
export type OptionalExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;
/**
 * Create a type that represents the difference between two objects
 */
export type Diff<T, U> = Pick<T, Exclude<keyof T, keyof U>>;
/**
 * Create a type that represents the intersection of two objects
 */
export type Intersection<T, U> = Pick<T, Extract<keyof T, keyof U>>;
/**
 * Flatten nested object types
 */
export type Flatten<T> = T extends object ? T extends infer O ? {
    [K in keyof O]: O[K];
} : never : T;
/**
 * Create a type that represents nullable properties
 */
export type Nullable<T> = {
    [P in keyof T]: T[P] | null;
};
/**
 * Create a type that represents optional nullable properties
 */
export type OptionalNullable<T> = {
    [P in keyof T]?: T[P] | null;
};
/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    code?: string;
    timestamp?: string;
}
/**
 * Paginated API response
 */
export type PaginatedApiResponse<T = unknown> = ApiResponse<T[]> & {
    pagination?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
};
/**
 * API error response
 */
export interface ApiErrorResponse {
    success: false;
    error: string;
    message: string;
    code?: string;
    details?: unknown;
    timestamp?: string;
}
/**
 * Form field error type
 */
export interface FieldError {
    message: string;
    type?: string;
}
/**
 * Form errors object
 */
export type FormErrors<T> = {
    [K in keyof T]?: FieldError | string;
};
/**
 * Form validation result
 */
export interface ValidationResult<T = unknown> {
    success: boolean;
    data?: T;
    errors?: FormErrors<T>;
}
/**
 * Form submission state
 */
export interface FormSubmissionState {
    isSubmitting: boolean;
    isSubmitted: boolean;
    submitCount: number;
}
/**
 * Generic event handler type
 */
export type EventHandler<T = Event> = (event: T) => void;
/**
 * Async event handler type
 */
export type AsyncEventHandler<T = Event> = (event: T) => Promise<void>;
/**
 * Base props that all components can extend
 */
export interface BaseProps {
    className?: string;
    id?: string;
    'data-testid'?: string;
}
/**
 * Props for components that can be disabled
 */
export interface DisablableProps {
    disabled?: boolean;
}
/**
 * Props for components with loading state
 */
export interface LoadableProps {
    loading?: boolean;
}
/**
 * Props for components with size variants
 */
export interface SizedProps {
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}
/**
 * Props for components with variant styles
 */
export interface VariantProps<T extends string = string> {
    variant?: T;
}
/**
 * Base state type for stores
 */
export interface BaseState {
    isLoading: boolean;
    error: string | null;
}
/**
 * Data state type for stores that manage data
 */
export type DataState<T> = BaseState & {
    data: T | null;
    lastUpdated: Date | null;
};
/**
 * List state type for stores that manage lists
 */
export type ListState<T> = BaseState & {
    items: T[];
    total: number;
    page: number;
    hasMore: boolean;
};
/**
 * Store actions type
 */
export type StoreActions<T> = {
    [K in keyof T]: T[K] extends (...args: infer Args) => infer Return ? (...args: Args) => Return : never;
};
/**
 * Environment configuration
 */
export type Environment = 'development' | 'staging' | 'production' | 'test';
/**
 * Feature flag configuration
 */
export type FeatureFlags = Record<string, boolean>;
/**
 * API configuration
 */
export interface ApiConfig {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
}
/**
 * Database configuration
 */
export interface DatabaseConfig {
    url: string;
    maxConnections: number;
    connectionTimeout: number;
    queryTimeout: number;
}
/**
 * Date range type
 */
export interface DateRange {
    start: Date;
    end: Date;
}
/**
 * Time period presets
 */
export type TimePeriod = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear' | 'custom';
/**
 * File metadata
 */
export interface FileMetadata {
    name: string;
    size: number;
    type: string;
    lastModified: number;
}
/**
 * Upload progress
 */
export interface UploadProgress {
    loaded: number;
    total: number;
    percentage: number;
}
/**
 * Upload status
 */
export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';
/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';
/**
 * Sort configuration
 */
export interface SortConfig<T extends string = string> {
    field: T;
    direction: SortDirection;
}
/**
 * Filter value types
 */
export type FilterValue = string | number | boolean | Date | null;
/**
 * Filter operator
 */
export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'like' | 'ilike' | 'regex';
/**
 * Filter condition
 */
export interface FilterCondition {
    field: string;
    operator: FilterOperator;
    value: FilterValue | FilterValue[];
}
/**
 * Search and filter configuration
 */
export interface SearchConfig<T extends string = string> {
    query?: string;
    filters?: FilterCondition[];
    sort?: SortConfig<T>[];
    page?: number;
    limit?: number;
}
//# sourceMappingURL=utilities.d.ts.map