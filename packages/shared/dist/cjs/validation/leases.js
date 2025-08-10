"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaseSchema = exports.leaseStatusEnum = void 0;
// Lease validation schema for TenantFlow
const zod_1 = require("zod");
// Enhanced validation with Zod patterns
const positiveMoneyAmount = zod_1.z
    .number({
    error: 'Must be a valid number'
})
    .min(0, { message: 'Amount must be positive' })
    .max(100000, { message: 'Amount exceeds maximum limit' })
    .refine(Number.isFinite, { message: 'Must be a finite number' });
const uuidString = zod_1.z
    .string({
    error: 'Required field'
})
    .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, { message: 'Must be a valid identifier' });
const dateString = zod_1.z
    .string({
    error: 'Date is required'
})
    .refine(val => /^\d{4}-\d{2}-\d{2}$/.test(val) ||
    !isNaN(Date.parse(val)), { message: 'Invalid date format' });
exports.leaseStatusEnum = zod_1.z.enum(['ACTIVE', 'INACTIVE', 'EXPIRED', 'TERMINATED', 'DRAFT'], {
    error: 'Lease status is required'
});
exports.leaseSchema = zod_1.z
    .object({
    propertyId: uuidString,
    unitId: uuidString.optional().or(zod_1.z.null()),
    tenantId: uuidString,
    startDate: dateString,
    endDate: dateString,
    rentAmount: positiveMoneyAmount,
    securityDeposit: positiveMoneyAmount.default(0),
    status: exports.leaseStatusEnum.default('DRAFT')
})
    .refine(data => {
    try {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        return !isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start;
    }
    catch {
        return false;
    }
}, {
    message: 'End date must be after start date',
    path: ['endDate']
});
//# sourceMappingURL=leases.js.map