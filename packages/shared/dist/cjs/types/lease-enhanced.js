"use strict";
/**
 * Enhanced lease management types for Issue #93
 * Includes lease templates, digital signatures, PDF generation, and lifecycle management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmendmentTypeLabels = exports.SignatureStatusLabels = exports.LeaseStatusColors = exports.LeaseStatusLabels = exports.EnhancedLeaseStatus = void 0;
// Enhanced lease status with new workflow states
var EnhancedLeaseStatus;
(function (EnhancedLeaseStatus) {
    EnhancedLeaseStatus["DRAFT"] = "DRAFT";
    EnhancedLeaseStatus["PENDING_REVIEW"] = "PENDING_REVIEW";
    EnhancedLeaseStatus["PENDING_SIGNATURES"] = "PENDING_SIGNATURES";
    EnhancedLeaseStatus["SIGNED"] = "SIGNED";
    EnhancedLeaseStatus["ACTIVE"] = "ACTIVE";
    EnhancedLeaseStatus["EXPIRED"] = "EXPIRED";
    EnhancedLeaseStatus["TERMINATED"] = "TERMINATED";
    EnhancedLeaseStatus["PENDING_RENEWAL"] = "PENDING_RENEWAL";
})(EnhancedLeaseStatus || (exports.EnhancedLeaseStatus = EnhancedLeaseStatus = {}));
// Constants for UI
exports.LeaseStatusLabels = {
    [EnhancedLeaseStatus.DRAFT]: 'Draft',
    [EnhancedLeaseStatus.PENDING_REVIEW]: 'Pending Review',
    [EnhancedLeaseStatus.PENDING_SIGNATURES]: 'Awaiting Signatures',
    [EnhancedLeaseStatus.SIGNED]: 'Signed',
    [EnhancedLeaseStatus.ACTIVE]: 'Active',
    [EnhancedLeaseStatus.EXPIRED]: 'Expired',
    [EnhancedLeaseStatus.TERMINATED]: 'Terminated',
    [EnhancedLeaseStatus.PENDING_RENEWAL]: 'Pending Renewal'
};
exports.LeaseStatusColors = {
    [EnhancedLeaseStatus.DRAFT]: 'gray',
    [EnhancedLeaseStatus.PENDING_REVIEW]: 'yellow',
    [EnhancedLeaseStatus.PENDING_SIGNATURES]: 'blue',
    [EnhancedLeaseStatus.SIGNED]: 'green',
    [EnhancedLeaseStatus.ACTIVE]: 'emerald',
    [EnhancedLeaseStatus.EXPIRED]: 'orange',
    [EnhancedLeaseStatus.TERMINATED]: 'red',
    [EnhancedLeaseStatus.PENDING_RENEWAL]: 'purple'
};
exports.SignatureStatusLabels = {
    PENDING: 'Pending',
    SENT: 'Sent',
    VIEWED: 'Viewed',
    SIGNED: 'Signed',
    DECLINED: 'Declined',
    EXPIRED: 'Expired'
};
exports.AmendmentTypeLabels = {
    AMENDMENT: 'Amendment',
    ADDENDUM: 'Addendum',
    RIDER: 'Rider'
};
//# sourceMappingURL=lease-enhanced.js.map