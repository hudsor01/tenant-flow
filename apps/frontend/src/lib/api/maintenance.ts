/**
 * Maintenance API
 * Handles maintenance request CRUD operations
 */
import { api } from './endpoints';
import type {
  MaintenanceRequest,
  CreateMaintenanceInput,
  UpdateMaintenanceInput,
  MaintenanceQuery,
} from '@repo/shared';

export class MaintenanceApi {
  /**
   * Get all maintenance requests for the current user
   */
  static async getMaintenanceRequests(params?: MaintenanceQuery): Promise<MaintenanceRequest[]> {
    const response = await api.maintenance.list(params);
    return (response.data as { data?: MaintenanceRequest[] }).data || response.data as MaintenanceRequest[];
  }

  /**
   * Get a specific maintenance request by ID
   */
  static async getMaintenanceRequest(id: string): Promise<MaintenanceRequest> {
    const response = await api.maintenance.get(id);
    return response.data as MaintenanceRequest;
  }

  /**
   * Create a new maintenance request
   */
  static async createMaintenanceRequest(data: CreateMaintenanceInput): Promise<MaintenanceRequest> {
    const response = await api.maintenance.create(data);
    return response.data as MaintenanceRequest;
  }

  /**
   * Update an existing maintenance request
   */
  static async updateMaintenanceRequest(id: string, data: UpdateMaintenanceInput): Promise<MaintenanceRequest> {
    const response = await api.maintenance.update(id, data);
    return response.data as MaintenanceRequest;
  }

  /**
   * Delete a maintenance request
   */
  static async deleteMaintenanceRequest(id: string): Promise<{ message: string }> {
    const response = await api.maintenance.delete(id);
    return response.data as { message: string };
  }

  /**
   * Update maintenance request status
   */
  static async updateStatus(id: string, status: string): Promise<MaintenanceRequest> {
    const response = await api.maintenance.updateStatus(id, status);
    return response.data as MaintenanceRequest;
  }

  /**
   * Assign vendor to maintenance request
   */
  static async assignVendor(id: string, vendorId: string): Promise<MaintenanceRequest> {
    const response = await api.maintenance.assignVendor(id, vendorId);
    return response.data as MaintenanceRequest;
  }

  /**
   * Add comment to maintenance request
   */
  static async addComment(id: string, comment: string): Promise<{ message: string }> {
    const response = await api.maintenance.addComment(id, comment);
    return response.data as { message: string };
  }

  /**
   * Upload image to maintenance request
   */
  static async uploadImage(id: string, file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await api.maintenance.uploadImage(id, formData);
    return response.data as { url: string };
  }
}