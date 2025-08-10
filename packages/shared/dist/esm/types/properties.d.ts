/**
 * Property management types
 * All types related to properties, units, and property management
 */
import type { PROPERTY_TYPE, UNIT_STATUS } from '../constants/properties';
export type PropertyType = typeof PROPERTY_TYPE[keyof typeof PROPERTY_TYPE];
export type UnitStatus = typeof UNIT_STATUS[keyof typeof UNIT_STATUS];
export declare const getPropertyTypeLabel: (type: PropertyType) => string;
export declare const getUnitStatusLabel: (status: UnitStatus) => string;
export declare const getUnitStatusColor: (status: UnitStatus) => string;
export interface Property {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    description: string | null;
    imageUrl: string | null;
    ownerId: string;
    propertyType: PropertyType;
    createdAt: Date;
    updatedAt: Date;
    units?: Unit[];
}
export interface Unit {
    id: string;
    unitNumber: string;
    propertyId: string;
    bedrooms: number;
    bathrooms: number;
    squareFeet: number | null;
    rent?: number;
    monthlyRent?: number;
    securityDeposit?: number;
    description?: string;
    amenities?: string[];
    status: UnitStatus | string;
    lastInspectionDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface Inspection {
    id: string;
    propertyId: string;
    unitId: string | null;
    inspectorId: string;
    type: string;
    scheduledDate: Date;
    completedDate: Date | null;
    status: string;
    notes: string | null;
    reportUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface Expense {
    id: string;
    propertyId: string;
    maintenanceId: string | null;
    amount: number;
    category: string;
    description: string;
    date: Date;
    receiptUrl: string | null;
    vendorName: string | null;
    vendorContact: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface PropertyStats {
    totalUnits: number;
    occupiedUnits: number;
    vacantUnits: number;
    occupancyRate: number;
    totalMonthlyRent: number;
    potentialRent: number;
    totalProperties?: number;
    totalRent?: number;
    collectedRent?: number;
    pendingRent?: number;
}
export interface CreatePropertyInput extends Record<string, unknown> {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    description?: string;
    imageUrl?: string;
    propertyType: PropertyType;
}
export interface UpdatePropertyInput extends Record<string, unknown> {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    description?: string;
    imageUrl?: string;
    propertyType?: PropertyType;
}
export interface PropertyEntitlements {
    isLoading: boolean;
    canCreateProperties: boolean;
    canCreateTenants: boolean;
    canCreateUnits: boolean;
    subscription: unknown;
}
//# sourceMappingURL=properties.d.ts.map