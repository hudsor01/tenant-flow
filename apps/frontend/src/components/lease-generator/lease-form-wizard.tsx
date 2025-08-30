'use client'

import React, { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, ArrowRight, FileText, CheckCircle } from 'lucide-react'
import type { USState, PropertyType } from '@repo/shared';
// LeaseFormData type is used in interface but not directly in component

// Form validation schema
const leaseFormSchema = z.object({
  property: z.object({
    address: z.object({
      street: z.string().min(1, 'Street address is required'),
      unit: z.string().optional(),
      city: z.string().min(1, 'City is required'),
      state: z.enum(['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'] as [USState, ...USState[]]),
      zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
    }),
    type: z.enum(['single_family_home', 'apartment', 'condo', 'townhouse', 'duplex', 'mobile_home', 'room_rental', 'commercial'] as [PropertyType, ...PropertyType[]]),
    bedrooms: z.number().min(0).max(20),
    bathrooms: z.number().min(0.5).max(20),
    squareFeet: z.number().optional(),
  }),
  landlord: z.object({
    name: z.string().min(1, 'Landlord name is required'),
    isEntity: z.boolean(),
    entityType: z.enum(['LLC', 'Corporation', 'Partnership']).optional(),
    address: z.object({
      street: z.string().min(1, 'Street address is required'),
      city: z.string().min(1, 'City is required'),
      state: z.enum(['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'] as [USState, ...USState[]]),
      zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
    }),
    phone: z.string().min(10, 'Phone number required'),
    email: z.string().email('Valid email required'),
  }),
  tenants: z.array(z.object({
    name: z.string().min(1, 'Tenant name is required'),
    email: z.string().email('Valid email required'),
    phone: z.string().min(10, 'Phone number required'),
    isMainTenant: z.boolean(),
  })).min(1, 'At least one tenant is required'),
  leaseTerms: z.object({
    type: z.enum(['fixed_term', 'month_to_month', 'week_to_week', 'at_will']),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().optional(),
    rentAmount: z.number().min(1, 'Rent amount is required'),
    currency: z.literal('USD'),
    dueDate: z.number().min(1).max(31),
    lateFee: z.object({
      enabled: z.boolean(),
      amount: z.number().optional(),
      gracePeriod: z.number().optional(),
      percentage: z.number().optional(),
    }),
    securityDeposit: z.object({
      amount: z.number().min(0),
      monthsRent: z.number().min(0).max(3),
    }),
  }),
  policies: z.object({
    pets: z.object({
      allowed: z.boolean(),
      types: z.array(z.enum(['dogs', 'cats', 'birds', 'fish', 'other'])).optional(),
      deposit: z.number().optional(),
      monthlyFee: z.number().optional(),
      restrictions: z.string().optional(),
    }),
    smoking: z.object({
      allowed: z.boolean(),
      designatedAreas: z.string().optional(),
    }),
    guests: z.object({
      overnightLimit: z.number().optional(),
      extendedStayLimit: z.number().optional(),
    }),
    maintenance: z.object({
      tenantResponsibilities: z.array(z.string()),
      landlordResponsibilities: z.array(z.string()),
    }),
  }).optional(),
  customTerms: z.array(z.object({
    title: z.string(),
    content: z.string(),
    required: z.boolean(),
  })).optional(),
  options: z.object({
    includeStateDisclosures: z.boolean(),
    includeFederalDisclosures: z.boolean(),
    includeSignaturePages: z.boolean(),
    format: z.enum(['standard', 'detailed', 'simple']),
  }),
})

type LeaseFormValues = z.infer<typeof leaseFormSchema>

// Wizard steps
const STEPS = [
  { id: 'property', title: 'Property Details', description: 'Basic property information' },
  { id: 'landlord', title: 'Landlord Info', description: 'Owner/manager details' },
  { id: 'tenants', title: 'Tenant Info', description: 'Renter information' },
  { id: 'terms', title: 'Lease Terms', description: 'Rent, dates, and policies' },
  { id: 'review', title: 'Review & Generate', description: 'Final review before generation' },
] as const

interface LeaseFormWizardProps {
  onGenerate: (data: LeaseFormValues) => void
  initialData?: Partial<LeaseFormValues>
  isGenerating?: boolean
}

export function LeaseFormWizard({ onGenerate, initialData, isGenerating = false }: LeaseFormWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  
  const methods = useForm<LeaseFormValues>({
    resolver: zodResolver(leaseFormSchema),
    defaultValues: {
      property: {
        address: { state: 'CA', ...initialData?.property?.address },
        type: 'apartment',
        bedrooms: 1,
        bathrooms: 1,
        ...initialData?.property,
      },
      landlord: {
        isEntity: false,
        ...initialData?.landlord,
      },
      tenants: [
        {
          name: '',
          email: '',
          phone: '',
          isMainTenant: true,
        },
        ...initialData?.tenants || [],
      ],
      leaseTerms: {
        type: 'fixed_term',
        currency: 'USD' as const,
        rentAmount: 0,
        dueDate: 1,
        lateFee: {
          enabled: false,
        },
        securityDeposit: {
          amount: 0,
          monthsRent: 1,
        },
        ...initialData?.leaseTerms,
      },
      policies: {
        pets: {
          allowed: false,
        },
        smoking: {
          allowed: false,
        },
        guests: {},
        maintenance: {
          tenantResponsibilities: [],
          landlordResponsibilities: [],
        },
        ...initialData?.policies,
      },
      options: {
        includeStateDisclosures: true,
        includeFederalDisclosures: true,
        includeSignaturePages: true,
        format: 'standard' as const,
        ...initialData?.options,
      },
    },
    mode: 'onBlur',
  })

  const { handleSubmit, formState: { isValid } } = methods
  
  const progress = ((currentStep + 1) / STEPS.length) * 100

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const onSubmit = (data: LeaseFormValues) => {
    if (currentStep === STEPS.length - 1) {
      onGenerate(data)
    } else {
      nextStep()
    }
  }

  const currentStepId = STEPS[currentStep]?.id

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Progress Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Generate Lease Agreement</h1>
            <p className="text-gray-600 mt-1">Create a legally compliant lease for any US state</p>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">Step {currentStep + 1} of {STEPS.length}</div>
            <div className="text-xs text-gray-500">{STEPS[currentStep]?.title}</div>
          </div>
        </div>
        
        <Progress value={progress} className="w-full" />
        
        {/* Step Navigation */}
        <div className="flex items-center justify-between">
          {STEPS?.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center space-x-2 ${
                index <= currentStep ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                index < currentStep 
                  ? 'bg-blue-600 text-white' 
                  : index === currentStep
                  ? 'bg-blue-100 text-blue-600 border-2 border-blue-600'
                  : 'bg-gray-200 text-gray-400'
              }`}>
                {index < currentStep ? <CheckCircle size={16} /> : index + 1}
              </div>
              <div className="hidden sm:block">
                <div className="font-medium text-sm">{step.title}</div>
                <div className="text-xs">{step.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card className="p-6">
            {/* Step Content will be rendered here */}
            <div className="min-h-96">
              {currentStepId === 'property' && (
                <PropertyDetailsStep />
              )}
              {currentStepId === 'landlord' && (
                <LandlordDetailsStep />
              )}
              {currentStepId === 'tenants' && (
                <TenantsDetailsStep />
              )}
              {currentStepId === 'terms' && (
                <LeaseTermsStep />
              )}
              {currentStepId === 'review' && (
                <ReviewStep />
              )}
            </div>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center space-x-2"
            >
              <ArrowLeft size={16} />
              <span>Previous</span>
            </Button>

            <Button
              type="submit"
              disabled={!isValid || isGenerating}
              className="flex items-center space-x-2 min-w-32"
            >
              {currentStep === STEPS.length - 1 ? (
                <>
                  <FileText size={16} />
                  <span>{isGenerating ? 'Generating...' : 'Generate Lease'}</span>
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ArrowRight size={16} />
                </>
              )}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  )
}

// Individual step components (placeholders for now)
function PropertyDetailsStep() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Property Information</h2>
      <p className="text-gray-600">Tell us about the rental property</p>
      {/* Property form fields will go here */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Property form fields coming soon...</p>
        </div>
      </div>
    </div>
  )
}

function LandlordDetailsStep() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Landlord Information</h2>
      <p className="text-gray-600">Property owner or manager details</p>
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600">Landlord form fields coming soon...</p>
      </div>
    </div>
  )
}

function TenantsDetailsStep() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Tenant Information</h2>
      <p className="text-gray-600">Information about the renters</p>
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600">Tenant form fields coming soon...</p>
      </div>
    </div>
  )
}

function LeaseTermsStep() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Lease Terms</h2>
      <p className="text-gray-600">Rent amount, dates, and lease conditions</p>
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600">Lease terms form fields coming soon...</p>
      </div>
    </div>
  )
}

function ReviewStep() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Review & Generate</h2>
      <p className="text-gray-600">Review all information before generating your lease</p>
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600">Review summary coming soon...</p>
      </div>
    </div>
  )
}