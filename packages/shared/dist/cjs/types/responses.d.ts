/**
 * API Response Types
 * All response types for API endpoints across the application
 * These types define the structure of data returned from backend endpoints
 */
/**
 * Response from checkout session creation
 * Returned by Stripe checkout session endpoints
 */
export interface CheckoutResponse {
    url?: string;
    clientSecret?: string;
}
/**
 * Response from customer portal session creation
 * Returned by Stripe billing portal endpoints
 */
export interface PortalResponse {
    url: string;
}
/**
 * Response from trial activation
 * Stripe-aligned trial response interface based on official documentation
 */
export interface TrialResponse {
    success: boolean;
    subscriptionId?: string;
    trialEnd?: string;
    message?: string;
}
/**
 * Response from direct subscription creation
 * Based on Stripe's Payment Intent patterns
 */
export interface ApiSubscriptionCreateResponse {
    success: boolean;
    subscriptionId: string;
    clientSecret?: string;
    status: 'active' | 'trialing' | 'incomplete' | 'incomplete_expired';
    trialEnd?: string;
}
/**
 * Response from subscription update operations
 * Used for plan changes and modifications
 */
export interface SubscriptionUpdateResponse {
    success: boolean;
    subscriptionId: string;
    status: string;
    message?: string;
    prorationAmount?: number;
}
/**
 * Response from subscription cancellation
 * Used for subscription termination
 */
export interface SubscriptionCancelResponse {
    success: boolean;
    subscriptionId: string;
    canceledAt: string;
    accessUntil?: string;
    message?: string;
}
/**
 * Response from subscription preview operations
 * Used to show pricing changes before confirmation
 */
export interface SubscriptionPreviewResponse {
    success: boolean;
    prorationAmount: number;
    nextInvoiceTotal: number;
    effectiveDate: string;
    lineItems: {
        description: string;
        amount: number;
        type: 'proration' | 'invoice_item';
    }[];
}
/**
 * Response from property creation
 */
export interface PropertyCreateResponse {
    success: boolean;
    property: {
        id: string;
        name: string;
        address: string;
        city: string;
        state: string;
        zipCode: string;
        propertyType?: string;
        description?: string;
        imageUrl?: string;
        createdAt: string;
    };
}
/**
 * Response from property list endpoint
 */
export interface PropertyListResponse {
    success: boolean;
    properties: {
        id: string;
        name: string;
        address: string;
        city: string;
        state: string;
        zipCode: string;
        propertyType?: string;
        unitCount?: number;
        occupiedUnits?: number;
        monthlyRevenue?: number;
        imageUrl?: string;
        createdAt: string;
    }[];
    totalCount: number;
    hasMore: boolean;
}
/**
 * Response from property statistics endpoint
 */
export interface PropertyStatsResponse {
    success: boolean;
    totalProperties: number;
    totalUnits: number;
    occupiedUnits: number;
    vacantUnits: number;
    totalMonthlyRevenue: number;
    averageOccupancyRate: number;
}
/**
 * Response from unit creation
 */
export interface UnitCreateResponse {
    success: boolean;
    unit: {
        id: string;
        propertyId: string;
        unitNumber: string;
        bedrooms: number;
        bathrooms: number;
        squareFeet?: number;
        monthlyRent: number;
        securityDeposit?: number;
        status: string;
        description?: string;
        amenities?: string[];
        createdAt: string;
    };
}
/**
 * Response from unit list endpoint
 */
export interface UnitListResponse {
    success: boolean;
    units: {
        id: string;
        propertyId: string;
        unitNumber: string;
        bedrooms: number;
        bathrooms: number;
        monthlyRent: number;
        status: string;
        tenantName?: string;
        leaseEndDate?: string;
    }[];
    totalCount: number;
}
/**
 * Response from tenant creation
 */
export interface TenantCreateResponse {
    success: boolean;
    tenant: {
        id: string;
        name: string;
        email: string;
        phone?: string;
        emergencyContact?: string;
        emergencyPhone?: string;
        moveInDate?: string;
        status: string;
        createdAt: string;
    };
}
/**
 * Response from tenant list endpoint
 */
export interface TenantListResponse {
    success: boolean;
    tenants: {
        id: string;
        name: string;
        email: string;
        phone?: string;
        status: string;
        unitNumber?: string;
        propertyName?: string;
        moveInDate?: string;
        leaseEndDate?: string;
    }[];
    totalCount: number;
}
/**
 * Response from tenant statistics endpoint
 */
export interface TenantStatsResponse {
    success: boolean;
    totalTenants: number;
    activeTenants: number;
    upcomingMoveOuts: number;
    recentMoveIns: number;
}
/**
 * Response from lease creation
 */
export interface LeaseCreateResponse {
    success: boolean;
    lease: {
        id: string;
        unitId: string;
        tenantId: string;
        propertyId?: string;
        startDate: string;
        endDate: string;
        rentAmount: number;
        securityDeposit?: number;
        status: string;
        createdAt: string;
    };
}
/**
 * Response from lease list endpoint
 */
export interface LeaseListResponse {
    success: boolean;
    leases: {
        id: string;
        unitNumber: string;
        tenantName: string;
        propertyName: string;
        startDate: string;
        endDate: string;
        rentAmount: number;
        status: string;
    }[];
    totalCount: number;
}
/**
 * Response from maintenance request creation
 */
export interface MaintenanceCreateResponse {
    success: boolean;
    request: {
        id: string;
        unitId: string;
        title: string;
        description: string;
        category: string;
        priority: string;
        status: string;
        preferredDate?: string;
        createdAt: string;
    };
}
/**
 * Response from maintenance request list endpoint
 */
export interface MaintenanceListResponse {
    success: boolean;
    requests: {
        id: string;
        title: string;
        description: string;
        category: string;
        priority: string;
        status: string;
        unitNumber: string;
        propertyName: string;
        tenantName?: string;
        createdAt: string;
        preferredDate?: string;
        assignedTo?: string;
    }[];
    totalCount: number;
}
/**
 * Response from usage metrics endpoint
 */
export interface UsageMetricsResponse {
    success: boolean;
    metrics: {
        propertiesCount: number;
        tenantsCount: number;
        leasesCount: number;
        storageUsedMB: number;
        apiCallsCount: number;
        leaseGenerationsCount: number;
        month: string;
    };
    limits?: {
        properties: number;
        tenants: number;
        storage: number;
        apiCalls: number;
    };
    limitChecks?: {
        propertiesExceeded: boolean;
        tenantsExceeded: boolean;
        storageExceeded: boolean;
        apiCallsExceeded: boolean;
    };
}
/**
 * Response from activity feed endpoint
 */
export interface ActivityFeedResponse {
    success: boolean;
    activities: {
        id: string;
        type: string;
        title: string;
        description: string;
        entityType: string;
        entityId: string;
        userId: string;
        userName: string;
        createdAt: string;
        metadata?: Record<string, unknown>;
    }[];
    hasMore: boolean;
}
/**
 * Standard success response wrapper
 */
export interface ApiSuccessResponse<T = unknown> {
    success: true;
    data: T;
    message?: string;
    timestamp: string;
}
/**
 * Standard error response wrapper
 */
export interface ApiErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
    };
    timestamp: string;
}
/**
 * Paginated response wrapper
 */
export interface ApiPaginatedResponse<T = unknown> {
    success: boolean;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        hasMore: boolean;
    };
    timestamp: string;
}
//# sourceMappingURL=responses.d.ts.map