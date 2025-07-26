/**
 * Authentication & Authorization Types
 * Centralized type definitions for user authentication and authorization
 */
export declare const USER_ROLE: {
    readonly ADMIN: "ADMIN";
    readonly OWNER: "OWNER";
    readonly TENANT: "TENANT";
    readonly MANAGER: "MANAGER";
};
export type UserRole = typeof USER_ROLE[keyof typeof USER_ROLE];
export interface User {
    id: string;
    email: string;
    role: UserRole;
    name: string | null;
    phone: string | null;
    avatarUrl: string | null;
    bio: string | null;
    supabaseId: string;
    stripeCustomerId: string | null;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface AuthUser {
    id: string;
    email: string;
    role: UserRole;
    phone?: string | null;
    name?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
    supabaseId?: string;
    stripeCustomerId?: string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    emailVerified?: boolean;
}
export interface AuthenticatedContext {
    user: AuthUser;
}
export interface AuthResponse {
    user: User;
    accessToken: string;
    refreshToken?: string;
    expiresAt: Date;
}
export interface SupabaseJwtPayload {
    sub: string;
    email?: string;
    role?: string;
    aud: string;
    exp: number;
    iat: number;
}
export interface SupabaseUser {
    id: string;
    email?: string;
    email_confirmed_at?: string;
    user_metadata?: {
        name?: string;
        full_name?: string;
        avatar_url?: string;
    };
    created_at?: string;
    updated_at?: string;
}
