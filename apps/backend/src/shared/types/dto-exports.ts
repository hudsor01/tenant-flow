// Property DTOs
export {
  CreatePropertyDto,
  UpdatePropertyDto,
  PropertyQueryDto
} from '../../properties/dto'

// Tenant DTOs  
export {
  TenantCreateDto,
  TenantUpdateDto,
  CreateTenantDto,
  UpdateTenantDto
} from '../../tenants/dto'

// Lease DTOs - temporarily inline to fix compilation
export interface CreateLeaseDto {
  unitId: string
  tenantId: string
  startDate: string
  endDate: string
  rentAmount: number
  securityDeposit: number
  status: string
  leaseTerms: string
}

export interface UpdateLeaseDto {
  startDate?: string
  endDate?: string
  rentAmount?: number
  securityDeposit?: number
  status?: string
  leaseTerms?: string
}

// Temporary exports for missing modules
export interface CreateUnitDto {
  name: string
  propertyId: string
}

export interface UpdateUnitDto {
  name?: string
  propertyId?: string
}

export interface UnitQueryDto {
  propertyId?: string
}

export interface UnitDto {
  id: string
  name: string
  propertyId: string
}

export interface CreateUserDto {
  email: string
  name: string
}

export interface UpdateUserProfileDto {
  name?: string
  phone?: string
}

export interface UserDto {
  id: string
  email: string
  name: string
}