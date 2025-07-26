import { z } from 'zod';
export declare const userRoleSchema: z.ZodEnum<["ADMIN", "OWNER", "TENANT", "MANAGER"]>;
export declare const userSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    role: z.ZodEnum<["ADMIN", "OWNER", "TENANT", "MANAGER"]>;
    phone: z.ZodOptional<z.ZodString>;
    avatarUrl: z.ZodOptional<z.ZodString>;
    emailVerified: z.ZodBoolean;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    createdAt: string;
    updatedAt: string;
    id: string;
    email: string;
    role: "ADMIN" | "OWNER" | "TENANT" | "MANAGER";
    emailVerified: boolean;
    name?: string | undefined;
    avatarUrl?: string | undefined;
    phone?: string | undefined;
}, {
    createdAt: string;
    updatedAt: string;
    id: string;
    email: string;
    role: "ADMIN" | "OWNER" | "TENANT" | "MANAGER";
    emailVerified: boolean;
    name?: string | undefined;
    avatarUrl?: string | undefined;
    phone?: string | undefined;
}>;
export declare const updateProfileSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    avatarUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    avatarUrl?: string | undefined;
    phone?: string | undefined;
}, {
    name?: string | undefined;
    avatarUrl?: string | undefined;
    phone?: string | undefined;
}>;
export declare const profileUpdateResponseSchema: z.ZodObject<{
    user: z.ZodObject<{
        id: z.ZodString;
        email: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        role: z.ZodEnum<["ADMIN", "OWNER", "TENANT", "MANAGER"]>;
        phone: z.ZodOptional<z.ZodString>;
        avatarUrl: z.ZodOptional<z.ZodString>;
        emailVerified: z.ZodBoolean;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        createdAt: string;
        updatedAt: string;
        id: string;
        email: string;
        role: "ADMIN" | "OWNER" | "TENANT" | "MANAGER";
        emailVerified: boolean;
        name?: string | undefined;
        avatarUrl?: string | undefined;
        phone?: string | undefined;
    }, {
        createdAt: string;
        updatedAt: string;
        id: string;
        email: string;
        role: "ADMIN" | "OWNER" | "TENANT" | "MANAGER";
        emailVerified: boolean;
        name?: string | undefined;
        avatarUrl?: string | undefined;
        phone?: string | undefined;
    }>;
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
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
}, {
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
}>;
export declare const sessionSchema: z.ZodObject<{
    user: z.ZodObject<{
        id: z.ZodString;
        email: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        role: z.ZodEnum<["ADMIN", "OWNER", "TENANT", "MANAGER"]>;
        phone: z.ZodOptional<z.ZodString>;
        avatarUrl: z.ZodOptional<z.ZodString>;
        emailVerified: z.ZodBoolean;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        createdAt: string;
        updatedAt: string;
        id: string;
        email: string;
        role: "ADMIN" | "OWNER" | "TENANT" | "MANAGER";
        emailVerified: boolean;
        name?: string | undefined;
        avatarUrl?: string | undefined;
        phone?: string | undefined;
    }, {
        createdAt: string;
        updatedAt: string;
        id: string;
        email: string;
        role: "ADMIN" | "OWNER" | "TENANT" | "MANAGER";
        emailVerified: boolean;
        name?: string | undefined;
        avatarUrl?: string | undefined;
        phone?: string | undefined;
    }>;
    isValid: z.ZodBoolean;
    expiresAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
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
}, {
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
}>;
//# sourceMappingURL=auth.schemas.d.ts.map