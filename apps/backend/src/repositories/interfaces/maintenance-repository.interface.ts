import type {
  MaintenanceRequest,
  MaintenanceRequestInput,
  MaintenanceRequestUpdate,
  MaintenanceStats,
  QueryParams,
  Database
} from '@repo/shared';

/**
 * Maintenance query options - extends standard QueryParams with maintenance-specific filters
 */
export interface MaintenanceQueryOptions extends QueryParams {
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
  status?: string;
  priority?: Database['public']['Enums']['Priority'];
  category?: Database['public']['Enums']['MaintenanceCategory'];
  assignedTo?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Maintenance repository interface
 * Defines all data access operations for Maintenance functionality
 */
export interface IMaintenanceRepository {
  /**
   * Find all maintenance requests for a user with optional filtering
   */
  findByUserIdWithSearch(userId: string, options: MaintenanceQueryOptions): Promise<MaintenanceRequest[]>;

  /**
   * Find maintenance request by ID
   */
  findById(requestId: string): Promise<MaintenanceRequest | null>;

  /**
   * Find maintenance requests by property ID
   */
  findByPropertyId(propertyId: string): Promise<MaintenanceRequest[]>;

  /**
   * Find maintenance requests by unit ID
   */
  findByUnitId(unitId: string): Promise<MaintenanceRequest[]>;

  /**
   * Find maintenance requests by tenant ID
   */
  findByTenantId(tenantId: string): Promise<MaintenanceRequest[]>;

  /**
   * Create new maintenance request
   */
  create(userId: string, requestData: MaintenanceRequestInput): Promise<MaintenanceRequest>;

  /**
   * Update maintenance request
   */
  update(requestId: string, requestData: MaintenanceRequestUpdate): Promise<MaintenanceRequest | null>;

  /**
   * Soft delete maintenance request
   */
  softDelete(userId: string, requestId: string): Promise<{ success: boolean; message: string }>;

  /**
   * Get maintenance statistics for dashboard
   */
  getStats(userId: string): Promise<MaintenanceStats>;

  /**
   * Get maintenance analytics for a specific property
   */
  getAnalytics(userId: string, options: { propertyId?: string; timeframe: string }): Promise<MaintenanceRequest[]>;

  /**
   * Get overdue maintenance requests
   */
  getOverdueRequests(userId: string): Promise<MaintenanceRequest[]>;

  /**
   * Get high priority maintenance requests
   */
  getHighPriorityRequests(userId: string): Promise<MaintenanceRequest[]>;

  /**
   * Assign maintenance request to contractor/staff
   */
  assignRequest(requestId: string, assignedTo: string, assignedBy: string): Promise<MaintenanceRequest | null>;

  /**
   * Update maintenance request status
   */
  updateStatus(requestId: string, status: string, updatedBy: string, notes?: string): Promise<MaintenanceRequest | null>;

  /**
   * Add work log entry to maintenance request
   */
  addWorkLog(requestId: string, workLog: {
    description: string;
    hoursWorked?: number;
    cost?: number;
    materials?: string;
    completedBy: string;
  }): Promise<MaintenanceRequest | null>;

  /**
   * Get maintenance cost analytics
   */
  getCostAnalytics(userId: string, options: { propertyId?: string; period: string }): Promise<MaintenanceRequest[]>;

  /**
   * Get contractor performance metrics
   */
  getContractorPerformance(userId: string, contractorId?: string): Promise<MaintenanceRequest[]>;
}