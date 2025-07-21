// File: packages/shared/api.ts
// Purpose: Shared API DTOs and response types for frontend and backend.

import type { User } from "./auth";
import type { Lease, LeaseStatus } from "./leases";
import type { Property, Unit, PropertyType, UnitStatus } from "./properties";
import type { Tenant } from "./tenants";
import type { MaintenanceRequest, RequestStatus } from "./maintenance";
import type { NotificationData } from "./notifications";
import type { Subscription } from "./billing";
import type { AppError, AuthError, ValidationError, NetworkError, ServerError, BusinessError, FileUploadError, PaymentError, ErrorResponse, SuccessResponse, ApiResponse as CentralizedApiResponse } from "./errors";

// Re-export commonly used types
export type { User, Lease, Property, Tenant, Unit, MaintenanceRequest };
export type { NotificationData };
export type { AppError, AuthError, ValidationError, NetworkError, ServerError, BusinessError, FileUploadError, PaymentError, ErrorResponse, SuccessResponse, CentralizedApiResponse };

// Base API response types
export interface ApiResponse<T = unknown> {
    data?: T;
    error?: string;
    message?: string;
    statusCode?: number;
}

export interface ApiError {
    message: string;
    statusCode: number;
    error?: string;
}

// Authentication types
export interface AuthCredentials {
    email: string;
    password: string;
}

export interface RegisterData extends AuthCredentials {
    name: string;
    confirmPassword: string;
}

export interface AuthResponse {
    access_token: string;
    refresh_token?: string;
    user: {
        id: string;
        email: string;
        name?: string;
    };
}

export interface RefreshTokenRequest {
    refresh_token: string;
}

// User API types
export type UserProfileResponse = User;

export interface UpdateUserProfileDto {
    name?: string | null;
    phone?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
}

// Property API types
export interface CreatePropertyDto {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    description?: string;
    propertyType?: PropertyType;
    imageUrl?: string;
    hasGarage?: boolean;
    hasPool?: boolean;
    numberOfUnits?: number;
    createUnitsNow?: boolean;
}

export interface UpdatePropertyDto {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    description?: string;
    propertyType?: PropertyType;
    imageUrl?: string;
    hasGarage?: boolean;
    hasPool?: boolean;
    numberOfUnits?: number;
}

export interface PropertyStats {
    totalProperties: number;
    totalUnits: number;
    occupiedUnits: number;
    vacantUnits: number;
    totalRentAmount: number;
    collectionsRate: number;
}

// Tenant API types
export interface CreateTenantDto {
    name: string;
    email: string;
    phone?: string;
    emergencyContact?: string;
}

export interface UpdateTenantDto {
    name?: string;
    email?: string;
    phone?: string;
    emergencyContact?: string;
}

export interface TenantStats {
    totalTenants: number;
    activeTenants: number;
    inactiveTenants: number;
    pendingInvitations: number;
}

// Unit API types
export interface CreateUnitDto {
    unitNumber: string;
    propertyId: string;
    bedrooms?: number;
    bathrooms?: number;
    squareFeet?: number;
    rent: number;
    status?: UnitStatus;
}

export interface UpdateUnitDto {
    unitNumber?: string;
    bedrooms?: number;
    bathrooms?: number;
    squareFeet?: number;
    rent?: number;
    status?: UnitStatus;
    lastInspectionDate?: string;
}

export interface UnitStats {
    totalUnits: number;
    availableUnits: number;
    occupiedUnits: number;
    maintenanceUnits: number;
    averageRent: number;
}

// Lease API types
export interface CreateLeaseDto {
    unitId: string;
    tenantId: string;
    startDate: string;
    endDate: string;
    rentAmount: number;
    securityDeposit: number;
    status?: LeaseStatus;
}

export interface UpdateLeaseDto {
    startDate?: string;
    endDate?: string;
    rentAmount?: number;
    securityDeposit?: number;
    status?: LeaseStatus;
}

export interface LeaseStats {
    totalLeases: number;
    activeLeases: number;
    expiredLeases: number;
    pendingLeases: number;
    totalRentRoll: number;
}

export interface ExpiringLease extends Omit<Lease, 'endDate'> {
    rentAmount: number;
    endDate: string;
    unit: Unit & {
        property: Property;
    };
    tenant: Tenant;
    daysUntilExpiry: number;
}


// Maintenance API types
export interface CreateMaintenanceDto {
    unitId: string;
    title: string;
    description: string;
    priority?: string;
    status?: string;
}

export interface UpdateMaintenanceDto {
    title?: string;
    description?: string;
    priority?: string;
    status?: string;
    assignedTo?: string;
    estimatedCost?: number;
    actualCost?: number;
    completedAt?: string;
}

// Notification API types
export interface CreateNotificationDto {
    title: string;
    message: string;
    type: string;
    priority: string;
    userId: string;
    propertyId?: string;
    tenantId?: string;
    leaseId?: string;
    maintenanceId?: string;
    actionUrl?: string;
    data?: Record<string, unknown>;
}

export interface UpdateNotificationDto {
    read?: boolean;
}

// File upload types
export interface FileUploadResponse {
    url: string;
    path: string;
    filename: string;
    size: number;
    mimeType: string;
}

// Query parameters for API calls
export interface PropertyQuery {
    page?: number;
    limit?: number;
    search?: string;
    propertyType?: PropertyType;
}

export interface TenantQuery {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
}

export interface UnitQuery {
    page?: number;
    limit?: number;
    propertyId?: string;
    status?: UnitStatus;
}

export interface LeaseQuery {
    page?: number;
    limit?: number;
    status?: LeaseStatus;
    expiring?: boolean;
    days?: number;
}


export interface MaintenanceQuery {
    page?: number;
    limit?: number;
    unitId?: string;
    status?: string;
    priority?: string;
}

export interface NotificationQuery {
    page?: number;
    limit?: number;
    read?: boolean;
    type?: string;
}

// Extended entity types with relationships for API responses
export interface PropertyWithDetails extends Property {
    units?: Unit[];
    _count?: {
        units: number;
        leases: number;
    };
}

export interface TenantWithDetails extends Tenant {
    leases?: LeaseWithDetails[];
    maintenanceRequests?: MaintenanceWithDetails[];
    _count?: {
        leases: number;
    };
}

export interface UnitWithDetails extends Omit<Unit, 'lease' | 'leases'> {
    property?: Property;
    lease?: LeaseWithDetails;
    leases?: LeaseWithDetails[];
    maintenanceRequests?: MaintenanceRequest[];
    _count?: {
        leases: number;
        maintenanceRequests: number;
    };
}

export interface LeaseWithDetails extends Lease {
    unit?: Unit & {
        property: Property;
    };
    tenant?: Tenant;
}


export interface MaintenanceWithDetails extends MaintenanceRequest {
    unit?: Unit & {
        property: Property;
    };
}

export interface NotificationWithDetails extends NotificationData {
    property?: Property;
    tenant?: Tenant;
    lease?: Lease;
    maintenanceRequest?: MaintenanceRequest;
}

// Dashboard statistics
export interface DashboardStats {
    properties: PropertyStats;
    tenants: TenantStats;
    units: UnitStats;
    leases: LeaseStats;
    maintenanceRequests: {
        total: number;
        open: number;
        inProgress: number;
        completed: number;
    };
    notifications: {
        total: number;
        unread: number;
    };
}

// Invitation types
export interface InviteTenantDto {
    name: string;
    email: string;
    phone?: string;
    emergencyContact?: string;
    propertyId: string;
    unitId: string;
}

export interface InviteTenantData {
    name: string;
    email: string;
    phone?: string;
    propertyId: string;
    unitId?: string; // Optional unit selection
}

export interface InvitationResponse {
    success: boolean;
    message: string;
    invitation?: {
        id: string;
        token: string;
        expiresAt: string;
    };
}