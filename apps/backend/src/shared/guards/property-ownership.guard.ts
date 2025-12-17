/**
 * Verifies user owns the property/lease/tenant being accessed
 * Checks ownership chain through the database
 */

import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import type { AuthenticatedRequest } from '../types/express-request.types'
import { SupabaseService } from '../../database/supabase.service'
import { AuthRequestCache } from '../services/auth-request-cache.service'
import { AppLogger } from '../../logger/app-logger.service'

@Injectable()
export class PropertyOwnershipGuard implements CanActivate {

  constructor(private readonly supabase: SupabaseService,
    private readonly authCache: AuthRequestCache, private readonly logger: AppLogger) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const user_id = request.user?.id

    if (!user_id) {
      this.logger.warn('PropertyOwnershipGuard: No user ID in request')
      throw new ForbiddenException('Authentication required')
    }

    // Extract resource IDs from request (controllers commonly expose them as `id` or nested objects)
    const normalized = {
      tenant_id:
        request.params?.tenant_id ??
        request.params?.id ??
        request.body?.tenant_id ??
        request.body?.id ??
        request.query?.tenant_id,
      lease_id:
        request.params?.lease_id ??
        request.params?.id ??
        request.body?.lease_id ??
        request.body?.id ??
        request.query?.lease_id ??
        request.body?.leaseData?.lease_id,
      property_id:
        request.params?.property_id ??
        request.body?.property_id ??
        request.query?.property_id ??
        request.body?.leaseData?.property_id
    }
    const { tenant_id, lease_id, property_id } = normalized

    const checks: Promise<void>[] = []

    if (tenant_id) {
      checks.push(
        this.assertOwnership(
          `tenant:${tenant_id}:owner:${user_id}`,
          () => this.verifyTenantOwnership(user_id, tenant_id),
          'You do not have access to this tenant resource',
          { tenant_id, user_id }
        )
      )
    }

    if (lease_id) {
      checks.push(
        this.assertOwnership(
          `lease:${lease_id}:owner:${user_id}`,
          () => this.verifyLeaseOwnership(user_id, lease_id),
          'You do not have access to this lease resource',
          { lease_id, user_id }
        )
      )
    }

    if (property_id) {
      checks.push(
        this.assertOwnership(
          `property:${property_id}:owner:${user_id}`,
          () => this.verifyPropertyOwnership(user_id, property_id),
          'You do not have access to this property resource',
          { property_id, user_id }
        )
      )
    }

    // Log warning if no resource IDs were found in the request
    if (checks.length === 0) {
      this.logger.warn('PropertyOwnershipGuard: No resource IDs found in request', {
        user_id,
        params: JSON.stringify(request.params || {}),
        query: JSON.stringify(request.query || {}),
        body: JSON.stringify(request.body || {})
      })
    }

    await Promise.all(checks)
    return true
  }

  private async cachedOwnership(
    key: string,
    factory: () => Promise<boolean>
  ): Promise<boolean> {
    return this.authCache.getOrSet(key, factory)
  }

  private async assertOwnership(
    cacheKey: string,
    check: () => Promise<boolean>,
    message: string,
    context: Record<string, unknown>
  ): Promise<void> {
    const ownsResource = await this.cachedOwnership(cacheKey, check)
    if (!ownsResource) {
      this.logger.warn('PropertyOwnershipGuard: access denied', {
        ...context,
        reason: 'ownership_verification_failed',
        message
      })
      throw new ForbiddenException(message)
    }
    // Log successful ownership verification
    this.logger.debug('PropertyOwnershipGuard: ownership verified', context)
  }

  /**
   * Verify user owns the tenant (through lease ownership chain)
   * Tenant belongs to Lease, Lease has owner_user_id → users.id
   */
  private async verifyTenantOwnership(
    user_id: string,
    tenant_id: string
  ): Promise<boolean> {
    const client = this.supabase.getAdminClient()

    try {
      // Direct ownership check: leases.owner_user_id references users.id
      // Note: leases.primary_tenant_id (not tenant_id) references tenants.id
      const { data, error } = await client
        .from('leases')
        .select('owner_user_id')
        .eq('primary_tenant_id', tenant_id)
        .single()

      if (error) {
        this.logger.error('PropertyOwnershipGuard: Database error in verifyTenantOwnership', {
          user_id,
          tenant_id,
          error: error.message
        })
        return false
      }

      // Direct ownership comparison
      const result = data as unknown as { owner_user_id: string | null }
      const isOwner = result?.owner_user_id === user_id

      this.logger.debug('PropertyOwnershipGuard: verifyTenantOwnership result', {
        user_id,
        tenant_id,
        isOwner
      })

      return isOwner
    } catch (error) {
      this.logger.error('PropertyOwnershipGuard: Unexpected error in verifyTenantOwnership', {
        user_id,
        tenant_id,
        error: error instanceof Error ? error.message : String(error)
      })
      return false
    }
  }

  /**
   * Verify user owns the lease
   * Lease has owner_user_id → users.id
   */
  private async verifyLeaseOwnership(
    user_id: string,
    lease_id: string
  ): Promise<boolean> {
    const client = this.supabase.getAdminClient()

    try {
      // Direct ownership check: leases.owner_user_id references users.id
      const { data, error } = await client
        .from('leases')
        .select('owner_user_id')
        .eq('id', lease_id)
        .single()

      if (error) {
        this.logger.error('PropertyOwnershipGuard: Database error in verifyLeaseOwnership', {
          user_id,
          lease_id,
          error: error.message
        })
        return false
      }

      // Supabase join returns nested object structure
      const result = data as unknown as { owner_user_id: string | null }
      const isOwner = result?.owner_user_id === user_id

      this.logger.debug('PropertyOwnershipGuard: verifyLeaseOwnership result', {
        user_id,
        lease_id,
        isOwner
      })

      return isOwner
    } catch (error) {
      this.logger.error('PropertyOwnershipGuard: Unexpected error in verifyLeaseOwnership', {
        user_id,
        lease_id,
        error: error instanceof Error ? error.message : String(error)
      })
      return false
    }
  }

  /**
   * Verify user owns the property
   * Property has owner_user_id → users.id
   */
  private async verifyPropertyOwnership(
    user_id: string,
    property_id: string
  ): Promise<boolean> {
    const client = this.supabase.getAdminClient()

    try {
      // Direct ownership check: properties.owner_user_id references users.id
      const { data, error } = await client
        .from('properties')
        .select('owner_user_id')
        .eq('id', property_id)
        .single()

      if (error) {
        this.logger.error('PropertyOwnershipGuard: Database error in verifyPropertyOwnership', {
          user_id,
          property_id,
          error: error.message
        })
        return false
      }

      // Supabase join returns nested object structure
      const result = data as unknown as { owner_user_id: string | null }
      const isOwner = result?.owner_user_id === user_id

      this.logger.debug('PropertyOwnershipGuard: verifyPropertyOwnership result', {
        user_id,
        property_id,
        isOwner
      })

      return isOwner
    } catch (error) {
      this.logger.error('PropertyOwnershipGuard: Unexpected error in verifyPropertyOwnership', {
        user_id,
        property_id,
        error: error instanceof Error ? error.message : String(error)
      })
      return false
    }
  }
}