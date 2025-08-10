import { z } from 'zod';
export declare const uuidSchema: z.ZodString;
export declare const emailSchema: z.ZodString;
export declare const nonEmptyStringSchema: z.ZodString;
export declare const positiveNumberSchema: z.ZodNumber;
export declare const nonNegativeNumberSchema: z.ZodNumber;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const paginationQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export declare const paginationResponseSchema: z.ZodObject<{
    totalCount: z.ZodNumber;
    totalPages: z.ZodNumber;
    currentPage: z.ZodNumber;
    hasNextPage: z.ZodBoolean;
    hasPreviousPage: z.ZodBoolean;
}, z.core.$strip>;
export declare const dateStringSchema: z.ZodString;
export declare const dateRangeSchema: z.ZodObject<{
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const idSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const timestampFieldsSchema: z.ZodObject<{
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const statusSchema: z.ZodEnum<{
    PENDING: "PENDING";
    COMPLETED: "COMPLETED";
    FAILED: "FAILED";
    ACTIVE: "ACTIVE";
    INACTIVE: "INACTIVE";
}>;
export declare const sortOrderSchema: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
    asc: "asc";
    desc: "desc";
}>>>;
export declare const searchSchema: z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>>;
}, z.core.$strip>;
export declare const baseQuerySchema: z.ZodObject<{
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const successResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const errorResponseSchema: z.ZodObject<{
    error: z.ZodString;
    message: z.ZodString;
    code: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const metadataSchema: z.ZodRecord<z.ZodString, z.ZodUnknown>;
export declare const auditFieldsSchema: z.ZodObject<{
    createdBy: z.ZodOptional<z.ZodString>;
    updatedBy: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, z.core.$strip>;
export declare const createPaginatedResponseSchema: <T extends z.ZodTypeAny>(itemSchema: T) => z.ZodObject<{
    data: z.ZodArray<T>;
    pagination: typeof paginationResponseSchema;
}>;
export declare const createApiResponseSchema: <T extends z.ZodTypeAny>(dataSchema: T) => z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodOptional<T>;
    error: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
}>;
export declare const createListResponseSchema: <T extends z.ZodTypeAny>(itemSchema: T) => z.ZodObject<{
    items: z.ZodArray<T>;
    totalCount: z.ZodNumber;
    page: z.ZodNumber;
    pageSize: z.ZodNumber;
}>;
export declare const actionStateSchema: z.ZodObject<{
    success: z.ZodOptional<z.ZodBoolean>;
    loading: z.ZodOptional<z.ZodBoolean>;
    error: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
    data: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>;
export declare const formActionStateSchema: z.ZodObject<{
    success: z.ZodOptional<z.ZodBoolean>;
    loading: z.ZodOptional<z.ZodBoolean>;
    error: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
    data: z.ZodOptional<z.ZodUnknown>;
    fieldErrors: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString>>>;
}, z.core.$strip>;
export declare const serverActionResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodOptional<z.ZodUnknown>;
    error: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
    redirect: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const phoneSchema: z.ZodString;
export declare const currencyAmountSchema: z.ZodNumber;
export declare const percentageSchema: z.ZodNumber;
export declare const urlSchema: z.ZodString;
export declare const fileTypeSchema: z.ZodEnum<{
    "image/jpeg": "image/jpeg";
    "image/png": "image/png";
    "image/gif": "image/gif";
    "application/pdf": "application/pdf";
    "image/webp": "image/webp";
    "text/plain": "text/plain";
    "text/csv": "text/csv";
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    "application/vnd.ms-excel": "application/vnd.ms-excel";
}>;
export declare const fileSizeSchema: z.ZodNumber;
export declare const uploadedFileSchema: z.ZodObject<{
    name: z.ZodString;
    size: z.ZodNumber;
    type: z.ZodEnum<{
        "image/jpeg": "image/jpeg";
        "image/png": "image/png";
        "image/gif": "image/gif";
        "application/pdf": "application/pdf";
        "image/webp": "image/webp";
        "text/plain": "text/plain";
        "text/csv": "text/csv";
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        "application/vnd.ms-excel": "application/vnd.ms-excel";
    }>;
    lastModified: z.ZodNumber;
    data: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const addressSchema: z.ZodObject<{
    street: z.ZodString;
    city: z.ZodString;
    state: z.ZodString;
    zipCode: z.ZodString;
    country: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare const coordinatesSchema: z.ZodObject<{
    latitude: z.ZodNumber;
    longitude: z.ZodNumber;
}, z.core.$strip>;
export declare const sortSchema: z.ZodObject<{
    field: z.ZodString;
    direction: z.ZodDefault<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>;
}, z.core.$strip>;
export declare const advancedSearchSchema: z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>>;
    filters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    sort: z.ZodOptional<z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        direction: z.ZodDefault<z.ZodEnum<{
            asc: "asc";
            desc: "desc";
        }>>;
    }, z.core.$strip>>>;
    include: z.ZodOptional<z.ZodArray<z.ZodString>>;
    exclude: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const timeRangeSchema: z.ZodObject<{
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
    preset: z.ZodOptional<z.ZodEnum<{
        today: "today";
        yesterday: "yesterday";
        last7days: "last7days";
        last30days: "last30days";
        thisMonth: "thisMonth";
        lastMonth: "lastMonth";
        thisYear: "thisYear";
        lastYear: "lastYear";
    }>>;
}, z.core.$strip>;
export declare const bulkOperationSchema: z.ZodObject<{
    action: z.ZodEnum<{
        create: "create";
        delete: "delete";
        update: "update";
        archive: "archive";
        restore: "restore";
    }>;
    ids: z.ZodArray<z.ZodString>;
    data: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>;
export declare const bulkResponseSchema: z.ZodObject<{
    successful: z.ZodArray<z.ZodString>;
    failed: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        error: z.ZodString;
    }, z.core.$strip>>;
    totalProcessed: z.ZodNumber;
    successCount: z.ZodNumber;
    failureCount: z.ZodNumber;
}, z.core.$strip>;
export declare const webhookEventSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodString;
    data: z.ZodUnknown;
    timestamp: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare const webhookDeliverySchema: z.ZodObject<{
    id: z.ZodString;
    url: z.ZodString;
    event: z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        data: z.ZodUnknown;
        timestamp: z.ZodString;
        version: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>;
    attempts: z.ZodNumber;
    status: z.ZodEnum<{
        failed: "failed";
        pending: "pending";
        delivered: "delivered";
    }>;
    response: z.ZodOptional<z.ZodObject<{
        status: z.ZodNumber;
        headers: z.ZodRecord<z.ZodString, z.ZodString>;
        body: z.ZodString;
    }, z.core.$strip>>;
    nextRetry: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
//# sourceMappingURL=common.d.ts.map