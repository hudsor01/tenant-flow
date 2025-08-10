/**
 * Authentication and user management types
 * All types related to users, authentication, and user roles
 */
import type { USER_ROLE } from '../constants/auth';
export type UserRole = typeof USER_ROLE[keyof typeof USER_ROLE];
export interface User {
    id: string;
    supabaseId: string;
    stripeCustomerId: string | null;
    email: string;
    name: string | null;
    phone: string | null;
    bio: string | null;
    avatarUrl: string | null;
    role: UserRole;
    organizationId: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface AuthUser extends User {
    emailVerified: boolean;
    organizationName?: string;
    permissions?: string[];
    subscription?: {
        status: string;
        plan: string;
        expiresAt?: Date;
    };
}
export interface AuthResponse {
    user: {
        id: string;
        email: string;
        name?: string;
        role: UserRole;
    };
    message: string;
}
export interface SupabaseJwtPayload {
    sub: string;
    email: string;
    email_confirmed_at?: string;
    user_metadata?: {
        name?: string;
        full_name?: string;
        avatar_url?: string;
    };
    app_metadata?: {
        provider?: string;
        providers?: string[];
    };
    iat: number;
    exp: number;
    aud?: string;
    iss?: string;
}
//# sourceMappingURL=auth.d.ts.map