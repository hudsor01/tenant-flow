/**
 * Property Repository Implementation
 * 
 * Implements property data access using the API client.
 * Abstracts API-specific logic behind a clean repository interface.
 */

import { apiClient } from '@/lib/api-client';
import type { 
  Property, 
  CreatePropertyInput, 
  UpdatePropertyInput, 
  PropertyQuery,
  Result 
} from '@repo/shared';
import type { PropertyRepository, PropertyStats } from '../interfaces';
import { DomainError, NotFoundError } from '@repo/shared';

export class ApiPropertyRepository implements PropertyRepository {
  async findById(id: string): Promise<Property | null> {
    try {
      const response = await apiClient.get<Property>(`/properties/${id}`);
      
      if (!response.success) {
        return null;
      }

      return response.data;
    } catch (error) {
      console.error('Failed to find property by ID:', error);
      return null;
    }
  }

  async save(entity: Property): Promise<Property> {
    try {
      let response;
      
      if (entity.id) {
        // Update existing property
        response = await apiClient.put<Property>(`/properties/${entity.id}`, entity as unknown as Record<string, unknown>);
      } else {
        // Create new property
        response = await apiClient.post<Property>('/properties', entity as unknown as Record<string, unknown>);
      }

      if (!response.success) {
        throw new DomainError('Failed to save property');
      }

      return response.data;
    } catch (error) {
      throw error instanceof DomainError ? error : new DomainError('Failed to save property');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const response = await apiClient.delete(`/properties/${id}`);
      
      if (!response.success) {
        throw new DomainError('Failed to delete property');
      }
    } catch (error) {
      throw error instanceof DomainError ? error : new DomainError('Failed to delete property');
    }
  }

  async findMany(query?: PropertyQuery): Promise<Property[]> {
    try {
      const params = query ? new URLSearchParams(query as Record<string, string>) : undefined;
      const url = params ? `/properties?${params.toString()}` : '/properties';
      
      const response = await apiClient.get<Property[]>(url);
      
      if (!response.success) {
        throw new DomainError('Failed to fetch properties');
      }

      // Handle both direct array and wrapped response
      const data = response.data;
      return Array.isArray(data) ? data : (data as { data: Property[] }).data || [];
    } catch (error) {
      console.error('Failed to fetch properties:', error);
      return [];
    }
  }

  async count(query?: PropertyQuery): Promise<number> {
    try {
      const params = query ? new URLSearchParams(query as Record<string, string>) : undefined;
      const url = params ? `/properties/count?${params.toString()}` : '/properties/count';
      
      const response = await apiClient.get<{ count: number }>(url);
      
      if (!response.success) {
        return 0;
      }

      return response.data.count || 0;
    } catch (error) {
      console.error('Failed to count properties:', error);
      return 0;
    }
  }

  async findByOwner(ownerId: string): Promise<Property[]> {
    return this.findMany({ ownerId });
  }

  async findWithUnits(id: string): Promise<Property | null> {
    try {
      const response = await apiClient.get<Property>(`/properties/${id}/units`);
      
      if (!response.success) {
        return null;
      }

      return response.data;
    } catch (error) {
      console.error('Failed to find property with units:', error);
      return null;
    }
  }

  async findWithTenants(id: string): Promise<Property | null> {
    try {
      const response = await apiClient.get<Property>(`/properties/${id}/tenants`);
      
      if (!response.success) {
        return null;
      }

      return response.data;
    } catch (error) {
      console.error('Failed to find property with tenants:', error);
      return null;
    }
  }

  async findWithLeases(id: string): Promise<Property | null> {
    try {
      const response = await apiClient.get<Property>(`/properties/${id}/leases`);
      
      if (!response.success) {
        return null;
      }

      return response.data;
    } catch (error) {
      console.error('Failed to find property with leases:', error);
      return null;
    }
  }

  async findWithMaintenance(id: string): Promise<Property | null> {
    try {
      const response = await apiClient.get<Property>(`/properties/${id}/maintenance`);
      
      if (!response.success) {
        return null;
      }

      return response.data;
    } catch (error) {
      console.error('Failed to find property with maintenance:', error);
      return null;
    }
  }

  async getStats(ownerId: string): Promise<PropertyStats> {
    try {
      const response = await apiClient.get<PropertyStats>(`/properties/stats?ownerId=${ownerId}`);
      
      if (!response.success) {
        throw new DomainError('Failed to fetch property statistics');
      }

      return response.data;
    } catch {
      // Return default stats on error
      return {
        total: 0,
        occupied: 0,
        vacant: 0,
        occupancyRate: 0,
        totalMonthlyRent: 0,
        averageRent: 0,
      };
    }
  }

  async uploadImage(id: string, imageFile: File): Promise<Result<{ url: string }>> {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      
      const response = await apiClient.post<{ url: string }>(`/properties/${id}/images`, formData);
      
      if (!response.success) {
        return {
          success: false,
          error: new DomainError('Failed to upload property image'),
        };
      }

      return {
        success: true,
        value: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new DomainError('Failed to upload property image'),
      };
    }
  }

  // Additional helper methods for business logic
  async create(input: CreatePropertyInput): Promise<Result<Property>> {
    try {
      const response = await apiClient.post<Property>('/properties', input);
      
      if (!response.success) {
        return {
          success: false,
          error: new DomainError('Failed to create property'),
        };
      }

      return {
        success: true,
        value: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new DomainError('Failed to create property'),
      };
    }
  }

  async update(id: string, input: UpdatePropertyInput): Promise<Result<Property>> {
    try {
      const response = await apiClient.put<Property>(`/properties/${id}`, input);
      
      if (!response.success) {
        return {
          success: false,
          error: new DomainError('Failed to update property'),
        };
      }

      return {
        success: true,
        value: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new DomainError('Failed to update property'),
      };
    }
  }

  async findByIdWithResult(id: string): Promise<Result<Property>> {
    try {
      const property = await this.findById(id);
      
      if (!property) {
        return {
          success: false,
          error: new NotFoundError('Property', id),
        };
      }

      return {
        success: true,
        value: property,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new DomainError('Failed to find property'),
      };
    }
  }
}