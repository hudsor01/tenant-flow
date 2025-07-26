import { z } from 'zod';
export declare const createTenantSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    emergencyContact: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    email: string;
    phone?: string | undefined;
    emergencyContact?: string | undefined;
}, {
    name: string;
    email: string;
    phone?: string | undefined;
    emergencyContact?: string | undefined;
}>;
export declare const updateTenantSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    emergencyContact: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    emergencyContact?: string | undefined;
}, {
    id: string;
    name?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    emergencyContact?: string | undefined;
}>;
export declare const tenantQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
} & {
    status: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    status?: string | undefined;
    search?: string | undefined;
}, {
    status?: string | undefined;
    search?: string | undefined;
    limit?: number | undefined;
    page?: number | undefined;
}>;
export declare const tenantIdSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const userSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodNullable<z.ZodString>;
    email: z.ZodString;
    avatarUrl: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string | null;
    avatarUrl: string | null;
    id: string;
    email: string;
}, {
    name: string | null;
    avatarUrl: string | null;
    id: string;
    email: string;
}>;
export declare const propertyReferenceSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    address: z.ZodString;
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    address: string;
    city?: string | undefined;
    state?: string | undefined;
}, {
    name: string;
    id: string;
    address: string;
    city?: string | undefined;
    state?: string | undefined;
}>;
export declare const unitReferenceSchema: z.ZodObject<{
    id: z.ZodString;
    unitNumber: z.ZodString;
    Property: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        address: z.ZodString;
        city: z.ZodOptional<z.ZodString>;
        state: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        address: string;
        city?: string | undefined;
        state?: string | undefined;
    }, {
        name: string;
        id: string;
        address: string;
        city?: string | undefined;
        state?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    Property: {
        name: string;
        id: string;
        address: string;
        city?: string | undefined;
        state?: string | undefined;
    };
    unitNumber: string;
}, {
    id: string;
    Property: {
        name: string;
        id: string;
        address: string;
        city?: string | undefined;
        state?: string | undefined;
    };
    unitNumber: string;
}>;
export declare const leaseReferenceSchema: z.ZodObject<{
    id: z.ZodString;
    startDate: z.ZodString;
    endDate: z.ZodString;
    rentAmount: z.ZodNumber;
    status: z.ZodString;
    Unit: z.ZodObject<{
        id: z.ZodString;
        unitNumber: z.ZodString;
        Property: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            address: z.ZodString;
            city: z.ZodOptional<z.ZodString>;
            state: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            address: string;
            city?: string | undefined;
            state?: string | undefined;
        }, {
            name: string;
            id: string;
            address: string;
            city?: string | undefined;
            state?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        Property: {
            name: string;
            id: string;
            address: string;
            city?: string | undefined;
            state?: string | undefined;
        };
        unitNumber: string;
    }, {
        id: string;
        Property: {
            name: string;
            id: string;
            address: string;
            city?: string | undefined;
            state?: string | undefined;
        };
        unitNumber: string;
    }>;
}, "strip", z.ZodTypeAny, {
    status: string;
    id: string;
    startDate: string;
    endDate: string;
    Unit: {
        id: string;
        Property: {
            name: string;
            id: string;
            address: string;
            city?: string | undefined;
            state?: string | undefined;
        };
        unitNumber: string;
    };
    rentAmount: number;
}, {
    status: string;
    id: string;
    startDate: string;
    endDate: string;
    Unit: {
        id: string;
        Property: {
            name: string;
            id: string;
            address: string;
            city?: string | undefined;
            state?: string | undefined;
        };
        unitNumber: string;
    };
    rentAmount: number;
}>;
export declare const tenantSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodNullable<z.ZodString>;
    emergencyContact: z.ZodNullable<z.ZodString>;
    userId: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    User: z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodNullable<z.ZodString>;
        email: z.ZodString;
        avatarUrl: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string | null;
        avatarUrl: string | null;
        id: string;
        email: string;
    }, {
        name: string | null;
        avatarUrl: string | null;
        id: string;
        email: string;
    }>>;
    Lease: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        startDate: z.ZodString;
        endDate: z.ZodString;
        rentAmount: z.ZodNumber;
        status: z.ZodString;
        Unit: z.ZodObject<{
            id: z.ZodString;
            unitNumber: z.ZodString;
            Property: z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                address: z.ZodString;
                city: z.ZodOptional<z.ZodString>;
                state: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                name: string;
                id: string;
                address: string;
                city?: string | undefined;
                state?: string | undefined;
            }, {
                name: string;
                id: string;
                address: string;
                city?: string | undefined;
                state?: string | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            Property: {
                name: string;
                id: string;
                address: string;
                city?: string | undefined;
                state?: string | undefined;
            };
            unitNumber: string;
        }, {
            id: string;
            Property: {
                name: string;
                id: string;
                address: string;
                city?: string | undefined;
                state?: string | undefined;
            };
            unitNumber: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        status: string;
        id: string;
        startDate: string;
        endDate: string;
        Unit: {
            id: string;
            Property: {
                name: string;
                id: string;
                address: string;
                city?: string | undefined;
                state?: string | undefined;
            };
            unitNumber: string;
        };
        rentAmount: number;
    }, {
        status: string;
        id: string;
        startDate: string;
        endDate: string;
        Unit: {
            id: string;
            Property: {
                name: string;
                id: string;
                address: string;
                city?: string | undefined;
                state?: string | undefined;
            };
            unitNumber: string;
        };
        rentAmount: number;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    userId: string | null;
    createdAt: string;
    updatedAt: string;
    name: string;
    id: string;
    email: string;
    phone: string | null;
    User: {
        name: string | null;
        avatarUrl: string | null;
        id: string;
        email: string;
    } | null;
    emergencyContact: string | null;
    Lease?: {
        status: string;
        id: string;
        startDate: string;
        endDate: string;
        Unit: {
            id: string;
            Property: {
                name: string;
                id: string;
                address: string;
                city?: string | undefined;
                state?: string | undefined;
            };
            unitNumber: string;
        };
        rentAmount: number;
    }[] | undefined;
}, {
    userId: string | null;
    createdAt: string;
    updatedAt: string;
    name: string;
    id: string;
    email: string;
    phone: string | null;
    User: {
        name: string | null;
        avatarUrl: string | null;
        id: string;
        email: string;
    } | null;
    emergencyContact: string | null;
    Lease?: {
        status: string;
        id: string;
        startDate: string;
        endDate: string;
        Unit: {
            id: string;
            Property: {
                name: string;
                id: string;
                address: string;
                city?: string | undefined;
                state?: string | undefined;
            };
            unitNumber: string;
        };
        rentAmount: number;
    }[] | undefined;
}>;
export declare const tenantListSchema: z.ZodObject<{
    tenants: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodString;
        phone: z.ZodNullable<z.ZodString>;
        emergencyContact: z.ZodNullable<z.ZodString>;
        userId: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        User: z.ZodNullable<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodNullable<z.ZodString>;
            email: z.ZodString;
            avatarUrl: z.ZodNullable<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string | null;
            avatarUrl: string | null;
            id: string;
            email: string;
        }, {
            name: string | null;
            avatarUrl: string | null;
            id: string;
            email: string;
        }>>;
        Lease: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            startDate: z.ZodString;
            endDate: z.ZodString;
            rentAmount: z.ZodNumber;
            status: z.ZodString;
            Unit: z.ZodObject<{
                id: z.ZodString;
                unitNumber: z.ZodString;
                Property: z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                    address: z.ZodString;
                    city: z.ZodOptional<z.ZodString>;
                    state: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    name: string;
                    id: string;
                    address: string;
                    city?: string | undefined;
                    state?: string | undefined;
                }, {
                    name: string;
                    id: string;
                    address: string;
                    city?: string | undefined;
                    state?: string | undefined;
                }>;
            }, "strip", z.ZodTypeAny, {
                id: string;
                Property: {
                    name: string;
                    id: string;
                    address: string;
                    city?: string | undefined;
                    state?: string | undefined;
                };
                unitNumber: string;
            }, {
                id: string;
                Property: {
                    name: string;
                    id: string;
                    address: string;
                    city?: string | undefined;
                    state?: string | undefined;
                };
                unitNumber: string;
            }>;
        }, "strip", z.ZodTypeAny, {
            status: string;
            id: string;
            startDate: string;
            endDate: string;
            Unit: {
                id: string;
                Property: {
                    name: string;
                    id: string;
                    address: string;
                    city?: string | undefined;
                    state?: string | undefined;
                };
                unitNumber: string;
            };
            rentAmount: number;
        }, {
            status: string;
            id: string;
            startDate: string;
            endDate: string;
            Unit: {
                id: string;
                Property: {
                    name: string;
                    id: string;
                    address: string;
                    city?: string | undefined;
                    state?: string | undefined;
                };
                unitNumber: string;
            };
            rentAmount: number;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        userId: string | null;
        createdAt: string;
        updatedAt: string;
        name: string;
        id: string;
        email: string;
        phone: string | null;
        User: {
            name: string | null;
            avatarUrl: string | null;
            id: string;
            email: string;
        } | null;
        emergencyContact: string | null;
        Lease?: {
            status: string;
            id: string;
            startDate: string;
            endDate: string;
            Unit: {
                id: string;
                Property: {
                    name: string;
                    id: string;
                    address: string;
                    city?: string | undefined;
                    state?: string | undefined;
                };
                unitNumber: string;
            };
            rentAmount: number;
        }[] | undefined;
    }, {
        userId: string | null;
        createdAt: string;
        updatedAt: string;
        name: string;
        id: string;
        email: string;
        phone: string | null;
        User: {
            name: string | null;
            avatarUrl: string | null;
            id: string;
            email: string;
        } | null;
        emergencyContact: string | null;
        Lease?: {
            status: string;
            id: string;
            startDate: string;
            endDate: string;
            Unit: {
                id: string;
                Property: {
                    name: string;
                    id: string;
                    address: string;
                    city?: string | undefined;
                    state?: string | undefined;
                };
                unitNumber: string;
            };
            rentAmount: number;
        }[] | undefined;
    }>, "many">;
    total: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    total: number;
    tenants: {
        userId: string | null;
        createdAt: string;
        updatedAt: string;
        name: string;
        id: string;
        email: string;
        phone: string | null;
        User: {
            name: string | null;
            avatarUrl: string | null;
            id: string;
            email: string;
        } | null;
        emergencyContact: string | null;
        Lease?: {
            status: string;
            id: string;
            startDate: string;
            endDate: string;
            Unit: {
                id: string;
                Property: {
                    name: string;
                    id: string;
                    address: string;
                    city?: string | undefined;
                    state?: string | undefined;
                };
                unitNumber: string;
            };
            rentAmount: number;
        }[] | undefined;
    }[];
}, {
    total: number;
    tenants: {
        userId: string | null;
        createdAt: string;
        updatedAt: string;
        name: string;
        id: string;
        email: string;
        phone: string | null;
        User: {
            name: string | null;
            avatarUrl: string | null;
            id: string;
            email: string;
        } | null;
        emergencyContact: string | null;
        Lease?: {
            status: string;
            id: string;
            startDate: string;
            endDate: string;
            Unit: {
                id: string;
                Property: {
                    name: string;
                    id: string;
                    address: string;
                    city?: string | undefined;
                    state?: string | undefined;
                };
                unitNumber: string;
            };
            rentAmount: number;
        }[] | undefined;
    }[];
}>;
export declare const tenantStatsSchema: z.ZodObject<{
    totalTenants: z.ZodNumber;
    activeTenants: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    totalTenants: number;
    activeTenants: number;
}, {
    totalTenants: number;
    activeTenants: number;
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
export declare const uploadDocumentSchema: z.ZodObject<{
    tenantId: z.ZodString;
    documentType: z.ZodString;
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
    tenantId: string;
    file: {
        data: string;
        size: number;
        filename: string;
        mimeType: string;
    };
    documentType: string;
}, {
    tenantId: string;
    file: {
        data: string;
        size: number;
        filename: string;
        mimeType: string;
    };
    documentType: string;
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
//# sourceMappingURL=tenant.schemas.d.ts.map