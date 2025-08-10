import { z } from 'zod';
export declare const leaseStatusEnum: z.ZodEnum<{
    ACTIVE: "ACTIVE";
    INACTIVE: "INACTIVE";
    EXPIRED: "EXPIRED";
    DRAFT: "DRAFT";
    TERMINATED: "TERMINATED";
}>;
export declare const leaseSchema: z.ZodObject<{
    propertyId: z.ZodString;
    unitId: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodNull]>;
    tenantId: z.ZodString;
    startDate: z.ZodString;
    endDate: z.ZodString;
    rentAmount: z.ZodNumber;
    securityDeposit: z.ZodDefault<z.ZodNumber>;
    status: z.ZodDefault<z.ZodEnum<{
        ACTIVE: "ACTIVE";
        INACTIVE: "INACTIVE";
        EXPIRED: "EXPIRED";
        DRAFT: "DRAFT";
        TERMINATED: "TERMINATED";
    }>>;
}, z.core.$strip>;
export type LeaseFormData = z.infer<typeof leaseSchema>;
//# sourceMappingURL=leases.d.ts.map