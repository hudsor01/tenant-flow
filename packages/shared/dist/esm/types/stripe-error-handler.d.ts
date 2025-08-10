export interface ExecuteContext {
    operation: string;
    resource: string;
    metadata?: Record<string, string | number | boolean | null | undefined>;
}
export interface RetryConfig {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
}
export interface ExecuteParams<T> {
    execute: () => Promise<T>;
    context: ExecuteContext;
    retryConfig?: RetryConfig;
}
export interface AsyncWrapParams {
    operation: string;
    resource: string;
    metadata?: Record<string, string | number | boolean | null | undefined>;
}
//# sourceMappingURL=stripe-error-handler.d.ts.map