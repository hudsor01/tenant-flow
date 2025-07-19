import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'nestjs-prisma';
type UserRole = 'ADMIN' | 'OWNER' | 'TENANT' | 'MANAGER';
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
export interface ValidatedUser {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    role: UserRole;
    phone: string | null;
    createdAt: string;
    updatedAt: string;
    emailVerified: boolean;
    bio: string | null;
    supabaseId: string;
    stripeCustomerId: string | null;
}
export declare class AuthService {
    private configService;
    private prisma;
    private readonly logger;
    private supabase;
    constructor(configService: ConfigService, prisma: PrismaService);
    validateSupabaseToken(token: string): Promise<ValidatedUser>;
    private syncUserWithDatabase;
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
    deleteUser(supabaseId: string): Promise<void>;
    testSupabaseConnection(): Promise<{
        connected: boolean;
        auth?: object;
    }>;
}
export {};
//# sourceMappingURL=auth.service.d.ts.map