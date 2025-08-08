/**
 * Property Management Service
 * 
 * Encapsulates property management business logic, including validation,
 * business rules, and coordination between multiple repositories.
 */

import type { 
  Property, 
  CreatePropertyInput, 
  UpdatePropertyInput,
  Unit,
  Result,
  BusinessRule
} from '@repo/shared';
import type { 
  PropertyRepository,
  UnitRepository,
  PropertyStats
} from '@/repositories/interfaces';
import { Money, DomainError, ValidationError } from '@repo/shared';

export interface PropertyManagementService {
  getProperty(id: string): Promise<Result<Property>>;
  getAllProperties(ownerId: string): Promise<Result<Property[]>>;
  createProperty(input: CreatePropertyInput, ownerId: string): Promise<Result<Property>>;
  updateProperty(id: string, input: UpdatePropertyInput): Promise<Result<Property>>;
  deleteProperty(id: string): Promise<Result<void>>;
  getPropertyStats(ownerId: string): Promise<Result<PropertyStats>>;
  uploadPropertyImage(id: string, imageFile: File): Promise<Result<{ url: string }>>;
  getPropertyUnits(propertyId: string): Promise<Result<Unit[]>>;
  calculateOccupancyRate(propertyId: string): Promise<Result<number>>;
  validatePropertyData(input: CreatePropertyInput | UpdatePropertyInput): Result<void>;
}

interface PropertyBusinessRules {
  maxUnitsPerProperty: number;
  minRentAmount: number;
  maxPropertyNameLength: number;
  requiredFields: (keyof CreatePropertyInput)[];
  allowedImageTypes: string[];
  maxImageSize: number;
}

export class DefaultPropertyManagementService implements PropertyManagementService {
  private readonly businessRules: PropertyBusinessRules = {
    maxUnitsPerProperty: 500,
    minRentAmount: 0,
    maxPropertyNameLength: 200,
    requiredFields: ['name', 'address'],
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxImageSize: 5 * 1024 * 1024, // 5MB
  };

  constructor(
    private readonly propertyRepository: PropertyRepository,
    private readonly unitRepository?: UnitRepository
  ) {}

  async getProperty(id: string): Promise<Result<Property>> {
    if (!id?.trim()) {
      return {
        success: false,
        error: new ValidationError('Property ID is required'),
      };
    }

    try {
      const property = await this.propertyRepository.findById(id);
      if (!property) {
        return {
          success: false,
          error: new DomainError(`Property with ID ${id} not found`),
        };
      }
      return {
        success: true,
        value: property,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new DomainError('Failed to fetch property'),
      };
    }
  }

  async getAllProperties(ownerId: string): Promise<Result<Property[]>> {
    if (!ownerId?.trim()) {
      return {
        success: false,
        error: new ValidationError('Owner ID is required'),
      };
    }

    try {
      const properties = await this.propertyRepository.findByOwner(ownerId);
      return {
        success: true,
        value: properties,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new DomainError('Failed to fetch properties'),
      };
    }
  }

  async createProperty(input: CreatePropertyInput, ownerId: string): Promise<Result<Property>> {
    // Validate input
    const validation = this.validatePropertyData(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Apply business rules
    const businessRuleCheck = this.checkBusinessRules(input);
    if (!businessRuleCheck.success) {
      return {
        success: false,
        error: businessRuleCheck.error,
      };
    }

    // Enhance input with derived data
    const enhancedInput: CreatePropertyInput = {
      ...input,
      ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.propertyRepository.create(enhancedInput);
  }

  async updateProperty(id: string, input: UpdatePropertyInput): Promise<Result<Property>> {
    if (!id?.trim()) {
      return {
        success: false,
        error: new ValidationError('Property ID is required'),
      };
    }

    // Validate input
    const validation = this.validatePropertyData(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Check if property exists
    const existingProperty = await this.getProperty(id);
    if (!existingProperty.success) {
      return existingProperty;
    }

    // Apply business rules
    const businessRuleCheck = this.checkBusinessRules(input);
    if (!businessRuleCheck.success) {
      return {
        success: false,
        error: businessRuleCheck.error,
      };
    }

    // Enhance input with metadata
    const enhancedInput: UpdatePropertyInput = {
      ...input,
      updatedAt: new Date(),
    };

    return this.propertyRepository.update(id, enhancedInput);
  }

  async deleteProperty(id: string): Promise<Result<void>> {
    if (!id?.trim()) {
      return {
        success: false,
        error: new ValidationError('Property ID is required'),
      };
    }

    // Check if property exists
    const existingProperty = await this.getProperty(id);
    if (!existingProperty.success) {
      return {
        success: false,
        error: existingProperty.error,
      };
    }

    // Business rule: Cannot delete property with active leases
    const canDeleteCheck = await this.canDeleteProperty(id);
    if (!canDeleteCheck.success) {
      return canDeleteCheck;
    }

    try {
      await this.propertyRepository.delete(id);
      return {
        success: true,
        value: undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new DomainError('Failed to delete property'),
      };
    }
  }

  async getPropertyStats(ownerId: string): Promise<Result<PropertyStats>> {
    if (!ownerId?.trim()) {
      return {
        success: false,
        error: new ValidationError('Owner ID is required'),
      };
    }

    try {
      const stats = await this.propertyRepository.getStats(ownerId);
      
      // Add business logic to enhance stats
      const enhancedStats = this.enhancePropertyStats(stats);
      
      return {
        success: true,
        value: enhancedStats,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new DomainError('Failed to fetch property statistics'),
      };
    }
  }

  async uploadPropertyImage(id: string, imageFile: File): Promise<Result<{ url: string }>> {
    // Validate property exists
    const propertyCheck = await this.getProperty(id);
    if (!propertyCheck.success) {
      return {
        success: false,
        error: propertyCheck.error,
      };
    }

    // Validate image file
    const imageValidation = this.validateImageFile(imageFile);
    if (!imageValidation.success) {
      return {
        success: false,
        error: imageValidation.error,
      };
    }

    return this.propertyRepository.uploadImage(id, imageFile);
  }

  async getPropertyUnits(propertyId: string): Promise<Result<Unit[]>> {
    if (!this.unitRepository) {
      return {
        success: false,
        error: new DomainError('Unit repository not available'),
      };
    }

    if (!propertyId?.trim()) {
      return {
        success: false,
        error: new ValidationError('Property ID is required'),
      };
    }

    try {
      const units = await this.unitRepository.findByProperty(propertyId);
      return {
        success: true,
        value: units,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new DomainError('Failed to fetch property units'),
      };
    }
  }

  async calculateOccupancyRate(propertyId: string): Promise<Result<number>> {
    const unitsResult = await this.getPropertyUnits(propertyId);
    if (!unitsResult.success) {
      return unitsResult;
    }

    const units = unitsResult.value;
    if (units.length === 0) {
      return {
        success: true,
        value: 0,
      };
    }

    const occupiedUnits = units.filter(unit => unit.status === 'occupied').length;
    const occupancyRate = (occupiedUnits / units.length) * 100;

    return {
      success: true,
      value: Math.round(occupancyRate * 100) / 100, // Round to 2 decimal places
    };
  }

  validatePropertyData(input: CreatePropertyInput | UpdatePropertyInput): Result<void> {
    const errors: string[] = [];

    // Check required fields for creation
    if ('name' in input && input.name !== undefined) {
      if (!input.name?.trim()) {
        errors.push('Property name is required');
      } else if (input.name.length > this.businessRules.maxPropertyNameLength) {
        errors.push(`Property name cannot exceed ${this.businessRules.maxPropertyNameLength} characters`);
      }
    }

    // Validate address fields if provided
    if ('address' in input && input.address) {
      if (!input.address?.trim()) {
        errors.push('Address is required');
      }
    }
    
    if ('city' in input && input.city) {
      if (!input.city?.trim()) {
        errors.push('City is required');
      }
    }
    
    if ('state' in input && input.state) {
      if (!input.state?.trim()) {
        errors.push('State is required');
      }
    }
    
    if ('zipCode' in input && input.zipCode) {
      if (!input.zipCode?.trim()) {
        errors.push('ZIP code is required');
      }
    }

    // Validate rent amount if provided
    if ('baseRent' in input && input.baseRent !== undefined && input.baseRent !== null) {
      const baseRent = Number(input.baseRent);
      if (isNaN(baseRent)) {
        errors.push('Base rent must be a valid number');
      } else if (baseRent < this.businessRules.minRentAmount) {
        errors.push(`Base rent must be at least ${this.businessRules.minRentAmount}`);
      } else {
        try {
          new Money(baseRent);
        } catch {
          errors.push('Invalid rent amount');
        }
      }
    }

    // Validate unit count if provided
    if ('totalUnits' in input && input.totalUnits !== undefined && input.totalUnits !== null) {
      const totalUnits = Number(input.totalUnits);
      if (isNaN(totalUnits)) {
        errors.push('Total units must be a valid number');
      } else if (totalUnits < 1) {
        errors.push('Total units must be at least 1');
      } else if (totalUnits > this.businessRules.maxUnitsPerProperty) {
        errors.push(`Cannot exceed ${this.businessRules.maxUnitsPerProperty} units per property`);
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: new ValidationError(errors.join('; ')),
      };
    }

    return { success: true, value: undefined };
  }

  // Private helper methods

  private checkBusinessRules(_input: CreatePropertyInput | UpdatePropertyInput): Result<void> {
    const rules: BusinessRule[] = [];

    // Add specific business rules here
    // For example: Property name uniqueness, location restrictions, etc.

    const brokenRules = rules.filter(rule => rule.isBroken());
    if (brokenRules.length > 0) {
      return {
        success: false,
        error: new DomainError(brokenRules.map(rule => rule.message).join('; ')),
      };
    }

    return { success: true, value: undefined };
  }

  private async canDeleteProperty(id: string): Promise<Result<void>> {
    // Check for active leases through property relationships
    try {
      const propertyWithLeases = await this.propertyRepository.findWithLeases(id);
      
      // Type assertion to handle the extended property with leases
      const extendedProperty = propertyWithLeases as Property & { leases?: Array<{ status: string }> };
      
      if (extendedProperty?.leases && extendedProperty.leases.length > 0) {
        const activeLeases = extendedProperty.leases.filter((lease: { status: string }) => 
          lease.status === 'active' || lease.status === 'pending'
        );
        
        if (activeLeases.length > 0) {
          return {
            success: false,
            error: new DomainError('Cannot delete property with active leases. Please terminate all leases first.'),
          };
        }
      }

      return { success: true, value: undefined };
    } catch {
      // If we can't check, err on the side of caution
      return {
        success: false,
        error: new DomainError('Unable to verify property deletion eligibility'),
      };
    }
  }

  private enhancePropertyStats(stats: PropertyStats): PropertyStats {
    return {
      ...stats,
      occupancyRate: Math.round(stats.occupancyRate * 100) / 100, // Round to 2 decimals
      averageRent: Math.round(stats.averageRent * 100) / 100, // Round to 2 decimals
    };
  }

  private validateImageFile(file: File): Result<void> {
    const errors: string[] = [];

    if (!file) {
      errors.push('Image file is required');
      return {
        success: false,
        error: new ValidationError(errors.join('; ')),
      };
    }

    if (!this.businessRules.allowedImageTypes.includes(file.type)) {
      errors.push(`Image must be one of: ${this.businessRules.allowedImageTypes.join(', ')}`);
    }

    if (file.size > this.businessRules.maxImageSize) {
      errors.push(`Image size cannot exceed ${this.businessRules.maxImageSize / (1024 * 1024)}MB`);
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: new ValidationError(errors.join('; ')),
      };
    }

    return { success: true, value: undefined };
  }
}