/**
 * Tenant management types
 * All types related to tenants and tenant management
 */
export interface Tenant {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    emergencyContact: string | null;
    userId: string | null;
    invitationStatus: InvitationStatus;
    createdAt: Date;
    updatedAt: Date;
}
export type InvitationStatus = 'PENDING' | 'SENT' | 'ACCEPTED' | 'EXPIRED';
export declare const INVITATION_STATUS: {
    PENDING: "PENDING";
    SENT: "SENT";
    ACCEPTED: "ACCEPTED";
    EXPIRED: "EXPIRED";
};
export declare const INVITATION_STATUS_OPTIONS: ("PENDING" | "SENT" | "ACCEPTED" | "EXPIRED")[];
export interface TenantProperty {
    id: string;
    name: string;
    address: string;
    [key: string]: string | number | boolean | null | undefined;
}
export interface TenantUnit {
    id: string;
    unitNumber: string;
    property: TenantProperty;
    [key: string]: string | number | boolean | null | undefined | TenantProperty;
}
export interface TenantLease {
    id: string;
    status: string;
    unit: TenantUnit;
    unitId: string;
    [key: string]: string | number | boolean | null | undefined | TenantUnit;
}
export interface SimpleTenantWithLeases {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    emergencyContact: string | null;
    userId: string | null;
    invitationStatus: InvitationStatus;
    createdAt: Date;
    updatedAt: Date;
    leases?: TenantLease[];
}
export interface TenantWithUnitAndLease extends Tenant {
    currentLease: TenantLease | undefined;
    currentUnit: TenantUnit | undefined;
    currentProperty: TenantProperty | undefined;
}
export interface CurrentLeaseInfo {
    currentLease: TenantLease | undefined;
    currentUnit: TenantUnit | undefined;
    currentProperty: TenantProperty | undefined;
}
export interface TenantStats {
    totalTenants: number;
    activeTenants: number;
    inactiveTenants: number;
    pendingInvitations: number;
}
//# sourceMappingURL=tenants.d.ts.map