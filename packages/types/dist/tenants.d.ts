export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';
export declare const INVITATION_STATUS: {
    readonly PENDING: "PENDING";
    readonly ACCEPTED: "ACCEPTED";
    readonly EXPIRED: "EXPIRED";
    readonly CANCELLED: "CANCELLED";
};
export declare const INVITATION_STATUS_OPTIONS: ("EXPIRED" | "CANCELLED" | "PENDING" | "ACCEPTED")[];
export declare const getInvitationStatusLabel: (status: InvitationStatus) => string;
export declare const getInvitationStatusColor: (status: InvitationStatus) => string;
export interface Tenant {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    emergencyContact: string | null;
    userId: string | null;
    invitationStatus: InvitationStatus;
    invitationToken: string | null;
    invitedBy: string | null;
    invitedAt: Date | null;
    acceptedAt: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=tenants.d.ts.map