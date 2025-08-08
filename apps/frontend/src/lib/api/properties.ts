/**
 * Properties API
 * Handles property CRUD operations with NestJS backend
 */
import { api } from './endpoints';
import type {
  Property,
  CreatePropertyInput,
  UpdatePropertyInput,
  PropertyQuery,
  Unit,
  Tenant,
  Lease,
  MaintenanceRequest
} from '@repo/shared';

export class PropertiesApi {
  /**
   * Get all properties for the current user
   */
  static async getProperties(params?: PropertyQuery): Promise<Property[]> {
    const response = await api.properties.list(params);
    return (response.data as { data?: Property[] }).data || response.data;
  }

  /**
   * Get property statistics
   */
  static async getPropertyStats(): Promise<{
    total: number;
    occupied: number;
    vacant: number;
    occupancyRate: number;
    totalMonthlyRent: number;
    averageRent: number;
  }> {
    const response = await api.properties.stats();
    return response.data as {
      total: number;
      occupied: number;
      vacant: number;
      occupancyRate: number;
      totalMonthlyRent: number;
      averageRent: number;
    };
  }

  /**
   * Get a specific property by ID
   */
  static async getProperty(id: string): Promise<Property> {
    const response = await api.properties.get(id);
    return response.data;
  }

  /**
   * Create a new property
   */
  static async createProperty(data: CreatePropertyInput): Promise<Property> {
    const response = await api.properties.create(data);
    return response.data;
  }

  /**
   * Update an existing property
   */
  static async updateProperty(id: string, data: UpdatePropertyInput): Promise<Property> {
    const response = await api.properties.update(id, data);
    return response.data;
  }

  /**
   * Delete a property
   */
  static async deleteProperty(id: string): Promise<{ message: string }> {
    const response = await api.properties.delete(id);
    return response.data;
  }

  /**
   * Upload property image
   */
  static async uploadPropertyImage(id: string, file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await api.properties.uploadImage(id, formData);
    return response.data;
  }

  /**
   * Get property units
   */
  static async getPropertyUnits(propertyId: string): Promise<Unit[]> {
    const response = await api.properties.getUnits(propertyId);
    return response.data;
  }

  /**
   * Get property tenants
   */
  static async getPropertyTenants(propertyId: string): Promise<Tenant[]> {
    const response = await api.properties.getTenants(propertyId);
    return response.data;
  }

  /**
   * Get property leases
   */
  static async getPropertyLeases(propertyId: string): Promise<Lease[]> {
    const response = await api.properties.getLeases(propertyId);
    return response.data;
  }

  /**
   * Get property maintenance requests
   */
  static async getPropertyMaintenance(propertyId: string): Promise<MaintenanceRequest[]> {
    const response = await api.properties.getMaintenance(propertyId);
    return response.data;
  }
}