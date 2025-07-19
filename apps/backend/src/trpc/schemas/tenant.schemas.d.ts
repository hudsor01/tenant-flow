import { z } from 'zod';
export declare const invitationStatusSchema: z.ZodEnum<[string, ...string[]]>;
export declare const createTenantSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    emergencyContact: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    name: string;
    phone?: string | undefined;
    emergencyContact?: string | undefined;
}, {
    email: string;
    name: string;
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
    email?: string | undefined;
    name?: string | undefined;
    phone?: string | undefined;
    emergencyContact?: string | undefined;
}, {
    id: string;
    email?: string | undefined;
    name?: string | undefined;
    phone?: string | undefined;
    emergencyContact?: string | undefined;
}>;
export declare const tenantQuerySchema: z.ZodObject<{
    offset: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodString>>;
} & {
    status: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit: string;
    offset: string;
    status?: string | undefined;
    search?: string | undefined;
}, {
    status?: string | undefined;
    search?: string | undefined;
    limit?: string | undefined;
    offset?: string | undefined;
}>;
export declare const tenantIdSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const acceptInvitationSchema: z.ZodObject<{
    token: z.ZodString;
    password: z.ZodString;
    userInfo: z.ZodObject<{
        id: z.ZodString;
        email: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        email: string;
        name?: string | undefined;
    }, {
        id: string;
        email: string;
        name?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    token: string;
    password: string;
    userInfo: {
        id: string;
        email: string;
        name?: string | undefined;
    };
}, {
    token: string;
    password: string;
    userInfo: {
        id: string;
        email: string;
        name?: string | undefined;
    };
}>;
export declare const verifyInvitationSchema: z.ZodObject<{
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
}, {
    token: string;
}>;
export declare const userSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodNullable<z.ZodString>;
    email: z.ZodString;
    avatarUrl: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
}, {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
}>;
export declare const propertyReferenceSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    address: z.ZodString;
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    address: string;
    city?: string | undefined;
    state?: string | undefined;
}, {
    id: string;
    name: string;
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
        id: string;
        name: string;
        address: string;
        city?: string | undefined;
        state?: string | undefined;
    }, {
        id: string;
        name: string;
        address: string;
        city?: string | undefined;
        state?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    unitNumber: string;
    Property: {
        id: string;
        name: string;
        address: string;
        city?: string | undefined;
        state?: string | undefined;
    };
}, {
    id: string;
    unitNumber: string;
    Property: {
        id: string;
        name: string;
        address: string;
        city?: string | undefined;
        state?: string | undefined;
    };
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
            id: string;
            name: string;
            address: string;
            city?: string | undefined;
            state?: string | undefined;
        }, {
            id: string;
            name: string;
            address: string;
            city?: string | undefined;
            state?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        unitNumber: string;
        Property: {
            id: string;
            name: string;
            address: string;
            city?: string | undefined;
            state?: string | undefined;
        };
    }, {
        id: string;
        unitNumber: string;
        Property: {
            id: string;
            name: string;
            address: string;
            city?: string | undefined;
            state?: string | undefined;
        };
    }>;
}, "strip", z.ZodTypeAny, {
    endDate: string;
    id: string;
    startDate: string;
    rentAmount: number;
    status: string;
    Unit: {
        id: string;
        unitNumber: string;
        Property: {
            id: string;
            name: string;
            address: string;
            city?: string | undefined;
            state?: string | undefined;
        };
    };
}, {
    endDate: string;
    id: string;
    startDate: string;
    rentAmount: number;
    status: string;
    Unit: {
        id: string;
        unitNumber: string;
        Property: {
            id: string;
            name: string;
            address: string;
            city?: string | undefined;
            state?: string | undefined;
        };
    };
}>;
export declare const tenantSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodNullable<z.ZodString>;
    emergencyContact: z.ZodNullable<z.ZodString>;
    invitationStatus: z.ZodEnum<[string, ...string[]]>;
    invitedAt: z.ZodNullable<z.ZodString>;
    acceptedAt: z.ZodNullable<z.ZodString>;
    expiresAt: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    User: z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodNullable<z.ZodString>;
        email: z.ZodString;
        avatarUrl: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        email: string;
        name: string | null;
        avatarUrl: string | null;
    }, {
        id: string;
        email: string;
        name: string | null;
        avatarUrl: string | null;
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
                id: string;
                name: string;
                address: string;
                city?: string | undefined;
                state?: string | undefined;
            }, {
                id: string;
                name: string;
                address: string;
                city?: string | undefined;
                state?: string | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            unitNumber: string;
            Property: {
                id: string;
                name: string;
                address: string;
                city?: string | undefined;
                state?: string | undefined;
            };
        }, {
            id: string;
            unitNumber: string;
            Property: {
                id: string;
                name: string;
                address: string;
                city?: string | undefined;
                state?: string | undefined;
            };
        }>;
    }, "strip", z.ZodTypeAny, {
        endDate: string;
        id: string;
        startDate: string;
        rentAmount: number;
        status: string;
        Unit: {
            id: string;
            unitNumber: string;
            Property: {
                id: string;
                name: string;
                address: string;
                city?: string | undefined;
                state?: string | undefined;
            };
        };
    }, {
        endDate: string;
        id: string;
        startDate: string;
        rentAmount: number;
        status: string;
        Unit: {
            id: string;
            unitNumber: string;
            Property: {
                id: string;
                name: string;
                address: string;
                city?: string | undefined;
                state?: string | undefined;
            };
        };
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    updatedAt: string;
    User: {
        id: string;
        email: string;
        name: string | null;
        avatarUrl: string | null;
    } | null;
    email: string;
    name: string;
    phone: string | null;
    emergencyContact: string | null;
    invitationStatus: string;
    invitedAt: string | null;
    acceptedAt: string | null;
    expiresAt: string | null;
    Lease?: {
        endDate: string;
        id: string;
        startDate: string;
        rentAmount: number;
        status: string;
        Unit: {
            id: string;
            unitNumber: string;
            Property: {
                id: string;
                name: string;
                address: string;
                city?: string | undefined;
                state?: string | undefined;
            };
        };
    }[] | undefined;
}, {
    id: string;
    createdAt: string;
    updatedAt: string;
    User: {
        id: string;
        email: string;
        name: string | null;
        avatarUrl: string | null;
    } | null;
    email: string;
    name: string;
    phone: string | null;
    emergencyContact: string | null;
    invitationStatus: string;
    invitedAt: string | null;
    acceptedAt: string | null;
    expiresAt: string | null;
    Lease?: {
        endDate: string;
        id: string;
        startDate: string;
        rentAmount: number;
        status: string;
        Unit: {
            id: string;
            unitNumber: string;
            Property: {
                id: string;
                name: string;
                address: string;
                city?: string | undefined;
                state?: string | undefined;
            };
        };
    }[] | undefined;
}>;
export declare const tenantListSchema: z.ZodObject<{
    tenants: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodString;
        phone: z.ZodNullable<z.ZodString>;
        emergencyContact: z.ZodNullable<z.ZodString>;
        invitationStatus: z.ZodEnum<[string, ...string[]]>;
        invitedAt: z.ZodNullable<z.ZodString>;
        acceptedAt: z.ZodNullable<z.ZodString>;
        expiresAt: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        User: z.ZodNullable<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodNullable<z.ZodString>;
            email: z.ZodString;
            avatarUrl: z.ZodNullable<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            email: string;
            name: string | null;
            avatarUrl: string | null;
        }, {
            id: string;
            email: string;
            name: string | null;
            avatarUrl: string | null;
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
                    id: string;
                    name: string;
                    address: string;
                    city?: string | undefined;
                    state?: string | undefined;
                }, {
                    id: string;
                    name: string;
                    address: string;
                    city?: string | undefined;
                    state?: string | undefined;
                }>;
            }, "strip", z.ZodTypeAny, {
                id: string;
                unitNumber: string;
                Property: {
                    id: string;
                    name: string;
                    address: string;
                    city?: string | undefined;
                    state?: string | undefined;
                };
            }, {
                id: string;
                unitNumber: string;
                Property: {
                    id: string;
                    name: string;
                    address: string;
                    city?: string | undefined;
                    state?: string | undefined;
                };
            }>;
        }, "strip", z.ZodTypeAny, {
            endDate: string;
            id: string;
            startDate: string;
            rentAmount: number;
            status: string;
            Unit: {
                id: string;
                unitNumber: string;
                Property: {
                    id: string;
                    name: string;
                    address: string;
                    city?: string | undefined;
                    state?: string | undefined;
                };
            };
        }, {
            endDate: string;
            id: string;
            startDate: string;
            rentAmount: number;
            status: string;
            Unit: {
                id: string;
                unitNumber: string;
                Property: {
                    id: string;
                    name: string;
                    address: string;
                    city?: string | undefined;
                    state?: string | undefined;
                };
            };
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: string;
        updatedAt: string;
        User: {
            id: string;
            email: string;
            name: string | null;
            avatarUrl: string | null;
        } | null;
        email: string;
        name: string;
        phone: string | null;
        emergencyContact: string | null;
        invitationStatus: string;
        invitedAt: string | null;
        acceptedAt: string | null;
        expiresAt: string | null;
        Lease?: {
            endDate: string;
            id: string;
            startDate: string;
            rentAmount: number;
            status: string;
            Unit: {
                id: string;
                unitNumber: string;
                Property: {
                    id: string;
                    name: string;
                    address: string;
                    city?: string | undefined;
                    state?: string | undefined;
                };
            };
        }[] | undefined;
    }, {
        id: string;
        createdAt: string;
        updatedAt: string;
        User: {
            id: string;
            email: string;
            name: string | null;
            avatarUrl: string | null;
        } | null;
        email: string;
        name: string;
        phone: string | null;
        emergencyContact: string | null;
        invitationStatus: string;
        invitedAt: string | null;
        acceptedAt: string | null;
        expiresAt: string | null;
        Lease?: {
            endDate: string;
            id: string;
            startDate: string;
            rentAmount: number;
            status: string;
            Unit: {
                id: string;
                unitNumber: string;
                Property: {
                    id: string;
                    name: string;
                    address: string;
                    city?: string | undefined;
                    state?: string | undefined;
                };
            };
        }[] | undefined;
    }>, "many">;
    total: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    total: number;
    tenants: {
        id: string;
        createdAt: string;
        updatedAt: string;
        User: {
            id: string;
            email: string;
            name: string | null;
            avatarUrl: string | null;
        } | null;
        email: string;
        name: string;
        phone: string | null;
        emergencyContact: string | null;
        invitationStatus: string;
        invitedAt: string | null;
        acceptedAt: string | null;
        expiresAt: string | null;
        Lease?: {
            endDate: string;
            id: string;
            startDate: string;
            rentAmount: number;
            status: string;
            Unit: {
                id: string;
                unitNumber: string;
                Property: {
                    id: string;
                    name: string;
                    address: string;
                    city?: string | undefined;
                    state?: string | undefined;
                };
            };
        }[] | undefined;
    }[];
}, {
    total: number;
    tenants: {
        id: string;
        createdAt: string;
        updatedAt: string;
        User: {
            id: string;
            email: string;
            name: string | null;
            avatarUrl: string | null;
        } | null;
        email: string;
        name: string;
        phone: string | null;
        emergencyContact: string | null;
        invitationStatus: string;
        invitedAt: string | null;
        acceptedAt: string | null;
        expiresAt: string | null;
        Lease?: {
            endDate: string;
            id: string;
            startDate: string;
            rentAmount: number;
            status: string;
            Unit: {
                id: string;
                unitNumber: string;
                Property: {
                    id: string;
                    name: string;
                    address: string;
                    city?: string | undefined;
                    state?: string | undefined;
                };
            };
        }[] | undefined;
    }[];
}>;
export declare const tenantStatsSchema: z.ZodObject<{
    totalTenants: z.ZodNumber;
    activeTenants: z.ZodNumber;
    pendingInvitations: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    totalTenants: number;
    activeTenants: number;
    pendingInvitations: number;
}, {
    totalTenants: number;
    activeTenants: number;
    pendingInvitations: number;
}>;
export declare const invitationVerificationSchema: z.ZodObject<{
    tenant: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodString;
        phone: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        email: string;
        name: string;
        phone: string | null;
    }, {
        id: string;
        email: string;
        name: string;
        phone: string | null;
    }>;
    property: z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        address: z.ZodString;
        city: z.ZodOptional<z.ZodString>;
        state: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        address: string;
        city?: string | undefined;
        state?: string | undefined;
    }, {
        id: string;
        name: string;
        address: string;
        city?: string | undefined;
        state?: string | undefined;
    }>>;
    propertyOwner: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodNullable<z.ZodString>;
        email: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        email: string;
        name: string | null;
    }, {
        id: string;
        email: string;
        name: string | null;
    }>;
    expiresAt: z.ZodNullable<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    property: {
        id: string;
        name: string;
        address: string;
        city?: string | undefined;
        state?: string | undefined;
    } | null;
    tenant: {
        id: string;
        email: string;
        name: string;
        phone: string | null;
    };
    expiresAt: Date | null;
    propertyOwner: {
        id: string;
        email: string;
        name: string | null;
    };
}, {
    property: {
        id: string;
        name: string;
        address: string;
        city?: string | undefined;
        state?: string | undefined;
    } | null;
    tenant: {
        id: string;
        email: string;
        name: string;
        phone: string | null;
    };
    expiresAt: Date | null;
    propertyOwner: {
        id: string;
        email: string;
        name: string | null;
    };
}>;
export declare const invitationAcceptanceSchema: z.ZodObject<{
    success: z.ZodBoolean;
    tenant: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodString;
        phone: z.ZodNullable<z.ZodString>;
        emergencyContact: z.ZodNullable<z.ZodString>;
        invitationStatus: z.ZodEnum<[string, ...string[]]>;
        invitedAt: z.ZodNullable<z.ZodString>;
        acceptedAt: z.ZodNullable<z.ZodString>;
        expiresAt: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        User: z.ZodNullable<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodNullable<z.ZodString>;
            email: z.ZodString;
            avatarUrl: z.ZodNullable<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            email: string;
            name: string | null;
            avatarUrl: string | null;
        }, {
            id: string;
            email: string;
            name: string | null;
            avatarUrl: string | null;
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
                    id: string;
                    name: string;
                    address: string;
                    city?: string | undefined;
                    state?: string | undefined;
                }, {
                    id: string;
                    name: string;
                    address: string;
                    city?: string | undefined;
                    state?: string | undefined;
                }>;
            }, "strip", z.ZodTypeAny, {
                id: string;
                unitNumber: string;
                Property: {
                    id: string;
                    name: string;
                    address: string;
                    city?: string | undefined;
                    state?: string | undefined;
                };
            }, {
                id: string;
                unitNumber: string;
                Property: {
                    id: string;
                    name: string;
                    address: string;
                    city?: string | undefined;
                    state?: string | undefined;
                };
            }>;
        }, "strip", z.ZodTypeAny, {
            endDate: string;
            id: string;
            startDate: string;
            rentAmount: number;
            status: string;
            Unit: {
                id: string;
                unitNumber: string;
                Property: {
                    id: string;
                    name: string;
                    address: string;
                    city?: string | undefined;
                    state?: string | undefined;
                };
            };
        }, {
            endDate: string;
            id: string;
            startDate: string;
            rentAmount: number;
            status: string;
            Unit: {
                id: string;
                unitNumber: string;
                Property: {
                    id: string;
                    name: string;
                    address: string;
                    city?: string | undefined;
                    state?: string | undefined;
                };
            };
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: string;
        updatedAt: string;
        User: {
            id: string;
            email: string;
            name: string | null;
            avatarUrl: string | null;
        } | null;
        email: string;
        name: string;
        phone: string | null;
        emergencyContact: string | null;
        invitationStatus: string;
        invitedAt: string | null;
        acceptedAt: string | null;
        expiresAt: string | null;
        Lease?: {
            endDate: string;
            id: string;
            startDate: string;
            rentAmount: number;
            status: string;
            Unit: {
                id: string;
                unitNumber: string;
                Property: {
                    id: string;
                    name: string;
                    address: string;
                    city?: string | undefined;
                    state?: string | undefined;
                };
            };
        }[] | undefined;
    }, {
        id: string;
        createdAt: string;
        updatedAt: string;
        User: {
            id: string;
            email: string;
            name: string | null;
            avatarUrl: string | null;
        } | null;
        email: string;
        name: string;
        phone: string | null;
        emergencyContact: string | null;
        invitationStatus: string;
        invitedAt: string | null;
        acceptedAt: string | null;
        expiresAt: string | null;
        Lease?: {
            endDate: string;
            id: string;
            startDate: string;
            rentAmount: number;
            status: string;
            Unit: {
                id: string;
                unitNumber: string;
                Property: {
                    id: string;
                    name: string;
                    address: string;
                    city?: string | undefined;
                    state?: string | undefined;
                };
            };
        }[] | undefined;
    }>;
    user: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodNullable<z.ZodString>;
        email: z.ZodString;
        avatarUrl: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        email: string;
        name: string | null;
        avatarUrl: string | null;
    }, {
        id: string;
        email: string;
        name: string | null;
        avatarUrl: string | null;
    }>;
}, "strip", z.ZodTypeAny, {
    user: {
        id: string;
        email: string;
        name: string | null;
        avatarUrl: string | null;
    };
    tenant: {
        id: string;
        createdAt: string;
        updatedAt: string;
        User: {
            id: string;
            email: string;
            name: string | null;
            avatarUrl: string | null;
        } | null;
        email: string;
        name: string;
        phone: string | null;
        emergencyContact: string | null;
        invitationStatus: string;
        invitedAt: string | null;
        acceptedAt: string | null;
        expiresAt: string | null;
        Lease?: {
            endDate: string;
            id: string;
            startDate: string;
            rentAmount: number;
            status: string;
            Unit: {
                id: string;
                unitNumber: string;
                Property: {
                    id: string;
                    name: string;
                    address: string;
                    city?: string | undefined;
                    state?: string | undefined;
                };
            };
        }[] | undefined;
    };
    success: boolean;
}, {
    user: {
        id: string;
        email: string;
        name: string | null;
        avatarUrl: string | null;
    };
    tenant: {
        id: string;
        createdAt: string;
        updatedAt: string;
        User: {
            id: string;
            email: string;
            name: string | null;
            avatarUrl: string | null;
        } | null;
        email: string;
        name: string;
        phone: string | null;
        emergencyContact: string | null;
        invitationStatus: string;
        invitedAt: string | null;
        acceptedAt: string | null;
        expiresAt: string | null;
        Lease?: {
            endDate: string;
            id: string;
            startDate: string;
            rentAmount: number;
            status: string;
            Unit: {
                id: string;
                unitNumber: string;
                Property: {
                    id: string;
                    name: string;
                    address: string;
                    city?: string | undefined;
                    state?: string | undefined;
                };
            };
        }[] | undefined;
    };
    success: boolean;
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