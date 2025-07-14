// File: packages/types/api.ts
// Purpose: Shared API DTOs and response types for frontend and backend.

export interface ApiResponse<T = unknown> {
    data?: T;
    error?: string;
}

export interface ApiError {
    message: string;
    // Add additional error fields as needed
}

export interface AuthCredentials {
    email: string;
    password: string;
}

export interface RegisterData extends AuthCredentials {
    name: string;
}

export interface AuthResponse {
    access_token: string;
    // Add additional fields as needed
}

export interface RefreshTokenRequest {
    refresh_token: string;
}

import type { User, Lease } from "./entities";
export type UserProfileResponse = User;

export interface UpdateUserProfileDto {
    name?: string | null;
    // Add additional fields as needed
}

// Property API types
export interface CreatePropertyDto {
    name: string;
    // Add additional fields as needed
}

export interface UpdatePropertyDto {
    name?: string;
    // Add additional fields as needed
}

export interface PropertyStats {
    totalProperties: number;
    // Add additional fields as needed
}

// Tenant API types
export interface CreateTenantDto {
    name: string;
    // Add additional fields as needed
}

export interface UpdateTenantDto {
    name?: string;
    // Add additional fields as needed
}

export interface TenantStats {
    totalTenants: number;
    // Add additional fields as needed
}

// Unit API types
export interface CreateUnitDto {
    unitNumber: string;
    // Add additional fields as needed
}

export interface UpdateUnitDto {
    unitNumber?: string;
    // Add additional fields as needed
}

export interface UnitStats {
    totalUnits: number;
    // Add additional fields as needed
}

// Lease API types
export interface CreateLeaseDto {
    unitId: string;
    // Add additional fields as needed
}

export interface UpdateLeaseDto {
    startDate?: string;
    // Add additional fields as needed
}

export interface LeaseStats {
    totalLeases: number;
    // Add additional fields as needed
}

export interface ExpiringLease extends Lease {
    rentAmount: number;
    // Add additional fields as needed
}

// Payment API types
export interface CreatePaymentDto {
    leaseId: string;
    // Add additional fields as needed
}

export interface UpdatePaymentDto {
    amount?: number;
    // Add additional fields as needed
}

export interface PaymentAnalyticsData {
    totalPayments: number;
    // Add additional fields as needed
}

// Maintenance API types
export interface CreateMaintenanceDto {
    unitId: string;
    // Add additional fields as needed
}

export interface UpdateMaintenanceDto {
    title?: string;
    // Add additional fields as needed
}

// Notification API types
export interface CreateNotificationDto {
    title: string;
    // Add additional fields as needed
}

export interface UpdateNotificationDto {
    read?: boolean;
    // Add additional fields as needed
}

// File upload types
export interface FileUploadResponse {
    url: string;
    // Add additional fields as needed
}

// Query parameters for API calls
export interface PropertyQuery {
    page?: number;
    // Add additional fields as needed
}

export interface TenantQuery {
    page?: number;
    // Add additional fields as needed
}

export interface UnitQuery {
    page?: number;
    // Add additional fields as needed
}

export interface LeaseQuery {
    page?: number;
    // Add additional fields as needed
}

export interface PaymentQuery {
    page?: number;
    // Add additional fields as needed
}

export interface MaintenanceQuery {
    page?: number;
    // Add additional fields as needed
}

export interface NotificationQuery {
    page?: number;
    // Add additional fields as needed
}
