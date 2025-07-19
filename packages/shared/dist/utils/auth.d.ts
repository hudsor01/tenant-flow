/**
 * Authentication utilities
 * Helper functions for user role display and management
 */
type UserRole = 'OWNER' | 'MANAGER' | 'TENANT' | 'ADMIN';
export declare const getUserRoleLabel: (role: UserRole) => string;
export declare const getUserRoleColor: (role: UserRole) => string;
export {};
