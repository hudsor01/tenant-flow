import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Building, CheckCircle, AlertCircle, User, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { supabaseAnon } from '@/lib/supabase-anon'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { userCreationService } from '@/lib/user-creation-service'

const acceptInvitationSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type AcceptInvitationFormData = z.infer<typeof acceptInvitationSchema>

interface InvitationData {
  tenant: {
    id: string
    name: string
    email: string
    phone?: string
  }
  property: {
    id: string
    name: string
    address: string
    city: string
    state: string
    zipCode?: string
  }
  unit?: {
    id: string
    unitNumber: string
  }
  propertyOwner: {
    name: string
    email: string
    phone?: string
  }
  expiresAt: string
}

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  const { user } = useAuthStore()
  // const { user, isLoading: authLoading } = useAuthStore() // authLoading not used
  
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExpired, setIsExpired] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AcceptInvitationFormData>({
    resolver: zodResolver(acceptInvitationSchema),
  })

  // Prevent automatic auth redirect to dashboard if user is already logged in
  // but allow them to complete the invitation process
  useEffect(() => {
    if (user && !isLoading && invitationData) {
      console.log('User already authenticated, but allowing invitation completion')
      // Don't redirect to dashboard - let them complete the invitation process
      return
    }
  }, [user, isLoading, invitationData])

  useEffect(() => {
    if (!token) {
      toast.error('Invalid invitation link')
      navigate('/auth/login')
      return
    }

    // Clear any existing auth session to ensure anonymous access
    supabaseAnon.auth.signOut().then(() => {
      console.log('Cleared any existing auth session for invitation page')
      verifyInvitation()
    }).catch(() => {
      // Ignore errors - just proceed with verification
      verifyInvitation()
    })
  }, [token, navigate]) // eslint-disable-line react-hooks/exhaustive-deps

  const verifyInvitation = async () => {
    try {
      setIsLoading(true)
      
      console.log('Verifying invitation with token:', token)

      // Get tenant by invitation token with all related data
      // Use anonymous client to avoid auth session interference
      const { data: tenant, error: tenantError } = await supabaseAnon
        .from('Tenant')
        .select(`
          id,
          name,
          email,
          phone,
          invitationStatus,
          expiresAt,
          invitedBy
        `)
        .eq('invitationToken', token)
        .eq('invitationStatus', 'PENDING')
        .single()

      if (tenantError || !tenant) {
        if (tenantError?.code === 'PGRST116') {
          toast.error('Invitation not found or already used')
        } else {
          toast.error('Invalid invitation')
        }
        navigate('/auth/login')
        return
      }

      // Check if invitation has expired
      if (tenant.expiresAt && new Date(tenant.expiresAt) < new Date()) {
        setIsExpired(true)
        setIsLoading(false)
        return
      }

      // Extract property and unit information from inviter's properties
      let property = null
      const unit = null // This variable is never reassigned

      // Get the first property of the inviter
      const { data: ownerProperties } = await supabaseAnon
        .from('Property')
        .select('id, name, address, city, state, zipCode')
        .eq('ownerId', tenant.invitedBy)
        .limit(1)
        .single()
      
      property = ownerProperties

      if (!property) {
        toast.error('Property information not found')
        navigate('/auth/login')
        return
      }

      setInvitationData({
        tenant: {
          id: tenant.id,
          name: tenant.name,
          email: tenant.email,
          phone: tenant.phone || undefined,
        },
        property: {
          id: property.id,
          name: property.name,
          address: property.address,
          city: property.city,
          state: property.state,
          zipCode: property.zipCode || undefined,
        },
        unit: unit ? {
          id: unit.id,
          unitNumber: unit.unitNumber
        } : undefined,
        propertyOwner: {
          name: 'Property Owner',
          email: 'Contact your property manager',
          phone: undefined,
        },
        expiresAt: tenant.expiresAt
      })

    } catch (error) {
      console.error('Error verifying invitation:', error)
      toast.error('Failed to verify invitation')
      navigate('/auth/login')
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: AcceptInvitationFormData) => {
    if (!invitationData || !token) return

    try {
      setIsSubmitting(true)

      // 1. Check if user already exists with this email
      console.log('Attempting sign in with existing credentials...')
      const { data: existingAuth, error: signInError } = await supabase.auth.signInWithPassword({
        email: invitationData.tenant.email,
        password: data.password
      })
      
      console.log('Sign in result:', { existingAuth, signInError })

      let userId: string

      if (existingAuth?.user) {
        // User already exists, just link the tenant record
        userId = existingAuth.user.id
        console.log('Using existing user:', userId)
        toast.info('Welcome back! Linking your existing account...')
      } else {
        console.log('Creating new user account...')
        // 2. Create new Supabase auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: invitationData.tenant.email,
          password: data.password,
          options: {
            data: {
              name: invitationData.tenant.name,
              role: 'TENANT',
              phone: invitationData.tenant.phone,
            },
            emailRedirectTo: `${window.location.origin}/tenant/dashboard`
          }
        })

        console.log('Supabase auth signup result:', { authData, authError })

        if (authError) {
          console.error('Auth signup error details:', authError)
          // Check if user already exists error
          if (authError.message?.includes('already registered')) {
            toast.error('This email is already registered. Please sign in with your existing password.')
            return
          }
          throw new Error(`Auth signup failed: ${authError.message}`)
        }

        if (!authData.user) {
          throw new Error('Failed to create user account')
        }

        userId = authData.user.id

        // 2b. Ensure User record exists using bulletproof service
        console.log('Ensuring User record exists using bulletproof service...')
        const userCreationResult = await userCreationService.ensureUserExists(authData.user, {
          role: 'TENANT',
          name: invitationData.tenant.name
        })

        if (!userCreationResult.success) {
          console.error('Failed to create User record:', userCreationResult)
          throw new Error(`User record creation failed: ${userCreationResult.error}`)
        }

        console.log('User record creation result:', userCreationResult)
      }

      // 3. Update tenant record to mark invitation as accepted and link to user
      console.log('Updating tenant record...')
      const { error: updateError } = await supabase
        .from('Tenant')
        .update({
          userId: userId,
          invitationStatus: 'ACCEPTED',
          acceptedAt: new Date().toISOString(),
          invitationToken: null // Clear the token for security
        })
        .eq('id', invitationData.tenant.id)

      if (updateError) {
        console.error('Failed to update tenant status:', updateError)
        throw new Error(`Tenant update failed: ${updateError.message}`)
      }

      // 4. Create notification for property owner
      // Get the actual owner user ID from the tenant invitation
      const ownerUserId = await supabaseAnon
        .from('Tenant')
        .select('invitedBy')
        .eq('id', invitationData.tenant.id)
        .single()

      if (ownerUserId.data?.invitedBy) {
        await supabase
          .from('Notification')
          .insert({
            userId: ownerUserId.data.invitedBy,
            title: 'Tenant Accepted Invitation',
            message: `${invitationData.tenant.name} has accepted the invitation for ${invitationData.property.name}${invitationData.unit ? ` Unit ${invitationData.unit.unitNumber}` : ''}.`,
            type: 'TENANT',
            priority: 'HIGH',
            propertyId: invitationData.property.id,
            tenantId: invitationData.tenant.id,
            read: false
          })
      }

      toast.success('Account setup complete!', {
        description: 'Welcome to TenantFlow. Redirecting to your dashboard...'
      })

      // 5. Wait a moment for auth session to establish
      setTimeout(() => {
        navigate('/tenant/dashboard')
      }, 1500)

    } catch (err: unknown) {
      const error = err as Error
      console.error('Error accepting invitation:', error)
      console.error('Full error details:', JSON.stringify(error, null, 2))
      toast.error('Failed to complete setup', {
        description: error.message || 'Please try again or contact your property manager'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const requestNewInvitation = async () => {
    if (invitationData?.propertyOwner.email) {
      window.location.href = `mailto:${invitationData.propertyOwner.email}?subject=Request for New Invitation&body=Hello,%0D%0A%0D%0AMy invitation to TenantFlow has expired. Could you please send me a new invitation?%0D%0A%0D%0AThank you!`
    } else {
      toast.info('Please contact your property manager for a new invitation')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <span className="ml-3 text-gray-600">Verifying invitation...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle className="text-red-700">Invitation Expired</CardTitle>
            <CardDescription>
              This invitation link has expired. Please contact your property manager for a new invitation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={requestNewInvitation}
              className="w-full"
              variant="outline"
            >
              Contact Property Manager
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!invitationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle className="text-red-700">Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or has already been used.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                <Building className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Welcome to {invitationData.property.name}!
            </CardTitle>
            <CardDescription className="text-base">
              Complete your account setup to access your tenant portal
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Invitation Details */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-3">Your Invitation Details</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <User className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Name</span>
                  </div>
                  <span className="text-sm text-green-700 ml-6">
                    {invitationData.tenant.name}
                  </span>
                </div>
                
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Mail className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Email</span>
                  </div>
                  <span className="text-sm text-green-700 ml-6">
                    {invitationData.tenant.email}
                  </span>
                </div>
                
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Building className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Property</span>
                  </div>
                  <div className="text-sm text-green-700 ml-6">
                    <div className="font-medium">{invitationData.property.name}</div>
                    <div>
                      {invitationData.property.address}, {invitationData.property.city}, {invitationData.property.state}
                      {invitationData.property.zipCode && ` ${invitationData.property.zipCode}`}
                    </div>
                    {invitationData.unit && (
                      <div className="mt-1 font-medium">
                        Unit {invitationData.unit.unitNumber}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Expiration Notice */}
              <div className="mt-3 pt-3 border-t border-green-200">
                <p className="text-xs text-green-700">
                  This invitation expires on {new Date(invitationData.expiresAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            {/* Account Creation Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Create Password *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter a secure password"
                    className="pl-10 pr-10"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm Password *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    className="pl-10"
                    {...register('confirmPassword')}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Account...
                  </div>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Account Setup
                  </>
                )}
              </Button>
            </form>

            <div className="text-center text-sm text-gray-500">
              <p>
                Invited by {invitationData.propertyOwner.name}
              </p>
              <p>
                Questions? Contact{' '}
                <a 
                  href={`mailto:${invitationData.propertyOwner.email}`}
                  className="text-green-600 hover:underline"
                >
                  {invitationData.propertyOwner.email}
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}