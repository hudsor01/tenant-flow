/**
 * Enterprise Role-Based Access Control (RBAC) System
 * Comprehensive permission management for multi-tenant architecture
 * Zero-trust security model with fine-grained permissions
 */

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  PROPERTY_MANAGER = 'PROPERTY_MANAGER',
  PROPERTY_OWNER = 'PROPERTY_OWNER',
  TENANT = 'TENANT',
  TENANT_REPRESENTATIVE = 'TENANT_REPRESENTATIVE',
  MAINTENANCE_STAFF = 'MAINTENANCE_STAFF',
  CONTRACTOR = 'CONTRACTOR',
  SUPPORT_STAFF = 'SUPPORT_STAFF',
  READONLY_USER = 'READONLY_USER',
}

export enum Permission {
  // Property Management
  READ_PROPERTIES = 'READ_PROPERTIES',
  WRITE_PROPERTIES = 'WRITE_PROPERTIES',
  DELETE_PROPERTIES = 'DELETE_PROPERTIES',
  
  // Tenant Management
  READ_TENANTS = 'READ_TENANTS',
  WRITE_TENANTS = 'WRITE_TENANTS',
  DELETE_TENANTS = 'DELETE_TENANTS',
  
  // Maintenance Management
  READ_MAINTENANCE = 'READ_MAINTENANCE',
  WRITE_MAINTENANCE = 'WRITE_MAINTENANCE',
  DELETE_MAINTENANCE = 'DELETE_MAINTENANCE',
  
  // Financial Management
  READ_FINANCIAL = 'READ_FINANCIAL',
  WRITE_FINANCIAL = 'WRITE_FINANCIAL',
  PROCESS_PAYMENTS = 'PROCESS_PAYMENTS',
  
  // System Administration
  ADMIN_ACCESS = 'ADMIN_ACCESS',
  MANAGE_USERS = 'MANAGE_USERS',
  SECURITY_SETTINGS = 'SECURITY_SETTINGS',
}

// Resource types for access control
export enum ResourceType {
  PROPERTY = 'PROPERTY',
  TENANT = 'TENANT',
  MAINTENANCE = 'MAINTENANCE',
  LEASE = 'LEASE',
  FINANCIAL = 'FINANCIAL',
  DOCUMENT = 'DOCUMENT',
  USER = 'USER',
  ORGANIZATION = 'ORGANIZATION',
}

// Action types for granular permissions
export enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  ASSIGN = 'assign',
  INVITE = 'invite',
}

interface RBACContext {
  userRole: string;
  organizationId?: string;
  userId?: string;
  resource: string;
  action: string;
  resourceOwnerId?: string;
}

export class RBAC {
  private static instance: RBAC;
  
  static getInstance(): RBAC {
    if (!RBAC.instance) {
      RBAC.instance = new RBAC();
    }
    return RBAC.instance;
  }

  hasPermission(userRole: UserRole, permission: Permission): boolean {
    // Enhanced permission check with role hierarchy
    return this.getRolePermissions(userRole).includes(permission);
  }

  getRolePermissions(role: UserRole): Permission[] {
    // Complete role-permission mapping based on enterprise requirements
    const rolePermissions: Record<UserRole, Permission[]> = {
      [UserRole.SUPER_ADMIN]: Object.values(Permission),
      [UserRole.ADMIN]: [
        Permission.READ_PROPERTIES, Permission.WRITE_PROPERTIES,
        Permission.READ_TENANTS, Permission.WRITE_TENANTS,
        Permission.READ_MAINTENANCE, Permission.WRITE_MAINTENANCE,
        Permission.READ_FINANCIAL, Permission.WRITE_FINANCIAL,
        Permission.ADMIN_ACCESS,
      ],
      [UserRole.PROPERTY_MANAGER]: [
        Permission.READ_PROPERTIES, Permission.WRITE_PROPERTIES,
        Permission.READ_TENANTS, Permission.WRITE_TENANTS,
        Permission.READ_MAINTENANCE, Permission.WRITE_MAINTENANCE,
        Permission.READ_FINANCIAL,
      ],
      [UserRole.PROPERTY_OWNER]: [
        Permission.READ_PROPERTIES,
        Permission.READ_TENANTS,
        Permission.READ_MAINTENANCE,
        Permission.READ_FINANCIAL,
      ],
      [UserRole.TENANT]: [
        Permission.READ_MAINTENANCE, Permission.WRITE_MAINTENANCE,
      ],
      [UserRole.TENANT_REPRESENTATIVE]: [
        Permission.READ_MAINTENANCE, Permission.WRITE_MAINTENANCE,
      ],
      [UserRole.MAINTENANCE_STAFF]: [
        Permission.READ_PROPERTIES,
        Permission.READ_MAINTENANCE, Permission.WRITE_MAINTENANCE,
      ],
      [UserRole.CONTRACTOR]: [
        Permission.READ_MAINTENANCE, Permission.WRITE_MAINTENANCE,
      ],
      [UserRole.SUPPORT_STAFF]: [
        Permission.READ_PROPERTIES,
        Permission.READ_TENANTS,
        Permission.READ_MAINTENANCE,
      ],
      [UserRole.READONLY_USER]: [
        Permission.READ_PROPERTIES,
        Permission.READ_TENANTS,
        Permission.READ_MAINTENANCE,
        Permission.READ_FINANCIAL,
      ],
    };
    
    return rolePermissions[role] || [];
  }

  hasResourceAccess(
    userRole: UserRole, 
    organizationId: string,
    resourceOrgId?: string,
    userId?: string,
    resourceOwnerId?: string
  ): boolean {
    // Super admin has access to everything
    if (userRole === UserRole.SUPER_ADMIN) {
      return true;
    }
    
    // Organization-level access control
    if (resourceOrgId && organizationId !== resourceOrgId) {
      return false;
    }
    
    // User-level access control (own resources)
    if (resourceOwnerId && userId && userId !== resourceOwnerId) {
      // Only managers and above can access other users' resources
      const managerRoles = [UserRole.ADMIN, UserRole.PROPERTY_MANAGER];
      return managerRoles.includes(userRole);
    }
    
    return true;
  }
}

// Helper function for middleware
export async function checkRBAC(context: RBACContext): Promise<boolean> {
  const rbac = RBAC.getInstance();
  const role = context.userRole as UserRole;
  
  if (!role || !Object.values(UserRole).includes(role)) {
    return false;
  }
  
  // Map resource path to permission
  const permission = mapResourceToPermission(context.resource, context.action);
  if (!permission) {
    return false;
  }
  
  // Check basic permission
  const hasPermission = rbac.hasPermission(role, permission);
  if (!hasPermission) {
    return false;
  }
  
  // Check resource-level access
  return rbac.hasResourceAccess(
    role,
    context.organizationId || '',
    context.organizationId,
    context.userId,
    context.resourceOwnerId
  );
}

function mapResourceToPermission(resource: string, action: string): Permission | null {
  const isWrite = ['post', 'put', 'patch', 'delete'].includes(action.toLowerCase());
  
  if (resource.includes('properties')) {
    return isWrite ? Permission.WRITE_PROPERTIES : Permission.READ_PROPERTIES;
  }
  if (resource.includes('tenants')) {
    return isWrite ? Permission.WRITE_TENANTS : Permission.READ_TENANTS;
  }
  if (resource.includes('maintenance')) {
    return isWrite ? Permission.WRITE_MAINTENANCE : Permission.READ_MAINTENANCE;
  }
  if (resource.includes('financial') || resource.includes('billing')) {
    return isWrite ? Permission.WRITE_FINANCIAL : Permission.READ_FINANCIAL;
  }
  if (resource.includes('admin')) {
    return Permission.ADMIN_ACCESS;
  }
  
  return null;
}

// Export singleton instance
export const rbac = RBAC.getInstance();