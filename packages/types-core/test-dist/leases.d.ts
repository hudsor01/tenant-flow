/**
 * Lease Management Types
 * Centralized type definitions for lease management
 */
export declare const LEASE_STATUS: {
    readonly ACTIVE: "ACTIVE";
    readonly EXPIRED: "EXPIRED";
    readonly TERMINATED: "TERMINATED";
    readonly PENDING: "PENDING";
    readonly DRAFT: "DRAFT";
};
export type LeaseStatus = typeof LEASE_STATUS[keyof typeof LEASE_STATUS];
export interface Lease {
    id: string;
    unitId: string;
    tenantId: string;
    startDate: Date;
    endDate: Date;
    monthlyRent: number;
    securityDeposit: number;
    status: LeaseStatus;
    terms: string | null;
    specialConditions: string | null;
    documentUrls: string[];
    signedDate: Date | null;
    renewalOptions: string | null;
    earlyTerminationClause: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface LeaseWithDetails extends Lease {
    unit: {
        id: string;
        unitNumber: string;
        property: {
            id: string;
            name: string;
            address: string;
        };
    };
    tenant: {
        id: string;
        name: string;
        email: string;
        phone: string | null;
    };
}
export interface RentReminder {
    id: string;
    leaseId: string;
    tenantId: string;
    dueDate: Date;
    amount: number;
    sent: boolean;
    sentDate: Date | null;
    paidDate: Date | null;
    createdAt: Date;
}
export interface CreateLeaseDTO {
    unitId: string;
    tenantId: string;
    startDate: Date;
    endDate: Date;
    monthlyRent: number;
    securityDeposit: number;
    terms?: string;
    specialConditions?: string;
    renewalOptions?: string;
    earlyTerminationClause?: string;
}
export interface UpdateLeaseDTO extends Partial<CreateLeaseDTO> {
    status?: LeaseStatus;
    signedDate?: Date;
}
