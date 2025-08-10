/**
 * Frontend utility types and type guards
 * Type guards, utility functions, and frontend-specific relationship types
 */
import type { TenantWithDetails } from './relations';
import type { Lease } from './leases';
import type { Unit, Property } from './properties';
/**
 * Type guard to check if tenant has leases
 */
export declare function tenantHasLeases(tenant: TenantWithDetails): tenant is TenantWithDetails & {
    leases: Lease[];
};
/**
 * Type guard to check if a value is a valid string ID
 */
export declare function isValidId(value: unknown): value is string;
/**
 * Type guard to check if a property has units
 */
export declare function propertyHasUnits(property: Property): property is Property & {
    units: Unit[];
};
/**
 * Type guard to check if a unit has active leases
 */
export declare function unitHasActiveLeases(unit: Unit): boolean;
/**
 * Type for tenant queries with nested lease/unit/property data
 * Used for frontend access control checks
 */
export interface TenantWithLeaseAccess {
    id: string;
    leases: {
        unit?: {
            property?: {
                ownerId: string;
            };
        };
    }[];
}
/**
 * Type for unit queries with nested property data
 * Used for frontend permission checks
 */
export interface UnitWithPropertyAccess {
    id: string;
    property: {
        ownerId: string;
    };
}
/**
 * Extended Lease type with full nested relations
 * Used for frontend display components that need all related data
 */
export interface LeaseWithFullRelations extends Lease {
    unit: Unit & {
        property: Property;
    };
}
/**
 * Get leases from tenant safely
 */
export declare function getTenantLeases(tenant: TenantWithDetails): Lease[];
/**
 * Get active leases from tenant
 */
export declare function getActiveTenantLeases(tenant: TenantWithDetails): Lease[];
/**
 * Get units from property safely
 */
export declare function getPropertyUnits(property: Property): Unit[];
/**
 * Get occupied units count
 */
export declare function getOccupiedUnitsCount(property: Property): number;
/**
 * Get total revenue from property
 */
export declare function getPropertyRevenue(property: Property): number;
/**
 * Check if user can access property
 */
export declare function canAccessProperty(property: Property, userId: string): boolean;
/**
 * Check if user can access tenant data
 */
export declare function canAccessTenant(tenant: TenantWithLeaseAccess, userId: string): boolean;
/**
 * Check if user can access unit
 */
export declare function canAccessUnit(unit: UnitWithPropertyAccess, userId: string): boolean;
/**
 * Generic loading state interface
 */
export interface LoadingState {
    isLoading: boolean;
    error: Error | null;
}
/**
 * Data with loading state
 */
export interface DataWithLoadingState<T> extends LoadingState {
    data: T | null;
}
/**
 * List data with loading state
 */
export interface ListWithLoadingState<T> extends LoadingState {
    data: T[];
    total?: number;
    hasMore?: boolean;
}
/**
 * Form state interface
 */
export interface FormState<T> {
    data: T;
    isDirty: boolean;
    isValid: boolean;
    errors: Record<string, string[]>;
}
/**
 * Modal state interface
 */
export interface ModalState {
    isOpen: boolean;
    mode: 'create' | 'edit' | 'view';
    data?: unknown;
}
/**
 * Generic API response wrapper
 */
export interface FrontendApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
/**
 * Paginated API response
 */
export interface PaginatedFrontendApiResponse<T> extends FrontendApiResponse<T[]> {
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}
/**
 * File upload state
 */
export interface FileUploadState {
    isUploading: boolean;
    progress: number;
    file: File | null;
    url?: string;
    error?: string;
}
/**
 * Table state interface
 */
export interface TableState<T> {
    data: T[];
    selectedRows: Set<string>;
    sortBy?: keyof T;
    sortOrder: 'asc' | 'desc';
    filters: Record<string, unknown>;
    pagination: {
        page: number;
        pageSize: number;
        total: number;
    };
}
/**
 * Search state interface
 */
export interface SearchState {
    query: string;
    isSearching: boolean;
    results: unknown[];
    totalResults: number;
}
/**
 * Filter state interface
 */
export interface FilterState {
    active: boolean;
    filters: Record<string, unknown>;
    appliedFilters: Record<string, unknown>;
}
/**
 * Field validation result
 */
export interface FieldValidation {
    isValid: boolean;
    errors: string[];
    warnings?: string[];
}
/**
 * Form validation result
 */
export interface FormValidation {
    isValid: boolean;
    fields: Record<string, FieldValidation>;
    globalErrors?: string[];
}
/**
 * Breadcrumb item
 */
export interface BreadcrumbItem {
    label: string;
    href?: string;
    isActive?: boolean;
}
/**
 * Navigation context
 */
export interface NavigationContext {
    currentPath: string;
    breadcrumbs: BreadcrumbItem[];
    canGoBack: boolean;
    canGoForward: boolean;
}
//# sourceMappingURL=frontend-utils.d.ts.map