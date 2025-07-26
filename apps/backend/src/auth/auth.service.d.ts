import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorHandlerService } from '../common/errors/error-handler.service';
import { EmailService } from '../email/email.service';
import type { AuthUser } from '@tenantflow/types-core';
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
export interface ValidatedUser extends Omit<AuthUser, 'createdAt' | 'updatedAt' | 'name' | 'avatarUrl'> {
    name: string | undefined;
    avatarUrl: string | undefined;
    createdAt: string;
    updatedAt: string;
    stripeCustomerId: string | null;
}
export declare class AuthService {
    private configService;
    private prisma;
    private errorHandler;
    private emailService;
    private readonly logger;
    private supabase;
    constructor(configService: ConfigService, prisma: PrismaService, errorHandler: ErrorHandlerService, emailService: EmailService);
    validateSupabaseToken(token: string): Promise<ValidatedUser>;
    syncUserWithDatabase(supabaseUser: SupabaseUser): Promise<ValidatedUser>;
    getUserBySupabaseId(supabaseId: string): Promise<ValidatedUser | null>;
    updateUserProfile(supabaseId: string, updates: {
        name?: string;
        phone?: string;
        bio?: string;
        avatarUrl?: string;
    }): Promise<{
        user: ValidatedUser;
    }>;
    getUserByEmail(email: string): Promise<ValidatedUser | null>;
    userHasRole(supabaseId: string, role: string): Promise<boolean>;
    getUserStats(): Promise<{
        total: number;
        byRole: {
            owners: number;
            managers: number;
            tenants: number;
        };
    }>;
    createUser(userData: {
        email: string;
        name: string;
        password?: string;
    }): Promise<{
        user: {
            id: string;
            email: string;
            name: string;
        };
        access_token: string;
        refresh_token: string;
    }>;
    deleteUser(supabaseId: string): Promise<void>;
    testSupabaseConnection(): Promise<{
        connected: boolean;
        auth?: object;
    }>;
}
//# sourceMappingURL=auth.service.d.ts.map