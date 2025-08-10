/**
 * User management related types shared between frontend and backend
 */
/**
 * Result of user creation operation
 */
export interface UserCreationResult {
    success: boolean;
    userId?: string;
    error?: string;
    action?: string;
    details?: Record<string, string | number | boolean | null>;
}
/**
 * Options for user creation
 */
export interface UserCreationOptions {
    role?: 'OWNER' | 'TENANT' | 'MANAGER' | 'ADMIN';
    name?: string;
    maxRetries?: number;
    retryDelayMs?: number;
}
/**
 * User update options
 */
export interface UserUpdateOptions {
    name?: string;
    email?: string;
    avatarUrl?: string;
    role?: 'OWNER' | 'TENANT' | 'MANAGER' | 'ADMIN';
}
//# sourceMappingURL=user-management.d.ts.map