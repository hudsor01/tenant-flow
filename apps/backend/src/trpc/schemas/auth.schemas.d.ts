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
    id: string;
    createdAt: string;
    updatedAt: string;
    role: "OWNER" | "MANAGER" | "TENANT" | "ADMIN";
    email: string;
    emailVerified: boolean;
    name?: string | undefined;
    phone?: string | undefined;
    avatarUrl?: string | undefined;
}, {
    id: string;
    createdAt: string;
    updatedAt: string;
    role: "OWNER" | "MANAGER" | "TENANT" | "ADMIN";
    email: string;
    emailVerified: boolean;
    name?: string | undefined;
    phone?: string | undefined;
    avatarUrl?: string | undefined;
}>;
export declare const updateProfileSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    avatarUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    phone?: string | undefined;
    avatarUrl?: string | undefined;
}, {
    name?: string | undefined;
    phone?: string | undefined;
    avatarUrl?: string | undefined;
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
        id: string;
        createdAt: string;
        updatedAt: string;
        role: "OWNER" | "MANAGER" | "TENANT" | "ADMIN";
        email: string;
        emailVerified: boolean;
        name?: string | undefined;
        phone?: string | undefined;
        avatarUrl?: string | undefined;
    }, {
        id: string;
        createdAt: string;
        updatedAt: string;
        role: "OWNER" | "MANAGER" | "TENANT" | "ADMIN";
        email: string;
        emailVerified: boolean;
        name?: string | undefined;
        phone?: string | undefined;
        avatarUrl?: string | undefined;
    }>;
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
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
}, {
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
        id: string;
        createdAt: string;
        updatedAt: string;
        role: "OWNER" | "MANAGER" | "TENANT" | "ADMIN";
        email: string;
        emailVerified: boolean;
        name?: string | undefined;
        phone?: string | undefined;
        avatarUrl?: string | undefined;
    }, {
        id: string;
        createdAt: string;
        updatedAt: string;
        role: "OWNER" | "MANAGER" | "TENANT" | "ADMIN";
        email: string;
        emailVerified: boolean;
        name?: string | undefined;
        phone?: string | undefined;
        avatarUrl?: string | undefined;
    }>;
    isValid: z.ZodBoolean;
    expiresAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
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
}, {
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
}>;
//# sourceMappingURL=auth.schemas.d.ts.map