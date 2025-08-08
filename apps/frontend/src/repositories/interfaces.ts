/**
 * Repository Interfaces for Clean Architecture
 * 
 * These interfaces define contracts for data access, allowing services to remain
 * framework-agnostic and enabling easy testing through dependency injection.
 */

import type {
  Property,
  PropertyQuery,
  CreatePropertyInput,
  UpdatePropertyInput,
  Tenant,
  TenantQuery,
  Lease,
  LeaseQuery,
  MaintenanceRequest,
  Unit,
  UnitQuery,
  User
} from '@repo/shared';
import type { Result } from '@repo/shared';

// Local type definitions for missing types
export interface MaintenanceRequestQuery {
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
  status?: string;
  priority?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// Repository interfaces that don't require Entity constraint
export interface Repository<TEntity, TId = string> {
  findById(id: TId): Promise<TEntity | null>
  save(entity: TEntity): Promise<TEntity>
  delete(id: TId): Promise<void>
}

export interface QueryRepository<TEntity, TQuery = Record<string, unknown>> {
  findMany(query?: TQuery): Promise<TEntity[]>
  count(query?: TQuery): Promise<number>
}

// ========================
// Authentication Repository
// ========================

export interface AuthRepository {
  signIn(email: string, password: string): Promise<Result<AuthResult>>;
  signUp(userData: SignUpData): Promise<Result<AuthResult>>;
  signOut(): Promise<Result<void>>;
  resetPassword(email: string): Promise<Result<void>>;
  updatePassword(password: string): Promise<Result<void>>;
  getCurrentUser(): Promise<Result<User | null>>;
  refreshToken(): Promise<Result<AuthResult>>;
}

export interface AuthResult {
  user: User;
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  companyName?: string;
}

// ========================
// Property Repository
// ========================

export interface PropertyRepository extends Repository<Property>, QueryRepository<Property, PropertyQuery> {
  findByOwner(ownerId: string): Promise<Property[]>;
  findWithUnits(id: string): Promise<Property | null>;
  findWithTenants(id: string): Promise<Property | null>;
  findWithLeases(id: string): Promise<Property | null>;
  findWithMaintenance(id: string): Promise<Property | null>;
  getStats(ownerId: string): Promise<PropertyStats>;
  uploadImage(id: string, imageFile: File): Promise<Result<{ url: string }>>;
  create(input: CreatePropertyInput): Promise<Result<Property>>;
  update(id: string, input: UpdatePropertyInput): Promise<Result<Property>>;
}

export interface PropertyStats {
  total: number;
  occupied: number;
  vacant: number;
  occupancyRate: number;
  totalMonthlyRent: number;
  averageRent: number;
}

// ========================
// Tenant Repository
// ========================

export interface TenantRepository extends Repository<Tenant>, QueryRepository<Tenant, TenantQuery> {
  findByProperty(propertyId: string): Promise<Tenant[]>;
  findByEmail(email: string): Promise<Tenant | null>;
  findWithActiveLeases(id: string): Promise<Tenant | null>;
  findExpiringSoonTenants(days: number): Promise<Tenant[]>;
}

// ========================
// Lease Repository
// ========================

export interface LeaseRepository extends Repository<Lease>, QueryRepository<Lease, LeaseQuery> {
  findByProperty(propertyId: string): Promise<Lease[]>;
  findByTenant(tenantId: string): Promise<Lease[]>;
  findExpiring(days: number): Promise<Lease[]>;
  findActive(): Promise<Lease[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<Lease[]>;
}

// ========================
// Maintenance Repository
// ========================

export interface MaintenanceRepository extends Repository<MaintenanceRequest>, QueryRepository<MaintenanceRequest, MaintenanceRequestQuery> {
  findByProperty(propertyId: string): Promise<MaintenanceRequest[]>;
  findByStatus(status: string): Promise<MaintenanceRequest[]>;
  findByPriority(priority: string): Promise<MaintenanceRequest[]>;
  findOverdue(): Promise<MaintenanceRequest[]>;
  updateStatus(id: string, status: string, notes?: string): Promise<Result<MaintenanceRequest>>;
}

// ========================
// Unit Repository
// ========================

export interface UnitRepository extends Repository<Unit>, QueryRepository<Unit, UnitQuery> {
  findByProperty(propertyId: string): Promise<Unit[]>;
  findVacant(propertyId?: string): Promise<Unit[]>;
  findOccupied(propertyId?: string): Promise<Unit[]>;
  findByStatus(status: string): Promise<Unit[]>;
}

// ========================
// Activity Repository
// ========================

export interface ActivityRepository extends QueryRepository<ActivityLog> {
  findByUser(userId: string, limit?: number): Promise<ActivityLog[]>;
  findByEntity(entityType: string, entityId: string, limit?: number): Promise<ActivityLog[]>;
  findRecent(limit?: number): Promise<ActivityLog[]>;
  logActivity(activity: CreateActivityInput): Promise<Result<ActivityLog>>;
}

export interface CreateActivityInput {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  metadata?: Record<string, unknown>;
}

// ========================
// Billing Repository
// ========================

export interface BillingRepository {
  getSubscription(userId: string): Promise<Result<Subscription | null>>;
  createCheckoutSession(priceId: string, userId: string): Promise<Result<CheckoutSession>>;
  updateSubscription(subscriptionId: string, priceId: string): Promise<Result<Subscription>>;
  cancelSubscription(subscriptionId: string): Promise<Result<void>>;
  getUsage(userId: string): Promise<Result<Usage>>;
  getBillingHistory(userId: string): Promise<Result<BillingHistory[]>>;
}

export interface Subscription {
  id: string;
  status: string;
  priceId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

export interface Usage {
  properties: number;
  tenants: number;
  units: number;
  storageUsed: number;
  limits: {
    properties: number;
    tenants: number;
    units: number;
    storageLimit: number;
  };
}

export interface BillingHistory {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: Date;
  description: string;
  invoiceUrl?: string;
}

// ========================
// File Repository
// ========================

export interface FileRepository {
  upload(file: File, path: string): Promise<Result<FileUploadResult>>;
  delete(path: string): Promise<Result<void>>;
  getSignedUrl(path: string, expiresIn?: number): Promise<Result<string>>;
  listFiles(path: string): Promise<Result<FileInfo[]>>;
}

export interface FileUploadResult {
  url: string;
  path: string;
  size: number;
  mimeType: string;
}

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  lastModified: Date;
  url: string;
}

// ========================
// Notification Repository
// ========================

export interface NotificationRepository {
  send(notification: SendNotificationInput): Promise<Result<void>>;
  sendBulk(notifications: SendNotificationInput[]): Promise<Result<void>>;
  getTemplate(templateId: string): Promise<Result<NotificationTemplate>>;
}

export interface SendNotificationInput {
  to: string;
  templateId: string;
  variables: Record<string, unknown>;
  channel: 'email' | 'sms' | 'push';
  priority?: 'low' | 'normal' | 'high';
}

export interface NotificationTemplate {
  id: string;
  name: string;
  subject?: string;
  content: string;
  variables: string[];
}