/**
 * Tenants API
 * Handles tenant CRUD operations with NestJS backend
 */
import { api } from './endpoints';
import type {
  Tenant,
  CreateTenantInput,
  UpdateTenantInput,
  TenantQuery,
  Lease,
  MaintenanceRequest,
  Document
} from '@repo/shared';

export class TenantsApi {
  /**
   * Get all tenants for the current user
   */
  static async getTenants(params?: TenantQuery): Promise<Tenant[]> {
    const response = await api.tenants.list(params);
    return (response.data as { data?: Tenant[] }).data || response.data;
  }

  /**
   * Get tenant statistics
   */
  static async getTenantStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    pendingApplications: number;
  }> {
    const response = await api.tenants.stats();
    return response.data as {
      total: number;
      active: number;
      inactive: number;
      pendingApplications: number;
    };
  }

  /**
   * Get a specific tenant by ID
   */
  static async getTenant(id: string): Promise<Tenant> {
    const response = await api.tenants.get(id);
    return response.data as Tenant;
  }

  /**
   * Create a new tenant
   */
  static async createTenant(data: CreateTenantInput): Promise<Tenant> {
    const response = await api.tenants.create(data);
    return response.data as Tenant;
  }

  /**
   * Update an existing tenant
   */
  static async updateTenant(id: string, data: UpdateTenantInput): Promise<Tenant> {
    const response = await api.tenants.update(id, data);
    return response.data as Tenant;
  }

  /**
   * Delete a tenant
   */
  static async deleteTenant(id: string): Promise<{ message: string }> {
    const response = await api.tenants.delete(id);
    return response.data as { message: string };
  }

  /**
   * Upload tenant document
   */
  static async uploadDocument(id: string, file: File, documentType: string): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('type', documentType);
    
    const response = await api.tenants.uploadDocument(id, formData);
    return response.data;
  }

  /**
   * Get tenant leases
   */
  static async getTenantLeases(tenantId: string): Promise<Lease[]> {
    const response = await api.tenants.getLeases(tenantId);
    return response.data as Lease[];
  }

  /**
   * Get tenant payments
   */
  static async getTenantPayments(tenantId: string): Promise<{ id: string; amount: number; date: string; status: string }[]> {
    const response = await api.tenants.getPayments(tenantId);
    return response.data;
  }

  /**
   * Get tenant maintenance requests
   */
  static async getTenantMaintenance(tenantId: string): Promise<MaintenanceRequest[]> {
    const response = await api.tenants.getMaintenance(tenantId);
    return response.data as MaintenanceRequest[];
  }

  /**
   * Get tenant documents
   */
  static async getTenantDocuments(tenantId: string): Promise<Document[]> {
    const response = await api.tenants.getDocuments(tenantId);
    return response.data as Document[];
  }

  /**
   * Invite tenant to portal
   */
  static async inviteTenant(id: string, email: string): Promise<{ message: string }> {
    const response = await api.tenants.inviteTenant(id, email);
    return response.data as { message: string };
  }
}