import type { User } from "./auth";
import type { Lease } from "./leases";
import type { Property, Unit, PropertyStats } from "./properties";
import type { Tenant, TenantStats } from "./tenants";
import type { MaintenanceRequest } from "./maintenance";
import type { NotificationData } from "./notifications";
import type { AppError, AuthError, ValidationError, NetworkError, ServerError, BusinessError, FileUploadError, PaymentError, ErrorResponse, SuccessResponse, ApiResponse as CentralizedApiResponse, ControllerApiResponse } from "./errors";
export type { User, Lease, Property, Tenant, Unit, MaintenanceRequest };
export type { NotificationData };
export type { AppError, AuthError, ValidationError, NetworkError, ServerError, BusinessError, FileUploadError, PaymentError, ErrorResponse, SuccessResponse, CentralizedApiResponse, ControllerApiResponse };
export interface ApiError {
    message: string;
    statusCode: number;
    error?: string;
}
export interface AuthCredentials {
    email: string;
    password: string;
}
export interface RegisterData extends AuthCredentials {
    name: string;
    confirmPassword: string;
}
export interface RefreshTokenRequest {
    refresh_token: string;
}
export type UserProfileResponse = User;
export interface UpdateUserProfileDto {
    name?: string | null;
    phone?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
}
import type { CreatePropertyInput, UpdatePropertyInput, CreateTenantInput, UpdateTenantInput, CreateUnitInput, UpdateUnitInput, CreateLeaseInput, UpdateLeaseInput } from './api-inputs';
export type { CreatePropertyInput, UpdatePropertyInput, CreateTenantInput, UpdateTenantInput, CreateUnitInput, UpdateUnitInput, CreateLeaseInput, UpdateLeaseInput };
export interface UnitStats {
    totalUnits: number;
    availableUnits: number;
    occupiedUnits: number;
    maintenanceUnits: number;
    averageRent: number;
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
export interface FileUploadResponse {
    url: string;
    path: string;
    filename: string;
    size: number;
    mimeType: string;
}
export type { PropertyQuery, TenantQuery, UnitQuery, LeaseQuery, MaintenanceQuery, NotificationQuery } from './queries';
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
    unitId?: string;
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
export interface CreateSubscriptionRequest {
    planId: string;
    billingPeriod: string;
    userId?: string;
    userEmail?: string;
    userName?: string;
    createAccount?: boolean;
    paymentMethodCollection?: 'always' | 'if_required';
}
export interface CreateSubscriptionWithSignupRequest {
    planId: string;
    billingPeriod: string;
    userEmail: string;
    userName: string;
    createAccount: boolean;
    paymentMethodCollection?: 'always' | 'if_required';
}
export interface StartTrialRequest {
    planId?: string;
}
export interface CreatePortalSessionRequest {
    customerId?: string;
    returnUrl?: string;
}
export interface CancelSubscriptionRequest {
    subscriptionId: string;
}
export interface UpdateSubscriptionRequest {
    subscriptionId: string;
    planId?: string;
    billingPeriod?: string;
}
export interface CreateSubscriptionResponse {
    subscriptionId: string;
    status: string;
    clientSecret?: string | null;
    setupIntentId?: string;
    trialEnd?: number | null;
}
export interface CreateSubscriptionWithSignupResponse {
    subscriptionId: string;
    status: string;
    clientSecret?: string | null;
    setupIntentId?: string;
    trialEnd?: number | null;
    user: {
        id: string;
        email: string;
        fullName: string;
    };
    accessToken: string;
    refreshToken: string;
}
export interface StartTrialResponse {
    subscriptionId: string;
    status: string;
    trialEnd?: number | null;
}
export interface CreatePortalSessionResponse {
    url: string;
    sessionId?: string;
}
export interface CancelSubscriptionResponse {
    success: boolean;
    message: string;
}
export interface UpdateSubscriptionResponse {
    subscriptionId: string;
    status: string;
    message: string;
}
//# sourceMappingURL=api.d.ts.map