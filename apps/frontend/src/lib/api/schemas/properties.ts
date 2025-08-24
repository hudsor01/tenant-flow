import { z } from 'zod'

export const UnitSchema = z.object({
  id: z.string(),
  unitNumber: z.string(),
  propertyId: z.string(),
  bedrooms: z.number(),
  bathrooms: z.number(),
  squareFeet: z.union([z.number(), z.null()]),
  monthlyRent: z.number().optional(),
  status: z.string(),
  lastInspectionDate: z.union([z.string(), z.null()]).optional(),
  createdAt: z.string().transform(s => new Date(s)),
  updatedAt: z.string().transform(s => new Date(s))
})

export const UnitArraySchema = z.array(UnitSchema)

export const PropertySchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  description: z.union([z.string(), z.null()]).optional(),
  imageUrl: z.union([z.string(), z.null()]).optional(),
  ownerId: z.string(),
  propertyType: z.string(),
  yearBuilt: z.union([z.number(), z.null()]).optional(),
  totalSize: z.union([z.number(), z.null()]).optional(),
  createdAt: z.string().transform(s => new Date(s)),
  updatedAt: z.string().transform(s => new Date(s)),
  units: z.array(UnitSchema).optional()
})

export const PropertyArraySchema = z.array(PropertySchema)

export const CreatePropertyInputSchema = z.object({
  name: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  propertyType: z.string(),
  yearBuilt: z.number().optional(),
  totalSize: z.number().optional()
})

export const UpdatePropertyInputSchema = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  propertyType: z.string().optional(),
  yearBuilt: z.number().optional(),
  totalSize: z.number().optional()
})

export type Property = z.infer<typeof PropertySchema>
export type Unit = z.infer<typeof UnitSchema>
