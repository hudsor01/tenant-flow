/**
 * Form validation schemas using Zod with security enhancements
 * Integrated with security input sanitization system
 */
import { z } from 'zod';
import { sanitizeText, validateAndSanitizeInput } from '../security/input-sanitization';

// Property validation schema
export const propertySchema = z.object({
  name: z.string().min(1, 'Property name is required').max(100),
  address: z.string().min(1, 'Address is required').max(200),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(2, 'State is required').max(2),
  zipCode: z.string().min(5, 'ZIP code is required').max(10),
  propertyType: z.enum(['SINGLE_FAMILY', 'APARTMENT', 'CONDO', 'TOWNHOUSE', 'OTHER']),
  description: z.string().optional(),
});

// Tenant validation schema
export const tenantSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Phone number is required'),
  dateOfBirth: z.date().optional(),
  emergencyContact: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
  }).optional(),
});

// Lease validation schema
export const leaseSchema = z.object({
  tenantId: z.string().uuid('Valid tenant ID is required'),
  propertyId: z.string().uuid('Valid property ID is required'),
  unitId: z.string().uuid().optional(),
  startDate: z.date(),
  endDate: z.date(),
  monthlyRent: z.number().positive('Monthly rent must be positive'),
  securityDeposit: z.number().nonnegative('Security deposit cannot be negative'),
  leaseTerms: z.string().optional(),
});

// Common field validation schemas to reduce duplication across the codebase
export const commonValidations = {
  // Basic text fields
  requiredString: (fieldName: string) =>
    z.string().min(1, `${fieldName} is required`),

  optionalString: z.string().optional(),

  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .transform(val => sanitizeText(val))
    .refine(val => {
      const validation = validateAndSanitizeInput(val, { type: 'text', strict: true });
      return validation.valid;
    }, 'Name contains invalid characters'),

  title: z
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title must be less than 100 characters'),

  description: z
    .string()
    .min(10, 'Please provide a detailed description')
    .max(1000, 'Description must be less than 1000 characters')
    .transform(val => sanitizeText(val))
    .refine(val => {
      const validation = validateAndSanitizeInput(val, { type: 'text', strict: true });
      return validation.valid;
    }, 'Description contains invalid or potentially dangerous content'),

  // Contact information
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .transform(val => val.toLowerCase().trim())
    .refine(val => {
      const validation = validateAndSanitizeInput(val, { type: 'email', strict: true });
      return validation.valid;
    }, 'Email contains invalid characters'),

  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^\+?[\d\s\-()]+$/, 'Please enter a valid phone number'),

  // Address fields
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z
    .string()
    .min(1, 'ZIP code is required')
    .regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code'),

  // Numeric fields
  positiveNumber: z.number().min(0, 'Must be a positive number'),
  currency: z.number().min(0, 'Amount must be positive'),
  percentage: z
    .number()
    .min(0)
    .max(100, 'Percentage must be between 0 and 100'),

  // Property-specific fields
  propertyType: z.enum(['SINGLE_FAMILY', 'MULTI_FAMILY', 'APARTMENT', 'COMMERCIAL', 'OTHER']),
  unitNumber: z
    .string()
    .min(1, 'Unit number is required')
    .max(20, 'Unit number must be less than 20 characters'),
  bedrooms: z.number().min(0).max(10),
  bathrooms: z.number().min(0).max(10),
  squareFeet: z.number().min(100).max(10000).optional(),
  rent: z.number().min(0).max(100000),

  // Status enums
  unitStatus: z.enum(['VACANT', 'OCCUPIED', 'MAINTENANCE', 'UNAVAILABLE']),
  maintenancePriority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  maintenanceCategory: z.enum(['PLUMBING', 'ELECTRICAL', 'HVAC', 'APPLIANCE', 'GENERAL', 'EMERGENCY']),

  // Date fields
  date: z.date(),
  optionalDate: z.date().optional(),

  // File upload with security validation
  file: z.instanceof(File).optional().refine(async (file) => {
    if (!file) return true;
    const { validateFile } = await import('../security/file-upload-security');
    const result = await validateFile(file, 'documents');
    return result.valid;
  }, 'File failed security validation')
};

// Common schema patterns for forms
export const createFormSchema = <T extends z.ZodRawShape>(shape: T) =>
  z.object(shape);

// Property form schema
export const propertyFormSchema = createFormSchema({
  name: commonValidations.name,
  description: commonValidations.description,
  address: commonValidations.address,
  city: commonValidations.city,
  state: commonValidations.state,
  zipCode: commonValidations.zipCode,
  propertyType: commonValidations.propertyType,
  numberOfUnits: commonValidations.positiveNumber
});

// Unit form schema
export const unitFormSchema = createFormSchema({
  unitNumber: commonValidations.unitNumber,
  propertyId: commonValidations.requiredString('Property ID'),
  bedrooms: commonValidations.bedrooms,
  bathrooms: commonValidations.bathrooms,
  squareFeet: commonValidations.squareFeet,
  rent: commonValidations.rent,
  status: commonValidations.unitStatus
});

// Maintenance request schema
export const maintenanceRequestSchema = createFormSchema({
  unitId: commonValidations.requiredString('Unit'),
  title: commonValidations.title,
  description: commonValidations.description,
  category: commonValidations.maintenanceCategory,
  priority: commonValidations.maintenancePriority
});

// Tenant form schema
export const tenantFormSchema = createFormSchema({
  name: commonValidations.name,
  email: commonValidations.email,
  phone: commonValidations.phone,
  emergencyContactName: commonValidations.name,
  emergencyContactPhone: commonValidations.phone
});

// Payment form schema
export const paymentFormSchema = createFormSchema({
  amount: commonValidations.currency,
  dueDate: commonValidations.date,
  description: commonValidations.description
});

// Lease form schema
export const leaseFormSchema = createFormSchema({
  tenantId: commonValidations.requiredString('Tenant'),
  unitId: commonValidations.requiredString('Unit'),
  startDate: commonValidations.date,
  endDate: commonValidations.date,
  monthlyRent: commonValidations.currency,
  securityDeposit: commonValidations.currency,
  terms: commonValidations.description
});

// Auth schemas
export const loginSchema = createFormSchema({
  email: commonValidations.email,
  password: z.string().min(1, 'Password is required')
});

export const signupSchema = createFormSchema({
  email: commonValidations.email,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  firstName: commonValidations.name,
  lastName: commonValidations.name
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

// Profile update schema
export const profileUpdateSchema = createFormSchema({
  firstName: commonValidations.name,
  lastName: commonValidations.name,
  phone: commonValidations.phone.optional(),
  address: commonValidations.address.optional(),
  city: commonValidations.city.optional(),
  state: commonValidations.state.optional(),
  zipCode: commonValidations.zipCode.optional()
});

// Type exports for use in components
// Import from shared package to avoid duplication
export type { PropertyFormData, CreateTenantInput, UpdateTenantInput } from '@repo/shared';
export type UnitFormData = z.infer<typeof unitFormSchema>;
export type MaintenanceRequestData = z.infer<typeof maintenanceRequestSchema>;
export type TenantFormData = z.infer<typeof tenantFormSchema>;
export type PaymentFormData = z.infer<typeof paymentFormSchema>;
export type LeaseFormData = z.infer<typeof leaseFormSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type SignupData = z.infer<typeof signupSchema>;
export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;