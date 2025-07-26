import type { AuthUser, Property, Unit, Tenant, Lease, MaintenanceRequest, Subscription } from '@tenantflow/types-core';
export interface AppRouterType {
    auth: {
        me: {
            query: () => Promise<AuthUser>;
        };
        updateProfile: {
            mutate: (input: {
                name?: string;
                phone?: string;
                bio?: string;
            }) => Promise<AuthUser>;
        };
        deleteAccount: {
            mutate: () => Promise<{
                success: boolean;
            }>;
        };
    };
    properties: {
        list: {
            query: (input?: {
                search?: string;
                page?: number;
                limit?: number;
            }) => Promise<{
                data: Property[];
                pagination: {
                    totalCount: number;
                    totalPages: number;
                    currentPage: number;
                    hasNextPage: boolean;
                    hasPreviousPage: boolean;
                };
            }>;
        };
        byId: {
            query: (input: {
                id: string;
            }) => Promise<Property & {
                units: Unit[];
            }>;
        };
        create: {
            mutate: (input: {
                name: string;
                address: string;
                city: string;
                state: string;
                zipCode: string;
                propertyType: string;
                description?: string;
            }) => Promise<Property>;
        };
        update: {
            mutate: (input: {
                id: string;
                name?: string;
                address?: string;
                city?: string;
                state?: string;
                zipCode?: string;
                propertyType?: string;
                description?: string;
            }) => Promise<Property>;
        };
        delete: {
            mutate: (input: {
                id: string;
            }) => Promise<{
                success: boolean;
            }>;
        };
    };
    units: {
        list: {
            query: (input?: {
                propertyId?: string;
                status?: string;
            }) => Promise<Unit[]>;
        };
        byId: {
            query: (input: {
                id: string;
            }) => Promise<Unit & {
                property: Property;
            }>;
        };
        create: {
            mutate: (input: {
                propertyId: string;
                unitNumber: string;
                bedrooms: number;
                bathrooms: number;
                squareFeet?: number;
                monthlyRent: number;
                securityDeposit: number;
            }) => Promise<Unit>;
        };
        update: {
            mutate: (input: {
                id: string;
                unitNumber?: string;
                bedrooms?: number;
                bathrooms?: number;
                squareFeet?: number;
                monthlyRent?: number;
                securityDeposit?: number;
                status?: string;
            }) => Promise<Unit>;
        };
        delete: {
            mutate: (input: {
                id: string;
            }) => Promise<{
                success: boolean;
            }>;
        };
    };
    tenants: {
        list: {
            query: (input?: {
                search?: string;
                propertyId?: string;
                unitId?: string;
                isActive?: boolean;
                page?: number;
                limit?: number;
            }) => Promise<{
                data: Tenant[];
                pagination: {
                    totalCount: number;
                    totalPages: number;
                    currentPage: number;
                    hasNextPage: boolean;
                    hasPreviousPage: boolean;
                };
            }>;
        };
        byId: {
            query: (input: {
                id: string;
            }) => Promise<Tenant>;
        };
        create: {
            mutate: (input: {
                name: string;
                email: string;
                phone?: string;
                emergencyContact?: string;
                unitId?: string;
                moveInDate?: Date;
            }) => Promise<Tenant>;
        };
        update: {
            mutate: (input: {
                id: string;
                name?: string;
                email?: string;
                phone?: string;
                emergencyContact?: string;
                unitId?: string;
                moveInDate?: Date;
                moveOutDate?: Date;
                isActive?: boolean;
            }) => Promise<Tenant>;
        };
        delete: {
            mutate: (input: {
                id: string;
            }) => Promise<{
                success: boolean;
            }>;
        };
    };
    leases: {
        list: {
            query: (input?: {
                propertyId?: string;
                unitId?: string;
                tenantId?: string;
                status?: string;
            }) => Promise<Lease[]>;
        };
        byId: {
            query: (input: {
                id: string;
            }) => Promise<Lease>;
        };
        create: {
            mutate: (input: {
                unitId: string;
                tenantId: string;
                startDate: Date;
                endDate: Date;
                monthlyRent: number;
                securityDeposit: number;
                terms?: string;
            }) => Promise<Lease>;
        };
        update: {
            mutate: (input: {
                id: string;
                startDate?: Date;
                endDate?: Date;
                monthlyRent?: number;
                securityDeposit?: number;
                status?: string;
                terms?: string;
            }) => Promise<Lease>;
        };
        delete: {
            mutate: (input: {
                id: string;
            }) => Promise<{
                success: boolean;
            }>;
        };
    };
    maintenance: {
        list: {
            query: (input?: {
                propertyId?: string;
                unitId?: string;
                status?: string;
                priority?: string;
            }) => Promise<MaintenanceRequest[]>;
        };
        byId: {
            query: (input: {
                id: string;
            }) => Promise<MaintenanceRequest>;
        };
        create: {
            mutate: (input: {
                unitId: string;
                title: string;
                description: string;
                priority: string;
                allowEntry: boolean;
                contactPhone?: string;
                preferredDate?: Date;
            }) => Promise<MaintenanceRequest>;
        };
        update: {
            mutate: (input: {
                id: string;
                title?: string;
                description?: string;
                priority?: string;
                status?: string;
                assignedTo?: string;
                notes?: string;
                estimatedCost?: number;
                actualCost?: number;
            }) => Promise<MaintenanceRequest>;
        };
        delete: {
            mutate: (input: {
                id: string;
            }) => Promise<{
                success: boolean;
            }>;
        };
    };
    subscriptions: {
        current: {
            query: () => Promise<Subscription | null>;
        };
        createCheckoutSession: {
            mutate: (input: {
                planType: string;
                billingInterval: 'monthly' | 'annual';
                successUrl: string;
                cancelUrl: string;
            }) => Promise<{
                url: string;
                sessionId: string;
            }>;
        };
        createPortalSession: {
            mutate: (input: {
                returnUrl: string;
            }) => Promise<{
                url: string;
            }>;
        };
        cancel: {
            mutate: () => Promise<{
                success: boolean;
            }>;
        };
    };
}
export type AppRouter = AppRouterType;
export type RouterInputs = {
    auth: {
        me: undefined;
        updateProfile: {
            name?: string;
            phone?: string;
            bio?: string;
        };
        deleteAccount: undefined;
    };
    properties: {
        list: {
            search?: string;
            page?: number;
            limit?: number;
        } | undefined;
        byId: {
            id: string;
        };
        create: {
            name: string;
            address: string;
            city: string;
            state: string;
            zipCode: string;
            propertyType: string;
            description?: string;
        };
        update: {
            id: string;
            name?: string;
            address?: string;
            city?: string;
            state?: string;
            zipCode?: string;
            propertyType?: string;
            description?: string;
        };
        delete: {
            id: string;
        };
    };
    units: {
        list: {
            propertyId?: string;
            status?: string;
        } | undefined;
        byId: {
            id: string;
        };
        create: {
            propertyId: string;
            unitNumber: string;
            bedrooms: number;
            bathrooms: number;
            squareFeet?: number;
            monthlyRent: number;
            securityDeposit: number;
        };
        update: {
            id: string;
            unitNumber?: string;
            bedrooms?: number;
            bathrooms?: number;
            squareFeet?: number;
            monthlyRent?: number;
            securityDeposit?: number;
            status?: string;
        };
        delete: {
            id: string;
        };
    };
    tenants: {
        list: {
            search?: string;
            propertyId?: string;
            unitId?: string;
            isActive?: boolean;
            page?: number;
            limit?: number;
        } | undefined;
        byId: {
            id: string;
        };
        create: {
            name: string;
            email: string;
            phone?: string;
            emergencyContact?: string;
            unitId?: string;
            moveInDate?: Date;
        };
        update: {
            id: string;
            name?: string;
            email?: string;
            phone?: string;
            emergencyContact?: string;
            unitId?: string;
            moveInDate?: Date;
            moveOutDate?: Date;
            isActive?: boolean;
        };
        delete: {
            id: string;
        };
    };
    leases: {
        list: {
            propertyId?: string;
            unitId?: string;
            tenantId?: string;
            status?: string;
        } | undefined;
        byId: {
            id: string;
        };
        create: {
            unitId: string;
            tenantId: string;
            startDate: Date;
            endDate: Date;
            monthlyRent: number;
            securityDeposit: number;
            terms?: string;
        };
        update: {
            id: string;
            startDate?: Date;
            endDate?: Date;
            monthlyRent?: number;
            securityDeposit?: number;
            status?: string;
            terms?: string;
        };
        delete: {
            id: string;
        };
    };
    maintenance: {
        list: {
            propertyId?: string;
            unitId?: string;
            status?: string;
            priority?: string;
        } | undefined;
        byId: {
            id: string;
        };
        create: {
            unitId: string;
            title: string;
            description: string;
            priority: string;
            allowEntry: boolean;
            contactPhone?: string;
            preferredDate?: Date;
        };
        update: {
            id: string;
            title?: string;
            description?: string;
            priority?: string;
            status?: string;
            assignedTo?: string;
            notes?: string;
            estimatedCost?: number;
            actualCost?: number;
        };
        delete: {
            id: string;
        };
    };
    subscriptions: {
        current: undefined;
        createCheckoutSession: {
            planType: string;
            billingInterval: 'monthly' | 'annual';
            successUrl: string;
            cancelUrl: string;
        };
        createPortalSession: {
            returnUrl: string;
        };
        cancel: undefined;
    };
};
export type RouterOutputs = {
    auth: {
        me: AuthUser;
        updateProfile: AuthUser;
        deleteAccount: {
            success: boolean;
        };
    };
    properties: {
        list: {
            data: Property[];
            pagination: {
                totalCount: number;
                totalPages: number;
                currentPage: number;
                hasNextPage: boolean;
                hasPreviousPage: boolean;
            };
        };
        byId: Property & {
            units: Unit[];
        };
        create: Property;
        update: Property;
        delete: {
            success: boolean;
        };
    };
    units: {
        list: Unit[];
        byId: Unit & {
            property: Property;
        };
        create: Unit;
        update: Unit;
        delete: {
            success: boolean;
        };
    };
    tenants: {
        list: {
            data: Tenant[];
            pagination: {
                totalCount: number;
                totalPages: number;
                currentPage: number;
                hasNextPage: boolean;
                hasPreviousPage: boolean;
            };
        };
        byId: Tenant;
        create: Tenant;
        update: Tenant;
        delete: {
            success: boolean;
        };
    };
    leases: {
        list: Lease[];
        byId: Lease;
        create: Lease;
        update: Lease;
        delete: {
            success: boolean;
        };
    };
    maintenance: {
        list: MaintenanceRequest[];
        byId: MaintenanceRequest;
        create: MaintenanceRequest;
        update: MaintenanceRequest;
        delete: {
            success: boolean;
        };
    };
    subscriptions: {
        current: Subscription | null;
        createCheckoutSession: {
            url: string;
            sessionId: string;
        };
        createPortalSession: {
            url: string;
        };
        cancel: {
            success: boolean;
        };
    };
};
export type AuthInputs = RouterInputs['auth'];
export type AuthOutputs = RouterOutputs['auth'];
export type PropertiesInputs = RouterInputs['properties'];
export type PropertiesOutputs = RouterOutputs['properties'];
export type UnitsInputs = RouterInputs['units'];
export type UnitsOutputs = RouterOutputs['units'];
export type TenantsInputs = RouterInputs['tenants'];
export type TenantsOutputs = RouterOutputs['tenants'];
export type LeasesInputs = RouterInputs['leases'];
export type LeasesOutputs = RouterOutputs['leases'];
export type MaintenanceInputs = RouterInputs['maintenance'];
export type MaintenanceOutputs = RouterOutputs['maintenance'];
export type SubscriptionsInputs = RouterInputs['subscriptions'];
export type SubscriptionsOutputs = RouterOutputs['subscriptions'];
export type PropertyListOutput = PropertiesOutputs['list'];
export type PropertyOutput = PropertiesOutputs['byId'];
export type SubscriptionOutput = SubscriptionsOutputs['current'];
//# sourceMappingURL=router.d.ts.map