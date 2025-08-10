/**
 * Enhanced lease management types for Issue #93
 * Includes lease templates, digital signatures, PDF generation, and lifecycle management
 */
// Enhanced lease status with new workflow states
export var EnhancedLeaseStatus;
(function (EnhancedLeaseStatus) {
    EnhancedLeaseStatus["DRAFT"] = "DRAFT";
    EnhancedLeaseStatus["PENDING_REVIEW"] = "PENDING_REVIEW";
    EnhancedLeaseStatus["PENDING_SIGNATURES"] = "PENDING_SIGNATURES";
    EnhancedLeaseStatus["SIGNED"] = "SIGNED";
    EnhancedLeaseStatus["ACTIVE"] = "ACTIVE";
    EnhancedLeaseStatus["EXPIRED"] = "EXPIRED";
    EnhancedLeaseStatus["TERMINATED"] = "TERMINATED";
    EnhancedLeaseStatus["PENDING_RENEWAL"] = "PENDING_RENEWAL";
})(EnhancedLeaseStatus || (EnhancedLeaseStatus = {}));
// Constants for UI
export const LeaseStatusLabels = {
    [EnhancedLeaseStatus.DRAFT]: 'Draft',
    [EnhancedLeaseStatus.PENDING_REVIEW]: 'Pending Review',
    [EnhancedLeaseStatus.PENDING_SIGNATURES]: 'Awaiting Signatures',
    [EnhancedLeaseStatus.SIGNED]: 'Signed',
    [EnhancedLeaseStatus.ACTIVE]: 'Active',
    [EnhancedLeaseStatus.EXPIRED]: 'Expired',
    [EnhancedLeaseStatus.TERMINATED]: 'Terminated',
    [EnhancedLeaseStatus.PENDING_RENEWAL]: 'Pending Renewal'
};
export const LeaseStatusColors = {
    [EnhancedLeaseStatus.DRAFT]: 'gray',
    [EnhancedLeaseStatus.PENDING_REVIEW]: 'yellow',
    [EnhancedLeaseStatus.PENDING_SIGNATURES]: 'blue',
    [EnhancedLeaseStatus.SIGNED]: 'green',
    [EnhancedLeaseStatus.ACTIVE]: 'emerald',
    [EnhancedLeaseStatus.EXPIRED]: 'orange',
    [EnhancedLeaseStatus.TERMINATED]: 'red',
    [EnhancedLeaseStatus.PENDING_RENEWAL]: 'purple'
};
export const SignatureStatusLabels = {
    PENDING: 'Pending',
    SENT: 'Sent',
    VIEWED: 'Viewed',
    SIGNED: 'Signed',
    DECLINED: 'Declined',
    EXPIRED: 'Expired'
};
export const AmendmentTypeLabels = {
    AMENDMENT: 'Amendment',
    ADDENDUM: 'Addendum',
    RIDER: 'Rider'
};
//# sourceMappingURL=lease-enhanced.js.map