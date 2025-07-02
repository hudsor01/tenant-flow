import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Building2, Users, FileText, CreditCard } from 'lucide-react'
import { useProperties } from '@/hooks/useApiProperties'
import { useTenants } from '@/hooks/useTenants'
import { useLeases } from '@/hooks/useLeases'
import QuickPropertySetup from '@/components/properties/QuickPropertySetup'
import InviteTenantModal from '@/components/tenants/InviteTenantModal'
import LeaseFormModal from '@/components/leases/LeaseFormModal'
import { motion } from 'framer-motion'

interface WizardStepProps {
  stepNumber: number
  title: string
  description: string
  isComplete: boolean
  isCurrent: boolean
  icon: React.ReactNode
  children: React.ReactNode
}

function WizardStep({ stepNumber, title, description, isComplete, isCurrent, icon, children }: WizardStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: stepNumber * 0.1 }}
      className={`relative ${isCurrent ? 'ring-2 ring-green-500' : ''}`}
    >
      <Card className={`${isComplete ? 'border-green-200 bg-green-50' : isCurrent ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
              isComplete ? 'bg-green-100 text-green-600' : 
              isCurrent ? 'bg-blue-100 text-blue-600' : 
              'bg-gray-100 text-gray-400'
            }`}>
              {isComplete ? <CheckCircle className="h-5 w-5" /> : icon}
            </div>
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <span>Step {stepNumber}: {title}</span>
                {isComplete && <Badge variant="secondary" className="bg-green-100 text-green-800">Complete</Badge>}
                {isCurrent && <Badge variant="secondary" className="bg-blue-100 text-blue-800">Current</Badge>}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function GetStartedWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false)
  // Future: property selection for lease creation

  const { data: properties = [], refetch: refetchProperties } = useProperties()
  const { data: tenants = [], refetch: refetchTenants } = useTenants()
  const { data: leases = [], refetch: refetchLeases } = useLeases()

  // Calculate completion status
  const hasProperties = properties.length > 0
  const hasTenants = tenants.length > 0
  const hasLeases = leases.length > 0
  const hasActiveLeases = leases.some(lease => lease.status === 'ACTIVE')

  // Determine current step
  React.useEffect(() => {
    if (!hasProperties) setCurrentStep(1)
    else if (!hasTenants) setCurrentStep(2)
    else if (!hasLeases) setCurrentStep(3)
    else if (!hasActiveLeases) setCurrentStep(4)
    else setCurrentStep(5)
  }, [hasProperties, hasTenants, hasLeases, hasActiveLeases])

  const progress = (
    (hasProperties ? 25 : 0) +
    (hasTenants ? 25 : 0) +
    (hasLeases ? 25 : 0) +
    (hasActiveLeases ? 25 : 0)
  )

  const isComplete = hasProperties && hasTenants && hasLeases && hasActiveLeases

  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <div className="flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">🎉 Setup Complete!</h2>
        <p className="text-lg text-gray-600 mb-6">
          Your TenantFlow property management system is ready to go!
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => window.location.href = '/dashboard'} size="lg">
            Go to Dashboard
          </Button>
          <Button onClick={() => window.location.href = '/tenant/payments'} variant="outline" size="lg">
            Test Tenant Portal
          </Button>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Get Started with TenantFlow</h1>
        <p className="text-lg text-gray-600 mb-6">
          Let's set up your property management system in just a few steps
        </p>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div 
            className="bg-green-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-gray-600">{progress}% Complete</p>
      </div>

      {/* Step 1: Create Properties */}
      <WizardStep
        stepNumber={1}
        title="Create Your First Property"
        description="Add a property with units that you want to manage"
        isComplete={hasProperties}
        isCurrent={currentStep === 1}
        icon={<Building2 className="h-5 w-5" />}
      >
        {hasProperties ? (
          <div className="space-y-3">
            <p className="text-green-700 font-medium">✅ You have {properties.length} property(ies) set up:</p>
            {properties.slice(0, 3).map(property => (
              <div key={property.id} className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-green-600" />
                <span>{property.name} - {property.address}</span>
              </div>
            ))}
            {properties.length > 3 && (
              <p className="text-sm text-gray-600">...and {properties.length - 3} more</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">
              Start by creating your first property. This quick setup will create a property with units ready for tenants.
            </p>
            <QuickPropertySetup onComplete={refetchProperties} />
          </div>
        )}
      </WizardStep>

      {/* Step 2: Invite Tenants */}
      <WizardStep
        stepNumber={2}
        title="Invite Your Tenants"
        description="Send invitations to your tenants so they can access their portal"
        isComplete={hasTenants}
        isCurrent={currentStep === 2}
        icon={<Users className="h-5 w-5" />}
      >
        {hasTenants ? (
          <div className="space-y-3">
            <p className="text-green-700 font-medium">✅ You have {tenants.length} tenant(s) invited:</p>
            {tenants.slice(0, 3).map(tenant => (
              <div key={tenant.id} className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-green-600" />
                <span>{tenant.name} ({tenant.email})</span>
                <Badge variant="outline" className={
                  tenant.invitationStatus === 'ACCEPTED' ? 'bg-green-100 text-green-800' : 
                  tenant.invitationStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-gray-100 text-gray-800'
                }>
                  {tenant.invitationStatus}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">
              Invite tenants to access their portal where they can view lease information and pay rent.
            </p>
            <Button 
              onClick={() => setIsInviteModalOpen(true)}
              disabled={!hasProperties}
              className="w-full sm:w-auto"
            >
              <Users className="h-4 w-4 mr-2" />
              Invite First Tenant
            </Button>
            {!hasProperties && (
              <p className="text-sm text-gray-500">Complete Step 1 first to invite tenants</p>
            )}
          </div>
        )}
      </WizardStep>

      {/* Step 3: Create Leases */}
      <WizardStep
        stepNumber={3}
        title="Create Lease Agreements"
        description="Set up lease agreements connecting tenants to your properties"
        isComplete={hasLeases}
        isCurrent={currentStep === 3}
        icon={<FileText className="h-5 w-5" />}
      >
        {hasLeases ? (
          <div className="space-y-3">
            <p className="text-green-700 font-medium">✅ You have {leases.length} lease(s) created:</p>
            {leases.slice(0, 3).map(lease => (
              <div key={lease.id} className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-green-600" />
                <span>{lease.tenant?.name} - ${lease.rentAmount}/month</span>
                <Badge variant="outline" className={
                  lease.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                  'bg-gray-100 text-gray-800'
                }>
                  {lease.status}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">
              Create lease agreements to formally connect tenants to your property units with rent amounts and terms.
            </p>
            <Button 
              onClick={() => setIsLeaseModalOpen(true)}
              disabled={!hasTenants}
              className="w-full sm:w-auto"
            >
              <FileText className="h-4 w-4 mr-2" />
              Create First Lease
            </Button>
            {!hasTenants && (
              <p className="text-sm text-gray-500">Complete Step 2 first to create leases</p>
            )}
          </div>
        )}
      </WizardStep>

      {/* Step 4: Test Payments */}
      <WizardStep
        stepNumber={4}
        title="Test Payment System"
        description="Test the tenant payment portal to ensure everything works"
        isComplete={hasActiveLeases}
        isCurrent={currentStep === 4}
        icon={<CreditCard className="h-5 w-5" />}
      >
        {hasActiveLeases ? (
          <div className="space-y-3">
            <p className="text-green-700 font-medium">✅ Payment system is ready!</p>
            <p className="text-sm text-gray-600">
              Your tenants can now log in and pay rent through their portal.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">
              Once you have active leases, tenants can pay rent online. You'll earn processing fees on every payment!
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={() => window.location.href = '/tenant/payments'}
                disabled={!hasLeases}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Test Tenant Portal
              </Button>
              <Button 
                onClick={() => window.location.href = '/leases'}
                disabled={!hasLeases}
                className="w-full sm:w-auto"
              >
                <FileText className="h-4 w-4 mr-2" />
                Manage Leases
              </Button>
            </div>
            {!hasLeases && (
              <p className="text-sm text-gray-500">Complete Step 3 first to test payments</p>
            )}
          </div>
        )}
      </WizardStep>

      {/* Modals */}
      <InviteTenantModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        selectedPropertyId={properties[0]?.id}
        onSuccess={() => {
          setIsInviteModalOpen(false)
          refetchTenants()
        }}
      />

      <LeaseFormModal
        isOpen={isLeaseModalOpen}
        onClose={() => setIsLeaseModalOpen(false)}
        onSuccess={() => {
          setIsLeaseModalOpen(false)
          refetchLeases()
        }}
      />
    </div>
  )
}