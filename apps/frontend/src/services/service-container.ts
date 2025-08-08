/**
 * Service Container for Dependency Injection
 * 
 * Provides centralized service instantiation and dependency injection.
 * Enables clean separation of concerns and easy testing through mocking.
 */

import type { 
  AuthRepository,
  PropertyRepository,
  TenantRepository,
  LeaseRepository,
  MaintenanceRepository,
  UnitRepository,
  ActivityRepository,
  BillingRepository,
  FileRepository,
  NotificationRepository
} from '@/repositories/interfaces';

import type {
  AuthenticationService,
  PropertyManagementService,
  TenantManagementService
} from './index';

import { SupabaseAuthRepository } from '@/repositories/implementations/auth.repository';
import { ApiPropertyRepository } from '@/repositories/implementations/property.repository';

import { DefaultAuthenticationService } from './authentication.service';
import { DefaultPropertyManagementService } from './property-management.service';
import { DefaultTenantManagementService } from './tenant-management.service';

/**
 * Service Container Interface
 * Defines the contract for accessing all application services
 */
export interface ServiceContainer {
  // Core Services
  readonly authService: AuthenticationService;
  readonly propertyService: PropertyManagementService;
  readonly tenantService: TenantManagementService;
  
  // Future services
  // readonly leaseService: LeaseManagementService;
  // readonly maintenanceService: MaintenanceService;
  // readonly billingService: BillingService;
  // readonly notificationService: NotificationService;
}

/**
 * Default Service Container Implementation
 * 
 * Handles service instantiation with proper dependency injection.
 * Uses singleton pattern to ensure single instance per application.
 */
class DefaultServiceContainer implements ServiceContainer {
  private static instance: DefaultServiceContainer;
  
  // Repository instances
  private _authRepository?: AuthRepository;
  private _propertyRepository?: PropertyRepository;
  private _tenantRepository?: TenantRepository;
  private _leaseRepository?: LeaseRepository;
  private _maintenanceRepository?: MaintenanceRepository;
  private _unitRepository?: UnitRepository;
  private _activityRepository?: ActivityRepository;
  private _billingRepository?: BillingRepository;
  private _fileRepository?: FileRepository;
  private _notificationRepository?: NotificationRepository;
  
  // Service instances
  private _authService?: AuthenticationService;
  private _propertyService?: PropertyManagementService;
  private _tenantService?: TenantManagementService;

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): DefaultServiceContainer {
    if (!DefaultServiceContainer.instance) {
      DefaultServiceContainer.instance = new DefaultServiceContainer();
    }
    return DefaultServiceContainer.instance;
  }

  // Repository getters with lazy initialization
  private get authRepository(): AuthRepository {
    if (!this._authRepository) {
      this._authRepository = new SupabaseAuthRepository();
    }
    return this._authRepository;
  }

  private get propertyRepository(): PropertyRepository {
    if (!this._propertyRepository) {
      this._propertyRepository = new ApiPropertyRepository();
    }
    return this._propertyRepository;
  }

  private get tenantRepository(): TenantRepository {
    if (!this._tenantRepository) {
      // TODO: Implement ApiTenantRepository
      throw new Error('TenantRepository not implemented yet');
    }
    return this._tenantRepository;
  }

  private get leaseRepository(): LeaseRepository {
    if (!this._leaseRepository) {
      // TODO: Implement ApiLeaseRepository
      throw new Error('LeaseRepository not implemented yet');
    }
    return this._leaseRepository;
  }

  private get unitRepository(): UnitRepository {
    if (!this._unitRepository) {
      // TODO: Implement ApiUnitRepository
      throw new Error('UnitRepository not implemented yet');
    }
    return this._unitRepository;
  }

  // Service getters with lazy initialization
  public get authService(): AuthenticationService {
    if (!this._authService) {
      this._authService = new DefaultAuthenticationService(this.authRepository);
    }
    return this._authService;
  }

  public get propertyService(): PropertyManagementService {
    if (!this._propertyService) {
      try {
        this._propertyService = new DefaultPropertyManagementService(
          this.propertyRepository,
          this.unitRepository
        );
      } catch {
        // If unitRepository is not available, create service without it
        this._propertyService = new DefaultPropertyManagementService(
          this.propertyRepository
        );
      }
    }
    return this._propertyService;
  }

  public get tenantService(): TenantManagementService {
    if (!this._tenantService) {
      try {
        this._tenantService = new DefaultTenantManagementService(
          this.tenantRepository,
          this.leaseRepository
        );
      } catch {
        // If repositories are not available, throw error for now
        throw new Error('TenantManagementService dependencies not available');
      }
    }
    return this._tenantService;
  }

  // Testing support methods
  public setAuthRepository(repository: AuthRepository): void {
    this._authRepository = repository;
    this._authService = undefined; // Force recreation
  }

  public setPropertyRepository(repository: PropertyRepository): void {
    this._propertyRepository = repository;
    this._propertyService = undefined; // Force recreation
  }

  public setTenantRepository(repository: TenantRepository): void {
    this._tenantRepository = repository;
    this._tenantService = undefined; // Force recreation
  }

  // Clear all instances (useful for testing)
  public clearAll(): void {
    this._authRepository = undefined;
    this._propertyRepository = undefined;
    this._tenantRepository = undefined;
    this._leaseRepository = undefined;
    this._maintenanceRepository = undefined;
    this._unitRepository = undefined;
    this._activityRepository = undefined;
    this._billingRepository = undefined;
    this._fileRepository = undefined;
    this._notificationRepository = undefined;
    
    this._authService = undefined;
    this._propertyService = undefined;
    this._tenantService = undefined;
  }
}

/**
 * Service Container Factory
 * 
 * Provides different container configurations for different environments.
 */
export class ServiceContainerFactory {
  private static container: ServiceContainer;

  /**
   * Get the default service container
   */
  public static getContainer(): ServiceContainer {
    if (!ServiceContainerFactory.container) {
      ServiceContainerFactory.container = DefaultServiceContainer.getInstance();
    }
    return ServiceContainerFactory.container;
  }

  /**
   * Create a mock container for testing
   */
  public static createMockContainer(overrides: Partial<ServiceContainer> = {}): ServiceContainer {
    const defaultContainer = DefaultServiceContainer.getInstance();
    
    return {
      authService: overrides.authService || defaultContainer.authService,
      propertyService: overrides.propertyService || defaultContainer.propertyService,
      tenantService: overrides.tenantService || defaultContainer.tenantService,
    };
  }

  /**
   * Set a custom container (useful for testing)
   */
  public static setContainer(container: ServiceContainer): void {
    ServiceContainerFactory.container = container;
  }

  /**
   * Reset to default container
   */
  public static reset(): void {
    const defaultContainer = DefaultServiceContainer.getInstance();
    defaultContainer.clearAll();
    ServiceContainerFactory.container = defaultContainer;
  }
}

/**
 * Service locator hook for React components
 * 
 * Usage: const { authService, propertyService } = useServices()
 */
export function useServices(): ServiceContainer {
  return ServiceContainerFactory.getContainer();
}

/**
 * Individual service hooks for convenience
 */
export function useAuthService(): AuthenticationService {
  return ServiceContainerFactory.getContainer().authService;
}

export function usePropertyService(): PropertyManagementService {
  return ServiceContainerFactory.getContainer().propertyService;
}

export function useTenantService(): TenantManagementService {
  return ServiceContainerFactory.getContainer().tenantService;
}

// Export singleton instance for direct usage
export const services = ServiceContainerFactory.getContainer();