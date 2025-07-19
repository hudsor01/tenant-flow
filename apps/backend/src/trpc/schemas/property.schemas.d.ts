import { z } from 'zod';
export declare const propertyTypeSchema: z.ZodEnum<["SINGLE_FAMILY", "MULTI_UNIT", "APARTMENT", "COMMERCIAL"]>;
export declare const createPropertySchema: z.ZodObject<{
    name: z.ZodString;
    address: z.ZodString;
    city: z.ZodString;
    state: z.ZodString;
    zipCode: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    propertyType: z.ZodOptional<z.ZodEnum<["SINGLE_FAMILY", "MULTI_UNIT", "APARTMENT", "COMMERCIAL"]>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    description?: string | undefined;
    propertyType?: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL" | undefined;
}, {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    description?: string | undefined;
    propertyType?: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL" | undefined;
}>;
export declare const updatePropertySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    zipCode: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    propertyType: z.ZodOptional<z.ZodEnum<["SINGLE_FAMILY", "MULTI_UNIT", "APARTMENT", "COMMERCIAL"]>>;
    imageUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name?: string | undefined;
    description?: string | undefined;
    address?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    zipCode?: string | undefined;
    imageUrl?: string | undefined;
    propertyType?: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL" | undefined;
}, {
    id: string;
    name?: string | undefined;
    description?: string | undefined;
    address?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    zipCode?: string | undefined;
    imageUrl?: string | undefined;
    propertyType?: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL" | undefined;
}>;
export declare const propertyQuerySchema: z.ZodObject<{
    propertyType: z.ZodOptional<z.ZodEnum<["SINGLE_FAMILY", "MULTI_UNIT", "APARTMENT", "COMMERCIAL"]>>;
    status: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodString>;
    offset: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
    search?: string | undefined;
    propertyType?: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL" | undefined;
    limit?: string | undefined;
    offset?: string | undefined;
}, {
    status?: string | undefined;
    search?: string | undefined;
    propertyType?: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL" | undefined;
    limit?: string | undefined;
    offset?: string | undefined;
}>;
export declare const propertyIdSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const base64FileSchema: z.ZodObject<{
    filename: z.ZodString;
    mimeType: z.ZodString;
    size: z.ZodNumber;
    data: z.ZodString;
}, "strip", z.ZodTypeAny, {
    data: string;
    size: number;
    filename: string;
    mimeType: string;
}, {
    data: string;
    size: number;
    filename: string;
    mimeType: string;
}>;
export declare const uploadImageSchema: z.ZodObject<{
    propertyId: z.ZodString;
    file: z.ZodObject<{
        filename: z.ZodString;
        mimeType: z.ZodString;
        size: z.ZodNumber;
        data: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        data: string;
        size: number;
        filename: string;
        mimeType: string;
    }, {
        data: string;
        size: number;
        filename: string;
        mimeType: string;
    }>;
}, "strip", z.ZodTypeAny, {
    propertyId: string;
    file: {
        data: string;
        size: number;
        filename: string;
        mimeType: string;
    };
}, {
    propertyId: string;
    file: {
        data: string;
        size: number;
        filename: string;
        mimeType: string;
    };
}>;
export declare const uploadResultSchema: z.ZodObject<{
    url: z.ZodString;
    path: z.ZodString;
    filename: z.ZodString;
    size: z.ZodNumber;
    mimeType: z.ZodString;
}, "strip", z.ZodTypeAny, {
    url: string;
    path: string;
    size: number;
    filename: string;
    mimeType: string;
}, {
    url: string;
    path: string;
    size: number;
    filename: string;
    mimeType: string;
}>;
export declare const propertySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    address: z.ZodString;
    city: z.ZodString;
    state: z.ZodString;
    zipCode: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    propertyType: z.ZodEnum<["SINGLE_FAMILY", "MULTI_UNIT", "APARTMENT", "COMMERCIAL"]>;
    imageUrl: z.ZodNullable<z.ZodString>;
    ownerId: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    description: string | null;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    imageUrl: string | null;
    ownerId: string;
    propertyType: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL";
}, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    description: string | null;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    imageUrl: string | null;
    ownerId: string;
    propertyType: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL";
}>;
export declare const propertyListSchema: z.ZodObject<{
    properties: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        address: z.ZodString;
        city: z.ZodString;
        state: z.ZodString;
        zipCode: z.ZodString;
        description: z.ZodNullable<z.ZodString>;
        propertyType: z.ZodEnum<["SINGLE_FAMILY", "MULTI_UNIT", "APARTMENT", "COMMERCIAL"]>;
        imageUrl: z.ZodNullable<z.ZodString>;
        ownerId: z.ZodString;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        address: string;
        city: string;
        state: string;
        zipCode: string;
        imageUrl: string | null;
        ownerId: string;
        propertyType: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL";
    }, {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        address: string;
        city: string;
        state: string;
        zipCode: string;
        imageUrl: string | null;
        ownerId: string;
        propertyType: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL";
    }>, "many">;
    total: z.ZodNumber;
    limit: z.ZodNumber;
    offset: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    total: number;
    limit: number;
    offset: number;
    properties: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        address: string;
        city: string;
        state: string;
        zipCode: string;
        imageUrl: string | null;
        ownerId: string;
        propertyType: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL";
    }[];
}, {
    total: number;
    limit: number;
    offset: number;
    properties: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        address: string;
        city: string;
        state: string;
        zipCode: string;
        imageUrl: string | null;
        ownerId: string;
        propertyType: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL";
    }[];
}>;
export declare const propertyStatsSchema: z.ZodObject<{
    totalProperties: z.ZodNumber;
    totalUnits: z.ZodNumber;
    occupiedUnits: z.ZodNumber;
    vacantUnits: z.ZodNumber;
    totalRent: z.ZodNumber;
    collectedRent: z.ZodNumber;
    pendingRent: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    totalProperties: number;
    totalUnits: number;
    occupiedUnits: number;
    vacantUnits: number;
    totalRent: number;
    collectedRent: number;
    pendingRent: number;
}, {
    totalProperties: number;
    totalUnits: number;
    occupiedUnits: number;
    vacantUnits: number;
    totalRent: number;
    collectedRent: number;
    pendingRent: number;
}>;
//# sourceMappingURL=property.schemas.d.ts.map