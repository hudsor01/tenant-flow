import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import type { Tenant } from '@/types/entities'
import { createTenantInvitationHTML, createTenantInvitationText } from '../lib/email-templates'

// Removed unused Lease import

// Form data type (not stored in DB, just for UI)
interface TenantFormData {
  name: string
  email: string
  phone?: string
  emergencyContact?: string
}
import { TenantWithLeaseAccess } from '../types/query-types'
import { TenantWithLeases } from '../types/relationships'
// Removed import - now using API route

export function useTenants() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['tenants', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID')

      // Get tenants that have leases on properties owned by the user
      // RLS will automatically filter to only tenants the user has access to
      const { data, error } = await supabase
        .from('Tenant')
        .select(`
          *,
          leases:Lease (
            id,
            startDate,
            endDate,
            rentAmount,
            securityDeposit,
            status,
            unit:Unit (
              id,
              unitNumber,
              property:Property (
                id,
                name,
                ownerId
              )
            )
          )
        `)
        .order('name', { ascending: true })

      if (error) {
        // Handle empty result gracefully
        if (error.code === 'PGRST116') {
          return []
        }
        throw error
      }

      return data as TenantWithLeases[]
    },
    enabled: !!user?.id,
  })
}

export function useTenant(tenantId: string) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID')

      const { data, error } = await supabase
        .from('Tenant')
        .select(`
          *,
          leases:Lease (
            id,
            startDate,
            endDate,
            rentAmount,
            securityDeposit,
            status,
            unit:Unit (
              id,
              unitNumber,
              bedrooms,
              bathrooms,
              rent,
              property:Property!inner (
                id,
                name,
                address,
                city,
                state,
                zipCode,
                ownerId
              )
            )
          )
        `)
        .eq('id', tenantId)
        .single()

      if (error) throw error

      // Verify user owns at least one property with this tenant
      const hasAccess = data.leases?.some((lease: { unit?: { property?: { ownerId?: string } } }) => {
        const unit = Array.isArray(lease.unit) ? lease.unit[0] : lease.unit;
        const property = Array.isArray(unit?.property) ? unit.property[0] : unit?.property;
        return property?.ownerId === user.id;
      }) || false

      if (!hasAccess) {
        throw new Error('Tenant not found or unauthorized')
      }

      return data as Tenant
    },
    enabled: !!user?.id && !!tenantId,
  })
}

export function useCreateTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: TenantFormData) => {
      const { data: tenant, error } = await supabase
        .from('Tenant')
        .insert({
          name: data.name,
          email: data.email,
          phone: data.phone,
          emergencyContact: data.emergencyContact,
        })
        .select()
        .single()

      if (error) throw error
      return tenant
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
    },
  })
}

export function useUpdateTenant() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TenantFormData }) => {
      if (!user?.id) throw new Error('No user ID')

      // First verify the user has access to this tenant
      const { data: tenant } = await supabase
        .from('Tenant')
        .select(`
          id,
          leases:Lease (
            unit:Unit (
              property:Property!inner (
                ownerId
              )
            )
          )
        `)
        .eq('id', id)
        .single() as { data: TenantWithLeaseAccess | null }

      if (!tenant || !tenant.leases?.some((lease) => 
        lease.unit?.property?.ownerId === user.id
      )) {
        throw new Error('Tenant not found or unauthorized')
      }

      const { data: updatedTenant, error } = await supabase
        .from('Tenant')
        .update({
          name: data.name,
          email: data.email,
          phone: data.phone,
          emergencyContact: data.emergencyContact,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return updatedTenant
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      queryClient.invalidateQueries({ queryKey: ['tenant'] })
    },
  })
}

export function useDeleteTenant() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('No user ID')

      // First get tenant details to determine invitation status
      const { data: tenant, error: tenantError } = await supabase
        .from('Tenant')
        .select(`
          id,
          invitationStatus,
          invitedBy,
          leases:Lease (
            id,
            status,
            unit:Unit (
              property:Property!inner (
                ownerId
              )
            )
          )
        `)
        .eq('id', id)
        .single() as { data: TenantWithLeaseAccess & { invitationStatus: string, invitedBy: string } | null }

      if (tenantError || !tenant) {
        throw new Error('Tenant not found')
      }

      // Verify user has access to this tenant (either they invited them or own property with leases)
      const hasAccess = tenant.invitedBy === user.id || 
        tenant.leases?.some((lease) => lease.unit?.property?.ownerId === user.id)

      if (!hasAccess) {
        throw new Error('Unauthorized to manage this tenant')
      }

      // Business logic based on invitation status
      if (tenant.invitationStatus === 'PENDING') {
        // For pending invitations, delete completely
        const { error } = await supabase
          .from('Tenant')
          .delete()
          .eq('id', id)

        if (error) throw error
        return { action: 'deleted', status: 'PENDING' }
      } else if (tenant.invitationStatus === 'ACCEPTED') {
        // For accepted tenants, check for active leases first
        const activeLeases = tenant.leases?.filter(lease => lease.status === 'ACTIVE') || []
        
        if (activeLeases.length > 0) {
          throw new Error('Cannot deactivate tenant with active leases. Please end all active leases first.')
        }

        // Mark as inactive instead of deleting
        const { error } = await supabase
          .from('Tenant')
          .update({
            invitationStatus: 'INACTIVE',
            // Keep all other data intact for historical purposes
          })
          .eq('id', id)

        if (error) throw error
        return { action: 'deactivated', status: 'ACCEPTED' }
      } else {
        throw new Error('Cannot manage tenant with current status')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      queryClient.invalidateQueries({ queryKey: ['properties'] })
    },
  })
}

// Tenant invitation interface
export interface InviteTenantData {
  name: string
  email: string
  phone?: string
  propertyId: string
  unitId?: string // Optional unit selection
}

export function useInviteTenant() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (data: InviteTenantData) => {
      console.log('🔧 useInviteTenant mutation called with:', data)
      console.log('👤 Current user:', user)
      
      if (!user?.id) throw new Error('No user ID')

      // 1. Verify property ownership
      const { data: property, error: propertyError } = await supabase
        .from('Property')
        .select('id, name, address, city, state, zipCode, ownerId')
        .eq('id', data.propertyId)
        .eq('ownerId', user.id)
        .single()

      if (propertyError || !property) {
        throw new Error('Property not found or unauthorized')
      }

      // 2. Check if tenant email already exists
      const { data: existingTenant } = await supabase
        .from('Tenant')
        .select('id, email, invitationStatus')
        .eq('email', data.email)
        .maybeSingle() // Use maybeSingle to avoid error when no match

      let tenant
      let shouldCreateNew = true
      let invitationToken: string
      let emailResult: any = null
      let emailMethod: string = 'unknown'
      let invitationUrl: string = ''

      if (existingTenant) {
        if (existingTenant.invitationStatus === 'PENDING') {
          // Update the existing pending invitation with new details and resend
          shouldCreateNew = false
          invitationToken = crypto.randomUUID()
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

          const { data: updatedTenant, error: updateError } = await supabase
            .from('Tenant')
            .update({
              name: data.name,
              phone: data.phone,
              invitationToken,
              invitedBy: user.id,
              invitedAt: new Date().toISOString(),
              expiresAt: expiresAt.toISOString(),
            })
            .eq('id', existingTenant.id)
            .select()
            .single()

          if (updateError) throw updateError
          tenant = updatedTenant
        } else if (existingTenant.invitationStatus === 'ACCEPTED') {
          const error = new Error('This tenant has already been invited and accepted')
          ;(error as Error & { tenantDetails?: any }).tenantDetails = {
            id: existingTenant.id,
            email: existingTenant.email,
            name: data.name // Use the name from the form as it might be updated
          }
          throw error
        } else if (existingTenant.invitationStatus === 'CANCELLED') {
          // Reactivate cancelled invitation
          shouldCreateNew = false
          invitationToken = crypto.randomUUID()
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

          const { data: reactivatedTenant, error: reactivateError } = await supabase
            .from('Tenant')
            .update({
              name: data.name,
              phone: data.phone,
              invitationStatus: 'PENDING',
              invitationToken,
              invitedBy: user.id,
              invitedAt: new Date().toISOString(),
              expiresAt: expiresAt.toISOString(),
            })
            .eq('id', existingTenant.id)
            .select()
            .single()

          if (reactivateError) throw reactivateError
          tenant = reactivatedTenant
        }
      }

      // 3. Create new tenant if needed
      if (shouldCreateNew) {
        invitationToken = crypto.randomUUID()
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

        const { data: newTenant, error: tenantError } = await supabase
          .from('Tenant')
          .insert({
            name: data.name,
            email: data.email,
            phone: data.phone,
            invitationStatus: 'PENDING',
            invitationToken,
            invitedBy: user.id,
            invitedAt: new Date().toISOString(),
            expiresAt: expiresAt.toISOString(),
          })
          .select()
          .single()

        if (tenantError) throw tenantError
        tenant = newTenant
      }

      // 5. Send invitation email using direct Resend API
      try {
        const propertyAddress = `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`
        // Use environment variable or fallback to localhost for development
        const baseUrl = import.meta.env.DEV 
          ? (import.meta.env.VITE_DEV_BASE_URL || 'http://localhost:5173')
          : window.location.origin
        invitationUrl = `${baseUrl}/tenant/accept-invitation?token=${invitationToken}`
        
        // Create email HTML using new template system
        const emailHtml = createTenantInvitationHTML({
          tenantName: data.name,
          propertyName: property.name,
          propertyAddress,
          landlordName: user.name || user.email || 'Property Owner',
          invitationUrl,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        
        // Create plain text version as fallback
        const emailText = createTenantInvitationText({
          tenantName: data.name,
          propertyName: property.name,
          propertyAddress,
          landlordName: user.name || user.email || 'Property Owner',
          invitationUrl,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        
        // Try Supabase Edge Function first, with fallback to direct API
        
        
        try {
          console.log('Attempting to send email via Supabase Edge Function...')
          const { data: supabaseResult, error: supabaseError } = await supabase.functions.invoke('send-invitation', {
            body: {
              to: data.email,
              tenantName: data.name,
              propertyName: property.name,
              propertyAddress,
              landlordName: user.name || user.email || 'Property Owner',
              invitationUrl,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              emailHtml,
              emailText
            }
          })
          
          if (supabaseError) {
            throw new Error(`Supabase Edge Function failed: ${supabaseError.message}`)
          }
          
          emailResult = supabaseResult
          emailMethod = 'Supabase Edge Function'
          console.log('✅ Email sent successfully via Supabase Edge Function')
          
        } catch (edgeFunctionError) {
          console.warn('⚠️ Supabase Edge Function failed:', edgeFunctionError.message)
          emailMethod = 'failed - Edge Function not available'
          emailResult = null
        }
        
      } catch (emailError) {
        console.error('Email sending failed:', emailError)
        emailMethod = 'failed'
        emailResult = null
      }

      // Return comprehensive result
      return {
        tenant,
        property,
        emailSent: emailResult !== null,
        emailMethod,
        emailResult,
        invitationUrl,
        // Provide manual sharing info if email failed
        manualSharingInfo: emailResult === null ? {
          message: 'Email could not be sent automatically. Please share this invitation link manually:',
          invitationUrl,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
        } : null
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
    },
  })
}

export function useResendInvitation() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (tenantId: string) => {
      if (!user?.id) throw new Error('No user ID')

      // 1. Get existing tenant data
      const { data: tenant, error: tenantError } = await supabase
        .from('Tenant')
        .select('id, name, email, invitationStatus, invitedBy')
        .eq('id', tenantId)
        .eq('invitedBy', user.id) // Only allow resending if this user sent the original invitation
        .single()

      if (tenantError || !tenant) {
        throw new Error('Tenant not found or unauthorized')
      }

      if (tenant.invitationStatus !== 'PENDING') {
        throw new Error('Can only resend pending invitations')
      }

      // 2. Generate new invitation token and expiry
      const invitationToken = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

      // 3. Update tenant with new token and expiry
      const { error: updateError } = await supabase
        .from('Tenant')
        .update({
          invitationToken,
          expiresAt: expiresAt.toISOString(),
          invitedAt: new Date().toISOString(), // Update invitation date
        })
        .eq('id', tenantId)

      if (updateError) throw updateError

      // 4. Send invitation email using Supabase Edge Function
      let emailResult: any = null
      try {
        const { data, error: emailError } = await supabase.functions.invoke('send-invitation', {
          body: {
            email: tenant.email,
            tenantName: tenant.name,
            invitationToken,
            propertyName: 'Your Property',
            propertyAddress: 'Property Address', 
            propertyOwnerName: user.name || user.email || 'Property Owner',
            baseUrl: import.meta.env.DEV ? 'http://192.168.0.50:5173' : window.location.origin
          }
        })

        if (emailError) {
          console.error('Edge Function error:', emailError)
          throw new Error(`Failed to resend invitation email: ${emailError.message}`)
        }
        
        emailResult = data
        console.log('📧 Resend invitation email sent successfully via Edge Function:', emailResult)
      } catch (emailError) {
        console.error('Failed to resend invitation email:', emailError)
        throw new Error('Failed to send invitation email')
      }

      return { tenant, emailSent: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
    },
  })
}

export function useDeletePendingInvitation() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (tenantId: string) => {
      if (!user?.id) throw new Error('No user ID')

      // 1. Verify tenant exists and is pending
      const { data: tenant, error: tenantError } = await supabase
        .from('Tenant')
        .select('id, invitationStatus, invitedBy')
        .eq('id', tenantId)
        .eq('invitedBy', user.id) // Only allow deletion if this user sent the invitation
        .single()

      if (tenantError || !tenant) {
        throw new Error('Tenant not found or unauthorized')
      }

      if (tenant.invitationStatus !== 'PENDING') {
        throw new Error('Can only delete pending invitations')
      }

      // 2. Instead of deleting, mark as cancelled to avoid foreign key issues
      const { error: updateError } = await supabase
        .from('Tenant')
        .update({
          invitationStatus: 'CANCELLED',
          invitationToken: null,
          invitationExpiry: null
        })
        .eq('id', tenantId)

      if (updateError) throw updateError

      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
    },
  })
}