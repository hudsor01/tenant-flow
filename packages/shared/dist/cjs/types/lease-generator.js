"use strict";
/**
 * Lease Generator types (consolidated from apps/frontend/src/components/lease-generator/types)
 * These are frontend domain-specific types that should be accessible from shared package
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaseFormSchema = void 0;
const zod_1 = require("zod");
exports.leaseFormSchema = zod_1.z.object({
    // Property Information
    propertyAddress: zod_1.z.string().min(1, 'Property address is required'),
    city: zod_1.z.string().min(1, 'City is required'),
    state: zod_1.z.string().min(2, 'State is required'),
    zipCode: zod_1.z.string().min(5, 'Valid ZIP code is required'),
    unitNumber: zod_1.z.string().optional(),
    countyName: zod_1.z.string().optional(),
    propertyType: zod_1.z.enum(['house', 'apartment', 'condo', 'townhouse', 'duplex', 'other']),
    bedrooms: zod_1.z.number().optional(),
    bathrooms: zod_1.z.number().optional(),
    squareFootage: zod_1.z.number().optional(),
    // Landlord Information
    landlordName: zod_1.z.string().min(1, 'Landlord name is required'),
    landlordEmail: zod_1.z.string().email('Valid email is required'),
    landlordPhone: zod_1.z.string().optional(),
    landlordAddress: zod_1.z.string().min(1, 'Landlord address is required'),
    // Tenant Information
    tenantNames: zod_1.z.array(zod_1.z.object({ name: zod_1.z.string() })).min(1, 'At least one tenant is required'),
    // Lease Terms
    leaseStartDate: zod_1.z.string().min(1, 'Lease start date is required'),
    leaseEndDate: zod_1.z.string().min(1, 'Lease end date is required'),
    rentAmount: zod_1.z.number().min(1, 'Rent amount must be greater than 0'),
    securityDeposit: zod_1.z.number().min(0, 'Security deposit cannot be negative'),
    // Payment Information
    paymentDueDate: zod_1.z.number().min(1).max(31),
    lateFeeAmount: zod_1.z.number().min(0),
    lateFeeDays: zod_1.z.number().min(1),
    paymentMethod: zod_1.z.enum(['check', 'online', 'bank_transfer', 'cash']),
    paymentAddress: zod_1.z.string().optional(),
    // Additional Terms
    petPolicy: zod_1.z.enum(['allowed', 'not_allowed', 'with_deposit']),
    petDeposit: zod_1.z.number().optional(),
    parkingSpaces: zod_1.z.number().optional(),
    storageUnit: zod_1.z.string().optional(),
    smokingPolicy: zod_1.z.enum(['allowed', 'not_allowed']),
    maintenanceResponsibility: zod_1.z.enum(['landlord', 'tenant', 'shared']),
    utilitiesIncluded: zod_1.z.array(zod_1.z.string()),
    // Occupancy
    maxOccupants: zod_1.z.number().min(1),
    occupancyLimits: zod_1.z.object({
        adults: zod_1.z.number(),
        childrenUnder18: zod_1.z.number(),
        childrenUnder2: zod_1.z.number()
    }),
    // Emergency Contact
    emergencyContact: zod_1.z.object({
        name: zod_1.z.string(),
        phone: zod_1.z.string(),
        relationship: zod_1.z.string()
    }).optional(),
    // Additional fields
    moveInDate: zod_1.z.string().optional(),
    prorationAmount: zod_1.z.number().optional(),
    petDetails: zod_1.z.object({
        type: zod_1.z.string(),
        breed: zod_1.z.string(),
        weight: zod_1.z.string(),
        registration: zod_1.z.string()
    }).optional(),
    keyDeposit: zod_1.z.number().optional(),
    // Additional Clauses
    additionalTerms: zod_1.z.string().optional(),
    specialProvisions: zod_1.z.string().optional()
});
//# sourceMappingURL=lease-generator.js.map