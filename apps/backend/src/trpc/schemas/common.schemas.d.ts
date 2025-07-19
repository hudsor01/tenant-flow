import { z } from 'zod';
export declare const uuidSchema: z.ZodString;
export declare const emailSchema: z.ZodString;
export declare const nonEmptyStringSchema: z.ZodString;
export declare const positiveNumberSchema: z.ZodNumber;
export declare const nonNegativeNumberSchema: z.ZodNumber;
export declare const paginationSchema: z.ZodObject<{
    offset: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    limit: string;
    offset: string;
}, {
    limit?: string | undefined;
    offset?: string | undefined;
}>;
export declare const paginationQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
}, {
    limit?: number | undefined;
    page?: number | undefined;
}>;
export declare const paginationResponseSchema: z.ZodObject<{
    total: z.ZodNumber;
    page: z.ZodNumber;
    limit: z.ZodNumber;
    totalPages: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    total: number;
    limit: number;
    page: number;
    totalPages: number;
}, {
    total: number;
    limit: number;
    page: number;
    totalPages: number;
}>;
export declare const dateStringSchema: z.ZodString;
export declare const dateRangeSchema: z.ZodObject<{
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    endDate?: string | undefined;
    startDate?: string | undefined;
}, {
    endDate?: string | undefined;
    startDate?: string | undefined;
}>;
export declare const idSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const timestampFieldsSchema: z.ZodObject<{
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    createdAt: string;
    updatedAt: string;
}, {
    createdAt: string;
    updatedAt: string;
}>;
export declare const statusSchema: z.ZodEnum<["ACTIVE", "INACTIVE", "PENDING", "COMPLETED", "FAILED"]>;
export declare const sortOrderSchema: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
export declare const searchSchema: z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    sortOrder: "asc" | "desc";
    search?: string | undefined;
    sortBy?: string | undefined;
}, {
    search?: string | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export declare const baseQuerySchema: z.ZodObject<{
    offset: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodString>>;
} & {
    search: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
} & {
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit: string;
    offset: string;
    sortOrder: "asc" | "desc";
    endDate?: string | undefined;
    startDate?: string | undefined;
    search?: string | undefined;
    sortBy?: string | undefined;
}, {
    endDate?: string | undefined;
    startDate?: string | undefined;
    search?: string | undefined;
    limit?: string | undefined;
    offset?: string | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export declare const successResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    message?: string | undefined;
}, {
    success: boolean;
    message?: string | undefined;
}>;
export declare const errorResponseSchema: z.ZodObject<{
    error: z.ZodString;
    message: z.ZodString;
    code: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    error: string;
    message: string;
    code?: string | undefined;
}, {
    error: string;
    message: string;
    code?: string | undefined;
}>;
export declare const metadataSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>>>;
export declare const auditFieldsSchema: z.ZodObject<{
    createdBy: z.ZodOptional<z.ZodString>;
    updatedBy: z.ZodOptional<z.ZodString>;
} & {
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    createdAt: string;
    updatedAt: string;
    createdBy?: string | undefined;
    updatedBy?: string | undefined;
}, {
    createdAt: string;
    updatedAt: string;
    createdBy?: string | undefined;
    updatedBy?: string | undefined;
}>;
export declare const createPaginatedResponseSchema: <T extends z.ZodTypeAny>(dataSchema: T) => z.ZodObject<{
    data: z.ZodArray<T, "many">;
    pagination: z.ZodObject<{
        total: z.ZodNumber;
        page: z.ZodNumber;
        limit: z.ZodNumber;
        totalPages: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        total: number;
        limit: number;
        page: number;
        totalPages: number;
    }, {
        total: number;
        limit: number;
        page: number;
        totalPages: number;
    }>;
}, "strip", z.ZodTypeAny, {
    data: T["_output"][];
    pagination: {
        total: number;
        limit: number;
        page: number;
        totalPages: number;
    };
}, {
    data: T["_input"][];
    pagination: {
        total: number;
        limit: number;
        page: number;
        totalPages: number;
    };
}>;
export declare const createApiResponseSchema: <T extends z.ZodTypeAny>(dataSchema: T) => z.ZodObject<{
    success: z.ZodBoolean;
    data: T;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{
    success: z.ZodBoolean;
    data: T;
    message: z.ZodOptional<z.ZodString>;
}>, any> extends infer T_1 ? { [k in keyof T_1]: z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{
    success: z.ZodBoolean;
    data: T;
    message: z.ZodOptional<z.ZodString>;
}>, any>[k]; } : never, z.baseObjectInputType<{
    success: z.ZodBoolean;
    data: T;
    message: z.ZodOptional<z.ZodString>;
}> extends infer T_2 ? { [k_1 in keyof T_2]: z.baseObjectInputType<{
    success: z.ZodBoolean;
    data: T;
    message: z.ZodOptional<z.ZodString>;
}>[k_1]; } : never>;
export declare const createListResponseSchema: <T extends z.ZodTypeAny>(itemSchema: T) => z.ZodObject<{
    items: z.ZodArray<T, "many">;
    total: z.ZodNumber;
    totalAmount: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    total: number;
    items: T["_output"][];
    totalAmount?: number | undefined;
}, {
    total: number;
    items: T["_input"][];
    totalAmount?: number | undefined;
}>;
//# sourceMappingURL=common.schemas.d.ts.map