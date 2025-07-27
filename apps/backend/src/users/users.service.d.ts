import { PrismaService } from 'nestjs-prisma';
export interface UserCreationResult {
    success: boolean;
    userId?: string;
    error?: string;
    action?: string;
    details?: Record<string, string | number | boolean | null>;
}
export interface UserCreationOptions {
    role?: 'OWNER' | 'TENANT' | 'MANAGER' | 'ADMIN';
    name?: string;
    maxRetries?: number;
    retryDelayMs?: number;
}
export declare class UsersService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getUserById(id: string): Promise<{
        createdAt: Date;
        updatedAt: Date;
        name: string | null;
        avatarUrl: string | null;
        id: string;
        email: string;
        phone: string | null;
        bio: string | null;
        role: import("@prisma/client").$Enums.UserRole;
    } | null>;
    updateUser(id: string, data: {
        stripeCustomerId?: string;
        name?: string;
        email?: string;
        [key: string]: unknown;
    }): Promise<{
        createdAt: Date;
        updatedAt: Date;
        name: string | null;
        avatarUrl: string | null;
        stripeCustomerId: string | null;
        id: string;
        email: string;
        phone: string | null;
        bio: string | null;
        supabaseId: string;
        role: import("@prisma/client").$Enums.UserRole;
    }>;
    updateUserProfile(id: string, data: {
        name?: string;
        phone?: string;
        bio?: string;
        avatarUrl?: string;
    }): Promise<{
        createdAt: Date;
        updatedAt: Date;
        name: string | null;
        avatarUrl: string | null;
        id: string;
        email: string;
        phone: string | null;
        bio: string | null;
        role: import("@prisma/client").$Enums.UserRole;
    }>;
    checkUserExists(userId: string): Promise<boolean>;
    ensureUserExists(authUser: {
        id: string;
        email: string;
        user_metadata?: {
            name?: string;
            full_name?: string;
        };
    }, options?: UserCreationOptions): Promise<UserCreationResult>;
    private createUser;
    private isNonRetryableError;
    verifyUserCreation(userId: string): Promise<boolean>;
}
//# sourceMappingURL=users.service.d.ts.map