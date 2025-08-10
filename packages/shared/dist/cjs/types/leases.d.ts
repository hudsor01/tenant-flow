/**
 * Shared lease-related types for TenantFlow
 * Centralizes lease template and requirements interfaces for use across frontend and backend
 */
export interface Lease {
    id: string;
    unitId: string;
    tenantId: string;
    startDate: Date | string;
    endDate: Date | string;
    rentAmount: number;
    securityDeposit: number;
    terms: string | null;
    status: LeaseStatus | string;
    createdAt: Date | string;
    updatedAt: Date | string;
}
export type LeaseStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
export interface LeaseTemplateData {
    propertyAddress: string;
    city: string;
    state: string;
    zipCode: string;
    unitNumber?: string;
    propertyType?: string;
    bedrooms?: number;
    bathrooms?: number;
    squareFootage?: number;
    landlordName: string;
    landlordEmail: string;
    landlordPhone?: string;
    landlordAddress: string;
    tenantNames: string[];
    rentAmount: number;
    securityDeposit: number;
    leaseStartDate: string;
    leaseEndDate: string;
    paymentDueDate: number;
    lateFeeAmount: number;
    lateFeeDays: number;
    paymentMethod: string;
    paymentAddress?: string;
    petPolicy: string;
    petDeposit?: number;
    smokingPolicy: string;
    maintenanceResponsibility: string;
    utilitiesIncluded: string[];
    additionalTerms?: string;
    stateSpecificClauses?: string[];
    requiredDisclosures?: string[];
}
export interface StateLeaseRequirements {
    securityDepositLimit: string;
    noticeToEnter: string;
    noticePeriod: string;
    requiredDisclosures: string[];
    mandatoryClauses?: string[];
    prohibitedClauses?: string[];
}
//# sourceMappingURL=leases.d.ts.map