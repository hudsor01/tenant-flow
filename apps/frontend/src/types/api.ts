/**
 * API types and interfaces
 * Shared types for API responses and requests
 */

// Base API Response
export interface ApiResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

// Query parameters for list endpoints
export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Property types
export interface Property {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  type?: 'SINGLE_FAMILY' | 'APARTMENT' | 'CONDO' | 'TOWNHOUSE' | 'OTHER';
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  rent?: number;
  deposit?: number;
  description?: string;
  images?: string[];
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePropertyDto {
  name: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  type?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  rent?: number;
  deposit?: number;
  description?: string;
}

export type UpdatePropertyDto = Partial<CreatePropertyDto>

export interface PropertyStats {
  total: number;
  active: number;
  inactive: number;
  maintenance: number;
  totalRent: number;
  averageRent: number;
}

// Tenant types
export interface Tenant {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  leaseStartDate?: string;
  leaseEndDate?: string;
  propertyId?: string;
  unitId?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantDto {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  propertyId?: string;
  unitId?: string;
}

export type UpdateTenantDto = Partial<CreateTenantDto>

// Lease types
export interface Lease {
  id: string;
  tenantId: string;
  propertyId: string;
  unitId?: string;
  startDate: string;
  endDate: string;
  rent: number;
  deposit: number;
  terms?: string;
  status?: 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaseDto {
  tenantId: string;
  propertyId: string;
  unitId?: string;
  startDate: string;
  endDate: string;
  rent: number;
  deposit: number;
  terms?: string;
}

export type UpdateLeaseDto = Partial<CreateLeaseDto>

// Maintenance types
export interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status?: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  propertyId: string;
  unitId?: string;
  tenantId?: string;
  assignedTo?: string;
  completedAt?: string;
  cost?: number;
  notes?: string;
  images?: string[];
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaintenanceRequestDto {
  title: string;
  description: string;
  priority?: string;
  propertyId: string;
  unitId?: string;
  tenantId?: string;
}

export interface UpdateMaintenanceRequestDto extends Partial<CreateMaintenanceRequestDto> {
  status?: string;
  assignedTo?: string;
  cost?: number;
  notes?: string;
}

// Unit types
export interface Unit {
  id: string;
  propertyId: string;
  unitNumber: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  rent?: number;
  deposit?: number;
  status?: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE';
  tenantId?: string;
  description?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUnitDto {
  propertyId: string;
  unitNumber: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  rent?: number;
  deposit?: number;
  description?: string;
}

export interface UpdateUnitDto extends Partial<CreateUnitDto> {
  status?: string;
  tenantId?: string;
}