import type {
  Lease,
  LeaseInput,
  LeaseUpdate,
  LeaseStats,
  QueryParams,
  Database,
  RentPayment
} from '@repo/shared';

/**
 * Lease query options - extends standard QueryParams with lease-specific filters
 */
export interface LeaseQueryOptions extends QueryParams {
  propertyId?: string;
  tenantId?: string;
  status?: Database['public']['Enums']['LeaseStatus'];
  startDate?: Date;
  endDate?: Date;
}

/**
 * Leases repository interface
 * Defines all data access operations for Lease functionality
 */
export interface ILeasesRepository {
  /**
   * Find all leases for a user with optional filtering
   */
  findByUserIdWithSearch(userId: string, options: LeaseQueryOptions): Promise<Lease[]>;

  /**
   * Find lease by ID
   */
  findById(leaseId: string): Promise<Lease | null>;

  /**
   * Find leases by property ID
   */
  findByPropertyId(propertyId: string): Promise<Lease[]>;

  /**
   * Find leases by tenant ID
   */
  findByTenantId(tenantId: string): Promise<Lease[]>;

  /**
   * Create new lease
   */
  create(userId: string, leaseData: LeaseInput): Promise<Lease>;

  /**
   * Update lease
   */
  update(leaseId: string, leaseData: LeaseUpdate): Promise<Lease | null>;

  /**
   * Soft delete lease
   */
  softDelete(userId: string, leaseId: string): Promise<{ success: boolean; message: string }>;

  /**
   * Get lease statistics for dashboard
   */
  getStats(userId: string): Promise<LeaseStats>;

  /**
   * Get lease analytics for a specific property
   */
  getAnalytics(userId: string, options: { propertyId?: string; timeframe: string }): Promise<Lease[]>;

  /**
   * Get leases expiring soon (within specified days)
   */
  getExpiringSoon(userId: string, days: number): Promise<Lease[]>;

  /**
   * Get active leases for a property
   */
  getActiveLeases(propertyId: string): Promise<Lease[]>;

  /**
   * Renew lease (create new lease based on existing one)
   */
  renewLease(leaseId: string, renewalData: Partial<LeaseInput>): Promise<Lease>;

  /**
   * Terminate lease (update status and end date)
   */
  terminateLease(leaseId: string, terminationDate: Date, reason?: string): Promise<Lease | null>;

  /**
   * Get lease payment history
   */
  getPaymentHistory(leaseId: string): Promise<RentPayment[]>;
}