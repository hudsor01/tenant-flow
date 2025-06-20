import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { UserPlus, Mail, User, Phone, Building2, Send, X, AlertCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useProperties } from '../../hooks/useProperties'
import { useUnits } from '../../hooks/useUnits'
import { useInviteTenant, useResendInvitation, useDeletePendingInvitation } from '../../hooks/useTenants'
import { toast } from 'sonner'
import TenantAlreadyAcceptedModal from './TenantAlreadyAcceptedModal'

const inviteTenantSchema = z.object({
  name: z.string().min(1, 'Tenant name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  propertyId: z.string().min(1, 'Property selection is required'),
  unitId: z.string().optional(),
})

type InviteTenantForm = z.infer<typeof inviteTenantSchema>

interface InviteTenantModalProps {
  isOpen: boolean
  onClose: () => void
  selectedPropertyId?: string
}

export default function InviteTenantModal({ 
  isOpen, 
  onClose, 
  selectedPropertyId 
}: InviteTenantModalProps) {
  const { data: properties = [], isLoading: propertiesLoading, error: propertiesError } = useProperties()
  const { mutateAsync: inviteTenant, isPending: isInviting } = useInviteTenant()
  const { mutateAsync: resendInvitation, isPending: isResending } = useResendInvitation()
  const { mutateAsync: deletePendingInvitation, isPending: isDeleting } = useDeletePendingInvitation()
  
  const [pendingInvitationError, setPendingInvitationError] = React.useState<{
    message: string
    tenantId?: string
  } | null>(null)
  
  const [alreadyAcceptedTenant, setAlreadyAcceptedTenant] = React.useState<{
    name: string
    email: string
  } | null>(null)
  
  // Watch for property selection changes to load units
  const [selectedProperty, setSelectedProperty] = React.useState(selectedPropertyId || '')
  const { data: units = [], isLoading: unitsLoading } = useUnits(selectedProperty || '')

  const form = useForm<InviteTenantForm>({
    resolver: zodResolver(inviteTenantSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      propertyId: selectedPropertyId || '',
      unitId: '',
    },
  })


  const { watch, setValue, reset } = form
  const watchedPropertyId = watch('propertyId')

  // Update selected property when form value changes
  useEffect(() => {
    if (watchedPropertyId !== selectedProperty) {
      setSelectedProperty(watchedPropertyId)
      setValue('unitId', '') // Reset unit selection when property changes
    }
  }, [watchedPropertyId, selectedProperty, setValue])

  // Set selected property when modal opens
  useEffect(() => {
    if (isOpen && selectedPropertyId) {
      setSelectedProperty(selectedPropertyId)
      setValue('propertyId', selectedPropertyId)
    }
  }, [isOpen, selectedPropertyId, setValue])

  const handleClose = () => {
    setSelectedProperty('')
    setPendingInvitationError(null)
    setAlreadyAcceptedTenant(null)
    reset()
    onClose()
  }

  const onSubmit = async (data: InviteTenantForm) => {
    console.log('🚀 Form submitted with data:', data)
    console.log('📋 Form errors:', form.formState.errors)
    console.log('👤 Form state valid:', form.formState.isValid)
    try {
      setPendingInvitationError(null)
      console.log('📤 Calling inviteTenant mutation...')
      const result = await inviteTenant({
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        propertyId: data.propertyId,
        unitId: data.unitId || undefined,
      })
      
      
      // Check if email was actually sent
      if (result.emailSent) {
        toast.success('🎉 Invitation sent successfully!', {
          description: 'The tenant will receive an email with login instructions.',
          duration: 5000,
        })
      } else {
        toast.success('✅ Tenant created successfully!', {
          description: (
            <div className="space-y-2">
              <p className="text-sm text-emerald-700 font-medium">
                📧 Email system temporarily unavailable
              </p>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <p className="text-xs text-emerald-600 font-medium mb-2">
                  Share this invitation link manually:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-white border border-emerald-300 rounded px-2 py-1 text-emerald-800 break-all">
                    {result.invitationUrl}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(result.invitationUrl)
                      toast.success('🔗 Link copied to clipboard!', { duration: 2000 })
                    }}
                    className="text-emerald-600 hover:text-emerald-700 p-1 rounded hover:bg-emerald-100 transition-colors"
                    title="Copy link"
                  >
                    📋
                  </button>
                </div>
              </div>
            </div>
          ),
          duration: 10000,
        })
      }
      handleClose()
    } catch (error) {
      // Check if this is a pending invitation error
      const errorWithTenantId = error as Error & { tenantId?: string };
      const errorWithTenantDetails = error as Error & { tenantDetails?: any };
      
      if (error instanceof Error && error.message.includes('already pending') && errorWithTenantId.tenantId) {
        setPendingInvitationError({
          message: error.message,
          tenantId: errorWithTenantId.tenantId
        })
      } else if (error instanceof Error && error.message.includes('already been invited and accepted') && errorWithTenantDetails.tenantDetails) {
        // Show the prominent modal for already accepted tenants
        setAlreadyAcceptedTenant({
          name: errorWithTenantDetails.tenantDetails.name,
          email: errorWithTenantDetails.tenantDetails.email
        })
      } else {
        toast.error(error instanceof Error ? error.message : 'Failed to send invitation')
      }
    }
  }

  const handleResendInvitation = async () => {
    if (!pendingInvitationError?.tenantId) return
    
    try {
      await resendInvitation(pendingInvitationError.tenantId)
      toast.success('Invitation resent successfully!')
      handleClose()
    } catch (error) {
      console.error('Failed to resend invitation:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to resend invitation')
    }
  }

  const handleDeletePendingInvitation = async () => {
    if (!pendingInvitationError?.tenantId) return
    
    try {
      await deletePendingInvitation(pendingInvitationError.tenantId)
      toast.success('Pending invitation deleted successfully!')
      setPendingInvitationError(null)
      // Don't close modal, let user try again with same form data
    } catch (error) {
      console.error('Failed to delete pending invitation:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete pending invitation')
    }
  }

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.2 }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95,
      transition: { duration: 0.2 }
    }
  }

  const fieldVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.3
      }
    })
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <DialogHeader className="pb-4">
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                <UserPlus className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-xl font-bold">
                  Invite New Tenant
                </DialogTitle>
                <DialogDescription>
                  Send an invitation to a new tenant to join your property
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Tenant Information */}
            <motion.div 
              variants={fieldVariants}
              initial="hidden"
              animate="visible"
              custom={0}
              className="space-y-4"
            >
              <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
                <User className="h-4 w-4 text-gray-600" />
                <h3 className="font-medium text-gray-900">Tenant Information</h3>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Full Name *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    placeholder="e.g., John Doe"
                    className="pl-10 transition-colors focus:border-green-500"
                    {...form.register('name')}
                  />
                </div>
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="e.g., john.doe@example.com"
                    className="pl-10 transition-colors focus:border-green-500"
                    {...form.register('email')}
                  />
                </div>
                {form.formState.errors.email && (
                  <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
                )}
                <p className="text-xs text-gray-500">
                  An invitation email will be sent to this address
                </p>
              </div>

              {/* Phone (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                  Phone Number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="e.g., (555) 123-4567"
                    className="pl-10 transition-colors focus:border-green-500"
                    {...form.register('phone')}
                  />
                </div>
                {form.formState.errors.phone && (
                  <p className="text-sm text-red-600">{form.formState.errors.phone.message}</p>
                )}
              </div>
            </motion.div>

            {/* Property Selection */}
            <motion.div 
              variants={fieldVariants}
              initial="hidden"
              animate="visible"
              custom={1}
              className="space-y-4"
            >
              <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
                <Building2 className="h-4 w-4 text-gray-600" />
                <h3 className="font-medium text-gray-900">Property Assignment</h3>
              </div>

              {/* Property Selection Error */}
              {propertiesError && (propertiesError as { code?: string }).code !== 'PGRST116' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Failed to load properties. Please close and try again.
                  </AlertDescription>
                </Alert>
              )}

              {/* Property Selection */}
              <div className="space-y-2">
                <Label htmlFor="propertyId" className="text-sm font-medium text-gray-700">
                  Select Property *
                </Label>
                <select
                  id="propertyId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors focus:border-green-500"
                  disabled={propertiesLoading || !!selectedPropertyId || !!propertiesError}
                  {...form.register('propertyId')}
                >
                  <option value="">
                    {propertiesLoading ? 'Loading properties...' : 'Choose a property...'}
                  </option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name} - {property.address}, {property.city}, {property.state}
                    </option>
                  ))}
                </select>
                {form.formState.errors.propertyId && (
                  <p className="text-sm text-red-600">{form.formState.errors.propertyId.message}</p>
                )}
                {selectedPropertyId && (
                  <p className="text-xs text-green-600 font-medium">
                    ✓ Property pre-selected from current context
                  </p>
                )}
                {properties.length === 0 && !propertiesLoading && (
                  <Alert className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <span className="font-medium">No properties yet!</span> You need to create a property first before inviting tenants.
                      <Button 
                        type="button"
                        variant="link" 
                        className="p-0 h-auto font-medium ml-1"
                        onClick={() => {
                          onClose()
                          // Navigate to properties page to create one
                          window.location.href = '/properties'
                        }}
                      >
                        Create your first property →
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Unit Selection */}
              {selectedProperty && (
                <div className="space-y-2">
                  <Label htmlFor="unitId" className="text-sm font-medium text-gray-700">
                    Select Unit (Optional)
                  </Label>
                  <select
                    id="unitId"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors focus:border-green-500"
                    disabled={unitsLoading}
                    {...form.register('unitId')}
                  >
                    <option value="">
                      {unitsLoading ? 'Loading units...' : 'Choose a unit (optional)...'}
                    </option>
                    {units
                      .filter(unit => unit.status === 'VACANT' || unit.status === 'RESERVED')
                      .map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          Unit {unit.unitNumber} - {unit.bedrooms}bd/{unit.bathrooms}ba - ${unit.rent}/month
                        </option>
                      ))}
                  </select>
                  
                  {/* No Units Available - Helpful Message */}
                  {!unitsLoading && units.length === 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
                      <div className="flex items-start space-x-2">
                        <Building2 className="h-4 w-4 text-amber-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-amber-900 mb-1">No units created yet</p>
                          <p className="text-amber-700 mb-2">
                            This property doesn't have any units yet. You can still invite the tenant and assign them to a unit later.
                          </p>
                          <Button 
                            type="button"
                            variant="outline" 
                            size="sm"
                            className="border-amber-300 text-amber-700 hover:bg-amber-100"
                            onClick={() => {
                              onClose()
                              // Navigate to property detail page to add units
                              window.location.href = `/properties/${selectedProperty}`
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Create units first
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500">
                    {units.length > 0 
                      ? 'Leave blank to assign unit later. Only vacant and reserved units are shown.'
                      : 'You can create units after sending the invitation by going to the property details page.'
                    }
                  </p>
                </div>
              )}
            </motion.div>

            {/* Pending Invitation Error */}
            {pendingInvitationError && (
              <motion.div 
                variants={fieldVariants}
                initial="hidden"
                animate="visible"
                custom={2}
                className="bg-amber-50 border border-amber-200 rounded-lg p-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-900 mb-1">Invitation Already Pending</p>
                      <p className="text-amber-700 mb-3">
                        {pendingInvitationError.message}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResendInvitation}
                      disabled={isResending}
                      className="border-amber-300 text-amber-700 hover:bg-amber-100"
                    >
                      {isResending ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-amber-600 mr-1"></div>
                          Resending...
                        </div>
                      ) : (
                        <>
                          <Send className="h-3 w-3 mr-1" />
                          Resend Invitation
                        </>
                      )}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDeletePendingInvitation}
                      disabled={isDeleting}
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      {isDeleting ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 mr-1"></div>
                          Deleting...
                        </div>
                      ) : (
                        <>
                          <X className="h-3 w-3 mr-1" />
                          Delete & Retry
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Information Box */}
            {!pendingInvitationError && (
              <motion.div 
                variants={fieldVariants}
                initial="hidden"
                animate="visible"
                custom={2}
                className="bg-blue-50 border border-blue-200 rounded-lg p-4"
              >
                <div className="flex items-start space-x-3">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 mb-1">Invitation Process</p>
                    <p className="text-blue-700">
                      The tenant will receive an email invitation with a secure link to create their account 
                      and access their tenant portal. They'll be able to view lease information, make payments, 
                      and submit maintenance requests.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            <DialogFooter className="pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isInviting ||
                  propertiesLoading || 
                  !!propertiesError ||
                  (properties.length === 0 && !propertiesLoading)
                }
                onClick={() => {
                  console.log('🔴 BUTTON CLICKED - Check if form.handleSubmit is working...')
                  console.log('Form state:', {
                    isValid: form.formState.isValid,
                    errors: form.formState.errors,
                    values: form.getValues()
                  })
                }}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {isInviting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending Invitation...
                  </div>
                ) : propertiesLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Loading Properties...
                  </div>
                ) : properties.length === 0 && !propertiesError ? (
                  <>
                    <Building2 className="h-4 w-4 mr-2" />
                    No Properties Available
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>

    {/* Tenant Already Accepted Modal */}
    <TenantAlreadyAcceptedModal
      isOpen={!!alreadyAcceptedTenant}
      onClose={() => setAlreadyAcceptedTenant(null)}
      tenantName={alreadyAcceptedTenant?.name || ''}
      tenantEmail={alreadyAcceptedTenant?.email || ''}
    />
  </>
  )
}