"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaseUpdateSchema = exports.leaseTerminationSchema = exports.leaseRenewalSchema = exports.leaseInputSchema = exports.smokingPolicyEnum = exports.leaseTypeEnum = exports.leaseStatusEnum = void 0;
const zod_1 = require("zod");
const supabase_generated_js_1 = require("../types/supabase-generated.js");
const common_js_1 = require("./common.js");
const positiveMoneyAmount = zod_1.z
    .number()
    .positive({ message: 'Amount must be greater than zero' })
    .max(100000, { message: 'Amount exceeds maximum limit' })
    .refine(Number.isFinite, { message: 'Must be a finite number' });
const uuidString = zod_1.z
    .string()
    .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, { message: 'Must be a valid identifier' });
const dateString = zod_1.z
    .string()
    .refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val) || !isNaN(Date.parse(val)), {
    message: 'Invalid date format'
});
exports.leaseStatusEnum = zod_1.z.enum(supabase_generated_js_1.Constants.public.Enums.LeaseStatus);
exports.leaseTypeEnum = zod_1.z.enum(supabase_generated_js_1.Constants.public.Enums.LeaseType);
exports.smokingPolicyEnum = zod_1.z.enum(['ALLOWED', 'NOT_ALLOWED']);
const leaseBaseSchema = zod_1.z.object({
    unitId: uuidString,
    tenantId: uuidString,
    startDate: dateString,
    endDate: dateString.optional().nullable(),
    rentAmount: positiveMoneyAmount,
    securityDeposit: positiveMoneyAmount.optional().nullable().or(zod_1.z.literal(0)),
    terms: zod_1.z.string().optional().nullable(),
    status: exports.leaseStatusEnum.default('DRAFT'),
    propertyId: uuidString.optional().nullable(),
    monthlyRent: positiveMoneyAmount.optional().nullable()
});
exports.leaseInputSchema = leaseBaseSchema.refine((data) => {
    try {
        const start = new Date(data.startDate);
        if (!data.endDate)
            return true;
        const end = new Date(data.endDate);
        return !isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start;
    }
    catch {
        return false;
    }
}, {
    message: 'End date must be after start date (or null for month-to-month)',
    path: ['endDate']
});
exports.leaseRenewalSchema = zod_1.z.object({
    endDate: dateString,
    newRent: positiveMoneyAmount.optional(),
    renewalTerms: zod_1.z.string().optional()
});
exports.leaseTerminationSchema = zod_1.z.object({
    terminationDate: dateString,
    reason: common_js_1.requiredString,
    earlyTerminationFee: positiveMoneyAmount.optional(),
    refundableDeposit: positiveMoneyAmount.optional(),
    notes: zod_1.z.string().optional()
});
exports.leaseUpdateSchema = leaseBaseSchema.partial();
//# sourceMappingURL=leases.js.map