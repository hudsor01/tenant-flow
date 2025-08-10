/**
 * Lease Generator types (consolidated from apps/frontend/src/components/lease-generator/types)
 * These are frontend domain-specific types that should be accessible from shared package
 */
import { z } from 'zod';
import type { UseFormReturn } from 'react-hook-form';
export declare const leaseFormSchema: z.ZodObject<{
    propertyAddress: z.ZodString;
    city: z.ZodString;
    state: z.ZodString;
    zipCode: z.ZodString;
    unitNumber: z.ZodOptional<z.ZodString>;
    countyName: z.ZodOptional<z.ZodString>;
    propertyType: z.ZodEnum<{
        house: "house";
        apartment: "apartment";
        condo: "condo";
        townhouse: "townhouse";
        duplex: "duplex";
        other: "other";
    }>;
    bedrooms: z.ZodOptional<z.ZodNumber>;
    bathrooms: z.ZodOptional<z.ZodNumber>;
    squareFootage: z.ZodOptional<z.ZodNumber>;
    landlordName: z.ZodString;
    landlordEmail: z.ZodString;
    landlordPhone: z.ZodOptional<z.ZodString>;
    landlordAddress: z.ZodString;
    tenantNames: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>>;
    leaseStartDate: z.ZodString;
    leaseEndDate: z.ZodString;
    rentAmount: z.ZodNumber;
    securityDeposit: z.ZodNumber;
    paymentDueDate: z.ZodNumber;
    lateFeeAmount: z.ZodNumber;
    lateFeeDays: z.ZodNumber;
    paymentMethod: z.ZodEnum<{
        check: "check";
        online: "online";
        bank_transfer: "bank_transfer";
        cash: "cash";
    }>;
    paymentAddress: z.ZodOptional<z.ZodString>;
    petPolicy: z.ZodEnum<{
        allowed: "allowed";
        not_allowed: "not_allowed";
        with_deposit: "with_deposit";
    }>;
    petDeposit: z.ZodOptional<z.ZodNumber>;
    parkingSpaces: z.ZodOptional<z.ZodNumber>;
    storageUnit: z.ZodOptional<z.ZodString>;
    smokingPolicy: z.ZodEnum<{
        allowed: "allowed";
        not_allowed: "not_allowed";
    }>;
    maintenanceResponsibility: z.ZodEnum<{
        tenant: "tenant";
        landlord: "landlord";
        shared: "shared";
    }>;
    utilitiesIncluded: z.ZodArray<z.ZodString>;
    maxOccupants: z.ZodNumber;
    occupancyLimits: z.ZodObject<{
        adults: z.ZodNumber;
        childrenUnder18: z.ZodNumber;
        childrenUnder2: z.ZodNumber;
    }, z.core.$strip>;
    emergencyContact: z.ZodOptional<z.ZodObject<{
        name: z.ZodString;
        phone: z.ZodString;
        relationship: z.ZodString;
    }, z.core.$strip>>;
    moveInDate: z.ZodOptional<z.ZodString>;
    prorationAmount: z.ZodOptional<z.ZodNumber>;
    petDetails: z.ZodOptional<z.ZodObject<{
        type: z.ZodString;
        breed: z.ZodString;
        weight: z.ZodString;
        registration: z.ZodString;
    }, z.core.$strip>>;
    keyDeposit: z.ZodOptional<z.ZodNumber>;
    additionalTerms: z.ZodOptional<z.ZodString>;
    specialProvisions: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type LeaseFormData = z.infer<typeof leaseFormSchema>;
export interface PropertyInfoSectionProps {
    form: UseFormReturn<LeaseFormData>;
    supportedStates: string[];
}
export interface TenantInfoSectionProps {
    form: UseFormReturn<LeaseFormData>;
}
export interface LeaseTermsSectionProps {
    form: UseFormReturn<LeaseFormData>;
}
export interface AdditionalTermsSectionProps {
    form: UseFormReturn<LeaseFormData>;
}
export interface PartiesInfoSectionProps {
    form: UseFormReturn<LeaseFormData>;
}
export type LeaseGeneratorForm = LeaseFormData;
export type LeaseOutputFormat = 'html' | 'pdf' | 'text' | 'docx' | 'both';
export interface LeaseGenerationResult {
    success: boolean;
    content?: string;
    downloadUrl?: string;
    error?: string;
}
export interface LeaseGeneratorUsage {
    id: string;
    email: string;
    ipAddress: string;
    userAgent: string;
    usageCount: number;
    lastUsedAt: string;
    createdAt: string;
}
//# sourceMappingURL=lease-generator.d.ts.map