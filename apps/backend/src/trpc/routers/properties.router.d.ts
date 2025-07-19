import { z } from 'zod';
import type { PropertiesService } from '../../properties/properties.service';
import type { StorageService } from '../../storage/storage.service';
export declare const createPropertiesRouter: (propertiesService: PropertiesService, storageService: StorageService) => import("@trpc/server").TRPCBuiltRouter<{
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
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            status?: string | undefined;
            search?: string | undefined;
            propertyType?: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL" | undefined;
            limit?: string | undefined;
            offset?: string | undefined;
        };
        output: {
            total: number;
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
        };
        meta: object;
    }>;
    stats: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            totalProperties: number;
            totalUnits: number;
            occupiedUnits: number;
            vacantUnits: number;
            totalRent: number;
            collectedRent: number;
            pendingRent: number;
        };
        meta: object;
    }>;
    byId: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            id: string;
        };
        output: {
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
        };
        meta: object;
    }>;
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name: string;
            address: string;
            city: string;
            state: string;
            zipCode: string;
            description?: string | undefined;
            propertyType?: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL" | undefined;
        };
        output: {
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
        };
        meta: object;
    }>;
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
            name?: string | undefined;
            description?: string | undefined;
            address?: string | undefined;
            city?: string | undefined;
            state?: string | undefined;
            zipCode?: string | undefined;
            imageUrl?: string | undefined;
            propertyType?: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL" | undefined;
        };
        output: {
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
        };
        meta: object;
    }>;
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
        };
        output: {
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
        };
        meta: object;
    }>;
    uploadImage: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            propertyId: string;
            file: {
                data: string;
                size: number;
                filename: string;
                mimeType: string;
            };
        };
        output: {
            url: string;
            path: string;
            size: number;
            filename: string;
            mimeType: string;
        };
        meta: object;
    }>;
}>>;
export declare const propertiesRouter: (propertiesService: PropertiesService, storageService: StorageService) => import("@trpc/server").TRPCBuiltRouter<{
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
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            status?: string | undefined;
            search?: string | undefined;
            propertyType?: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL" | undefined;
            limit?: string | undefined;
            offset?: string | undefined;
        };
        output: {
            total: number;
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
        };
        meta: object;
    }>;
    stats: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            totalProperties: number;
            totalUnits: number;
            occupiedUnits: number;
            vacantUnits: number;
            totalRent: number;
            collectedRent: number;
            pendingRent: number;
        };
        meta: object;
    }>;
    byId: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            id: string;
        };
        output: {
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
        };
        meta: object;
    }>;
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name: string;
            address: string;
            city: string;
            state: string;
            zipCode: string;
            description?: string | undefined;
            propertyType?: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL" | undefined;
        };
        output: {
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
        };
        meta: object;
    }>;
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
            name?: string | undefined;
            description?: string | undefined;
            address?: string | undefined;
            city?: string | undefined;
            state?: string | undefined;
            zipCode?: string | undefined;
            imageUrl?: string | undefined;
            propertyType?: "SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL" | undefined;
        };
        output: {
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
        };
        meta: object;
    }>;
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
        };
        output: {
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
        };
        meta: object;
    }>;
    uploadImage: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            propertyId: string;
            file: {
                data: string;
                size: number;
                filename: string;
                mimeType: string;
            };
        };
        output: {
            url: string;
            path: string;
            size: number;
            filename: string;
            mimeType: string;
        };
        meta: object;
    }>;
}>>;
//# sourceMappingURL=properties.router.d.ts.map