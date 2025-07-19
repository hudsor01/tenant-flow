import type { z } from 'zod';
import type { AuthService } from '../../auth/auth.service';
export declare const createAuthRouter: (authService: AuthService) => import("@trpc/server").TRPCBuiltRouter<{
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
            id: string;
            createdAt: string;
            updatedAt: string;
            role: "OWNER" | "MANAGER" | "TENANT" | "ADMIN";
            email: string;
            emailVerified: boolean;
            name?: string | undefined;
            phone?: string | undefined;
            avatarUrl?: string | undefined;
        };
        meta: object;
    }>;
    updateProfile: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name?: string | undefined;
            phone?: string | undefined;
            avatarUrl?: string | undefined;
        };
        output: {
            user: {
                id: string;
                createdAt: string;
                updatedAt: string;
                role: "OWNER" | "MANAGER" | "TENANT" | "ADMIN";
                email: string;
                emailVerified: boolean;
                name?: string | undefined;
                phone?: string | undefined;
                avatarUrl?: string | undefined;
            };
            message: string;
        };
        meta: object;
    }>;
    validateSession: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            user: {
                id: string;
                createdAt: string;
                updatedAt: string;
                role: "OWNER" | "MANAGER" | "TENANT" | "ADMIN";
                email: string;
                emailVerified: boolean;
                name?: string | undefined;
                phone?: string | undefined;
                avatarUrl?: string | undefined;
            };
            expiresAt: string;
            isValid: boolean;
        };
        meta: object;
    }>;
}>>;
export declare const authRouter: (authService: AuthService) => import("@trpc/server").TRPCBuiltRouter<{
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
            id: string;
            createdAt: string;
            updatedAt: string;
            role: "OWNER" | "MANAGER" | "TENANT" | "ADMIN";
            email: string;
            emailVerified: boolean;
            name?: string | undefined;
            phone?: string | undefined;
            avatarUrl?: string | undefined;
        };
        meta: object;
    }>;
    updateProfile: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name?: string | undefined;
            phone?: string | undefined;
            avatarUrl?: string | undefined;
        };
        output: {
            user: {
                id: string;
                createdAt: string;
                updatedAt: string;
                role: "OWNER" | "MANAGER" | "TENANT" | "ADMIN";
                email: string;
                emailVerified: boolean;
                name?: string | undefined;
                phone?: string | undefined;
                avatarUrl?: string | undefined;
            };
            message: string;
        };
        meta: object;
    }>;
    validateSession: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            user: {
                id: string;
                createdAt: string;
                updatedAt: string;
                role: "OWNER" | "MANAGER" | "TENANT" | "ADMIN";
                email: string;
                emailVerified: boolean;
                name?: string | undefined;
                phone?: string | undefined;
                avatarUrl?: string | undefined;
            };
            expiresAt: string;
            isValid: boolean;
        };
        meta: object;
    }>;
}>>;
//# sourceMappingURL=auth.router.d.ts.map