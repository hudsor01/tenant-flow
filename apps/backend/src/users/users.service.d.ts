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
    constructor(prisma: PrismaService);
    getUserById(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        role: import("@prisma/client").$Enums.UserRole;
        email: string;
        name: string | null;
        phone: string | null;
        bio: string | null;
        avatarUrl: string | null;
    } | null>;
    updateUserProfile(id: string, data: {
        name?: string;
        phone?: string;
        bio?: string;
        avatarUrl?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        role: import("@prisma/client").$Enums.UserRole;
        email: string;
        name: string | null;
        phone: string | null;
        bio: string | null;
        avatarUrl: string | null;
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