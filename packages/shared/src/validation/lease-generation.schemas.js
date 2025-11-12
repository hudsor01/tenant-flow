"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaseAutoFillSchema = exports.leaseGenerationSchema = exports.validateDateString = void 0;
const zod_1 = require("zod");
const validateDateString = (val) => {
    if (typeof val === 'string' && val.length > 0) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) {
            throw new Error('Date must be in YYYY-MM-DD format');
        }
        const date = new Date(`${val}T00:00:00.000Z`);
        if (isNaN(date.getTime())) {
            throw new Error('Invalid date');
        }
        const [year, month, day] = val.split('-').map(Number);
        if (date.getUTCFullYear() !== year ||
            date.getUTCMonth() + 1 !== month ||
            date.getUTCDate() !== day) {
            throw new Error('Invalid date');
        }
    }
    return val;
};
exports.validateDateString = validateDateString;
exports.leaseGenerationSchema = zod_1.z.object({
    agreementDate: zod_1.z.preprocess(exports.validateDateString, zod_1.z.string().min(1, 'Agreement date is required')),
    ownerName: zod_1.z.string().min(1, 'Property owner name is required'),
    ownerAddress: zod_1.z.string().min(1, 'Property owner address is required'),
    ownerPhone: zod_1.z.string().optional(),
    tenantName: zod_1.z.string().min(1, 'Tenant name is required'),
    propertyAddress: zod_1.z.string().min(1, 'Property address is required'),
    commencementDate: zod_1.z.preprocess(exports.validateDateString, zod_1.z.string().min(1, 'Commencement date is required')),
    terminationDate: zod_1.z.preprocess(exports.validateDateString, zod_1.z.string().min(1, 'Termination date is required')),
    monthlyRent: zod_1.z.number().gt(0, 'Monthly rent must be positive'),
    rentDueDay: zod_1.z.number().min(1).max(31).default(1),
    lateFeeAmount: zod_1.z.number().min(0).optional(),
    lateFeeGraceDays: zod_1.z.number().min(0).default(3),
    nsfFee: zod_1.z.number().min(0).default(50),
    securityDeposit: zod_1.z.number().min(0),
    securityDepositDueDays: zod_1.z.number().min(0).default(30),
    maxOccupants: zod_1.z.number().min(1).optional(),
    allowedUse: zod_1.z
        .string()
        .default('Residential dwelling purposes only. No business activities.'),
    alterationsAllowed: zod_1.z.boolean().default(false),
    alterationsRequireConsent: zod_1.z.boolean().default(true),
    utilitiesIncluded: zod_1.z.array(zod_1.z.string()).default([]),
    tenantResponsibleUtilities: zod_1.z.array(zod_1.z.string()).default([]),
    propertyRules: zod_1.z.string().optional(),
    holdOverRentMultiplier: zod_1.z.number().min(1).default(1.2),
    petsAllowed: zod_1.z.boolean().default(false),
    petDeposit: zod_1.z.number().min(0).default(0),
    petRent: zod_1.z.number().min(0).default(0),
    prevailingPartyAttorneyFees: zod_1.z.boolean().default(true),
    governingState: zod_1.z.string().default('TX'),
    noticeAddress: zod_1.z.string().optional(),
    noticeEmail: zod_1.z.string().email().optional(),
    propertyBuiltBefore1978: zod_1.z.boolean().default(false),
    leadPaintDisclosureProvided: zod_1.z.boolean().optional(),
    propertyId: zod_1.z.string().uuid('Invalid property ID'),
    tenantId: zod_1.z.string().optional()
}).refine((data) => {
    const commence = new Date(`${data.commencementDate}T00:00:00.000Z`);
    const terminate = new Date(`${data.terminationDate}T00:00:00.000Z`);
    if (isNaN(commence.getTime()) || isNaN(terminate.getTime())) {
        return true;
    }
    return terminate > commence;
}, {
    message: 'Termination date must be after commencement date',
    path: ['terminationDate']
});
exports.leaseAutoFillSchema = zod_1.z.object({
    propertyId: zod_1.z.string().uuid('Invalid property ID'),
    unitId: zod_1.z.string().uuid('Invalid unit ID'),
    tenantId: zod_1.z.string().uuid('Invalid tenant ID')
});
//# sourceMappingURL=lease-generation.schemas.js.map