/**
 * Lease Generator types (consolidated from apps/frontend/src/components/lease-generator/types)
 * These are frontend domain-specific types that should be accessible from shared package
 */
import { z } from 'zod';
export const leaseFormSchema = z.object({
    // Property Information
    propertyAddress: z.string().min(1, 'Property address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(2, 'State is required'),
    zipCode: z.string().min(5, 'Valid ZIP code is required'),
    unitNumber: z.string().optional(),
    countyName: z.string().optional(),
    propertyType: z.enum(['house', 'apartment', 'condo', 'townhouse', 'duplex', 'other']),
    bedrooms: z.number().optional(),
    bathrooms: z.number().optional(),
    squareFootage: z.number().optional(),
    // Landlord Information
    landlordName: z.string().min(1, 'Landlord name is required'),
    landlordEmail: z.string().email('Valid email is required'),
    landlordPhone: z.string().optional(),
    landlordAddress: z.string().min(1, 'Landlord address is required'),
    // Tenant Information
    tenantNames: z.array(z.object({ name: z.string() })).min(1, 'At least one tenant is required'),
    // Lease Terms
    leaseStartDate: z.string().min(1, 'Lease start date is required'),
    leaseEndDate: z.string().min(1, 'Lease end date is required'),
    rentAmount: z.number().min(1, 'Rent amount must be greater than 0'),
    securityDeposit: z.number().min(0, 'Security deposit cannot be negative'),
    // Payment Information
    paymentDueDate: z.number().min(1).max(31),
    lateFeeAmount: z.number().min(0),
    lateFeeDays: z.number().min(1),
    paymentMethod: z.enum(['check', 'online', 'bank_transfer', 'cash']),
    paymentAddress: z.string().optional(),
    // Additional Terms
    petPolicy: z.enum(['allowed', 'not_allowed', 'with_deposit']),
    petDeposit: z.number().optional(),
    parkingSpaces: z.number().optional(),
    storageUnit: z.string().optional(),
    smokingPolicy: z.enum(['allowed', 'not_allowed']),
    maintenanceResponsibility: z.enum(['landlord', 'tenant', 'shared']),
    utilitiesIncluded: z.array(z.string()),
    // Occupancy
    maxOccupants: z.number().min(1),
    occupancyLimits: z.object({
        adults: z.number(),
        childrenUnder18: z.number(),
        childrenUnder2: z.number()
    }),
    // Emergency Contact
    emergencyContact: z.object({
        name: z.string(),
        phone: z.string(),
        relationship: z.string()
    }).optional(),
    // Additional fields
    moveInDate: z.string().optional(),
    prorationAmount: z.number().optional(),
    petDetails: z.object({
        type: z.string(),
        breed: z.string(),
        weight: z.string(),
        registration: z.string()
    }).optional(),
    keyDeposit: z.number().optional(),
    // Additional Clauses
    additionalTerms: z.string().optional(),
    specialProvisions: z.string().optional()
});
//# sourceMappingURL=lease-generator.js.map