/**
 * Leases API
 * Handles lease CRUD operations with NestJS backend
 */
import { api } from './endpoints';
import type {
  Lease,
  CreateLeaseInput,
  UpdateLeaseInput,
  LeaseQuery
} from '@repo/shared';

export class LeasesApi {
  /**
   * Get all leases
   */
  static async getLeases(params?: LeaseQuery): Promise<Lease[]> {
    const response = await api.leases.list(params);
    return (response.data as { data?: Lease[] }).data || response.data as Lease[];
  }

  /**
   * Get a specific lease by ID
   */
  static async getLease(id: string): Promise<Lease> {
    const response = await api.leases.get(id);
    return response.data as Lease;
  }

  /**
   * Create a new lease
   */
  static async createLease(data: CreateLeaseInput): Promise<Lease> {
    const response = await api.leases.create(data);
    return response.data as Lease;
  }

  /**
   * Update an existing lease
   */
  static async updateLease(id: string, data: UpdateLeaseInput): Promise<Lease> {
    const response = await api.leases.update(id, data);
    return response.data as Lease;
  }

  /**
   * Delete a lease
   */
  static async deleteLease(id: string): Promise<{ message: string }> {
    const response = await api.leases.delete(id);
    return response.data as { message: string };
  }

  /**
   * Generate lease PDF
   */
  static async generatePDF(id: string): Promise<{ url: string }> {
    const response = await api.leases.generatePDF(id);
    return response.data as { url: string };
  }

  /**
   * Upload lease document
   */
  static async uploadDocument(id: string, file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('document', file);
    
    const response = await api.leases.uploadDocument(id, formData);
    return response.data as { url: string };
  }

  /**
   * Activate a lease
   */
  static async activateLease(id: string): Promise<Lease> {
    const response = await api.leases.activate(id);
    return response.data as Lease;
  }

  /**
   * Terminate a lease
   */
  static async terminateLease(id: string, reason: string): Promise<Lease> {
    const response = await api.leases.terminate(id, reason);
    return response.data as Lease;
  }

  /**
   * Renew a lease
   */
  static async renewLease(id: string, endDate: string, newRent?: number): Promise<Lease> {
    const response = await api.leases.renew(id, { endDate, newRent });
    return response.data as Lease;
  }
}