import { z } from "zod"

export const leaseSchema = z.object({
  id: z.number(),
  tenantName: z.string(),
  propertyName: z.string(),
  unitNumber: z.string(),
  rentAmount: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.enum(["DRAFT", "ACTIVE", "EXPIRED", "TERMINATED"]),
})

export type LeaseRow = z.infer<typeof leaseSchema>

