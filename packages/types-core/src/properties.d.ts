export declare const PROPERTY_TYPE: {
    readonly SINGLE_FAMILY: "SINGLE_FAMILY";
    readonly MULTI_FAMILY: "MULTI_FAMILY";
    readonly APARTMENT: "APARTMENT";
    readonly CONDO: "CONDO";
    readonly TOWNHOUSE: "TOWNHOUSE";
    readonly COMMERCIAL: "COMMERCIAL";
};
export type PropertyType = typeof PROPERTY_TYPE[keyof typeof PROPERTY_TYPE];
export declare const UNIT_STATUS: {
    readonly AVAILABLE: "AVAILABLE";
    readonly OCCUPIED: "OCCUPIED";
    readonly MAINTENANCE: "MAINTENANCE";
    readonly VACANT: "VACANT";
};
export type UnitStatus = typeof UNIT_STATUS[keyof typeof UNIT_STATUS];
export interface Property {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    propertyType: PropertyType;
    description: string | null;
    imageUrls: string[];
    ownerId: string;
    totalUnits: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface Unit {
    id: string;
    propertyId: string;
    unitNumber: string;
    bedrooms: number;
    bathrooms: number;
    squareFeet: number | null;
    monthlyRent: number;
    securityDeposit: number;
    status: UnitStatus;
    description: string | null;
    amenities: string[];
    imageUrls: string[];
    createdAt: Date;
    updatedAt: Date;
}
export interface PropertyWithUnits extends Property {
    units: Unit[];
}
export interface UnitWithProperty extends Unit {
    property: Property;
}
export interface Inspection {
    id: string;
    propertyId: string;
    unitId: string | null;
    inspectorId: string;
    scheduledDate: Date;
    completedDate: Date | null;
    type: string;
    notes: string | null;
    findings: string[];
    status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    createdAt: Date;
    updatedAt: Date;
}
export interface Expense {
    id: string;
    propertyId: string;
    unitId: string | null;
    category: string;
    description: string;
    amount: number;
    date: Date;
    receiptUrl: string | null;
    isRecurring: boolean;
    recurringInterval: string | null;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=properties.d.ts.map