import { z } from 'zod';
import type { AuthService } from '../../auth/auth.service';
import type { EmailService } from '../../email/email.service';
export declare const createAuthRouter: (authService: AuthService, emailService?: EmailService) => import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../context/app.context").Context;
    meta: object;
    errorShape: {
        data: {
            zodError: z.typeToFlattenedError<any, string> | null;
            code: import("@trpc/server").TRPC_ERROR_CODE_KEY;
            httpStatus: number;
            path?: string;
            stack?: string;
        };
        message: string;
        code: import("@trpc/server").TRPC_ERROR_CODE_NUMBER;
    };
    transformer: true;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    me: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            createdAt: string;
            updatedAt: string;
            id: string;
            email: string;
            role: "ADMIN" | "OWNER" | "TENANT" | "MANAGER";
            emailVerified: boolean;
            name?: string | undefined;
            avatarUrl?: string | undefined;
            phone?: string | undefined;
        };
        meta: object;
    }>;
    updateProfile: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name?: string | undefined;
            avatarUrl?: string | undefined;
            phone?: string | undefined;
        };
        output: {
            message: string;
            user: {
                createdAt: string;
                updatedAt: string;
                id: string;
                email: string;
                role: "ADMIN" | "OWNER" | "TENANT" | "MANAGER";
                emailVerified: boolean;
                name?: string | undefined;
                avatarUrl?: string | undefined;
                phone?: string | undefined;
            };
        };
        meta: object;
    }>;
    validateSession: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            user: {
                createdAt: string;
                updatedAt: string;
                id: string;
                email: string;
                role: "ADMIN" | "OWNER" | "TENANT" | "MANAGER";
                emailVerified: boolean;
                name?: string | undefined;
                avatarUrl?: string | undefined;
                phone?: string | undefined;
            };
            isValid: boolean;
            expiresAt: string;
        };
        meta: object;
    }>;
    sendWelcomeEmail: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name: string;
            email: string;
        };
        output: {
            message: string;
            success: boolean;
            messageId?: string | undefined;
        };
        meta: object;
    }>;
}>>;
export declare const authRouter: (authService: AuthService, emailService?: EmailService) => import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../context/app.context").Context;
    meta: object;
    errorShape: {
        data: {
            zodError: z.typeToFlattenedError<any, string> | null;
            code: import("@trpc/server").TRPC_ERROR_CODE_KEY;
            httpStatus: number;
            path?: string;
            stack?: string;
        };
        message: string;
        code: import("@trpc/server").TRPC_ERROR_CODE_NUMBER;
    };
    transformer: true;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    me: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            createdAt: string;
            updatedAt: string;
            id: string;
            email: string;
            role: "ADMIN" | "OWNER" | "TENANT" | "MANAGER";
            emailVerified: boolean;
            name?: string | undefined;
            avatarUrl?: string | undefined;
            phone?: string | undefined;
        };
        meta: object;
    }>;
    updateProfile: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name?: string | undefined;
            avatarUrl?: string | undefined;
            phone?: string | undefined;
        };
        output: {
            message: string;
            user: {
                createdAt: string;
                updatedAt: string;
                id: string;
                email: string;
                role: "ADMIN" | "OWNER" | "TENANT" | "MANAGER";
                emailVerified: boolean;
                name?: string | undefined;
                avatarUrl?: string | undefined;
                phone?: string | undefined;
            };
        };
        meta: object;
    }>;
    validateSession: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            user: {
                createdAt: string;
                updatedAt: string;
                id: string;
                email: string;
                role: "ADMIN" | "OWNER" | "TENANT" | "MANAGER";
                emailVerified: boolean;
                name?: string | undefined;
                avatarUrl?: string | undefined;
                phone?: string | undefined;
            };
            isValid: boolean;
            expiresAt: string;
        };
        meta: object;
    }>;
    sendWelcomeEmail: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name: string;
            email: string;
        };
        output: {
            message: string;
            success: boolean;
            messageId?: string | undefined;
        };
        meta: object;
    }>;
}>>;
//# sourceMappingURL=auth.router.d.ts.map