/**
 * Tenant utilities
 * Helper functions for tenant invitation status display
 */
type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'DECLINED' | 'CANCELLED';
export declare const getInvitationStatusLabel: (status: InvitationStatus) => string;
export declare const getInvitationStatusColor: (status: InvitationStatus) => string;
export {};
