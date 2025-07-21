import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { usePostHog } from 'posthog-js/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    FileText,
    Download,
    Building,
    User,
    DollarSign,
    CheckCircle,
    CreditCard,
    Loader2,
    AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import type { LeaseGeneratorForm, LeaseOutputFormat } from '@/types/lease-generator'
import { PropertyInfoSection } from './sections/PropertyInfoSection'
import { PartiesInfoSection } from './sections/PartiesInfoSection'
import { LeaseTermsSection } from './sections/LeaseTermsSection'
import { AdditionalTermsSection } from './sections/AdditionalTermsSection'
import { getAllStates, getStateFromSlug } from '@/lib/state-data'
import { generateStateLease } from '@/lib/lease-templates/state-lease-generator'

const leaseSchema = z.object({
    // Property Information
    propertyAddress: z.string().min(1, 'Property address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(2, 'State is required'),
    zipCode: z.string().min(5, 'Valid ZIP code is required'),
    unitNumber: z.string().optional(),

    // Landlord Information
    landlordName: z.string().min(1, 'Landlord name is required'),
    landlordEmail: z.string().email('Valid email is required'),
    landlordPhone: z.string().optional(),
    landlordAddress: z.string().min(1, 'Landlord address is required'),

    // Tenant Information
    tenantNames: z
        .array(z.object({ name: z.string().min(1, 'Tenant name is required') }))
        .min(1, 'At least one tenant is required'),

    // Lease Terms
    rentAmount: z.number().min(1, 'Rent amount must be greater than 0'),
    securityDeposit: z.number().min(0, 'Security deposit cannot be negative'),
    leaseStartDate: z.string().min(1, 'Lease start date is required'),
    leaseEndDate: z.string().min(1, 'Lease end date is required'),

    // Payment Information
    paymentDueDate: z.number().min(1).max(31),
    lateFeeAmount: z.number().min(0),
    lateFeeDays: z.number().min(1),
    paymentMethod: z.enum(['check', 'online', 'bank_transfer', 'cash']),
    paymentAddress: z.string().optional(),

    // Additional Terms
    petPolicy: z.enum(['allowed', 'not_allowed', 'with_deposit']),
    petDeposit: z.number().optional(),
    smokingPolicy: z.enum(['allowed', 'not_allowed']),
    maintenanceResponsibility: z.enum(['landlord', 'tenant', 'shared']),
    utilitiesIncluded: z.array(z.string()),
    additionalTerms: z.string().optional()
})

interface LeaseGeneratorFormProps {
    onGenerate: (data: LeaseGeneratorForm, format: LeaseOutputFormat) => Promise<void>
    isGenerating: boolean
    usageRemaining: number
    requiresPayment: boolean
}

const SUPPORTED_STATES_AND_REGIONS = getAllStates()

export default function LeaseGeneratorFormRefactored({
    onGenerate,
    isGenerating,
    usageRemaining,
    requiresPayment
}: LeaseGeneratorFormProps) {
    const [selectedFormat, setSelectedFormat] = useState<LeaseOutputFormat>('pdf')
    const [selectedUtilities, setSelectedUtilities] = useState<string[]>([])
    const posthog = usePostHog()

    // Track form view on mount
    useEffect(() => {
        posthog?.capture('lease_generator_form_viewed', {
            usage_remaining: usageRemaining,
            requires_payment: requiresPayment,
            timestamp: new Date().toISOString()
        })
    }, [posthog, usageRemaining, requiresPayment])

    // Define available utilities options
    const utilitiesOptions = [
        'Water',
        'Electricity',
        'Gas',
        'Internet',
        'Cable/TV',
        'Trash/Recycling',
        'Sewer',
        'Heating',
        'Air Conditioning',
        'Lawn Care',
        'Snow Removal'
    ]

    type FormData = z.infer<typeof leaseSchema>

    const form = useForm<FormData>({
        resolver: zodResolver(leaseSchema),
        defaultValues: {
            tenantNames: [{ name: '' }],
            paymentDueDate: 1,
            lateFeeAmount: 50,
            lateFeeDays: 5,
            paymentMethod: 'check',
            petPolicy: 'not_allowed',
            smokingPolicy: 'not_allowed',
            maintenanceResponsibility: 'landlord',
            utilitiesIncluded: [],
            rentAmount: 0,
            securityDeposit: 0
        }
    })

    const handleUtilityToggle = (utility: string) => {
        const updated = selectedUtilities.includes(utility)
            ? selectedUtilities.filter(u => u !== utility)
            : [...selectedUtilities, utility]

        setSelectedUtilities(updated)
        form.setValue('utilitiesIncluded', updated)
    }

    const handleSubmit = async (data: FormData) => {
        // Track form submission attempt
        posthog?.capture('lease_generator_form_submitted', {
            format: selectedFormat,
            tenant_count: data.tenantNames.length,
            rent_amount: data.rentAmount,
            security_deposit: data.securityDeposit,
            payment_method: data.paymentMethod,
            pet_policy: data.petPolicy,
            smoking_policy: data.smokingPolicy,
            utilities_count: data.utilitiesIncluded.length,
            state: data.state,
            requires_payment: requiresPayment,
            usage_remaining: usageRemaining,
            timestamp: new Date().toISOString()
        })

        if (requiresPayment) {
            posthog?.capture('lease_generator_payment_required', {
                format: selectedFormat,
                timestamp: new Date().toISOString()
            })

            toast.error('Payment required to generate additional leases')
            return
        }

        try {
            // Convert tenant names array to the expected format for the lease generator
            const tenantNamesForLeaseGenerator = data.tenantNames
                .filter(tenant => tenant.name.trim() !== '')
                .map(tenant => tenant.name.trim())

            // Map format to what the lease generator expects
            const formatForGenerator =
                selectedFormat === 'both'
                    ? 'pdf'
                    : (selectedFormat as 'pdf' | 'docx' | 'html')

            // Generate state-compliant lease
            const leaseResult = generateStateLease({
                data: {
                    propertyAddress: data.propertyAddress,
                    city: data.city,
                    state: data.state,
                    zipCode: data.zipCode,
                    unitNumber: data.unitNumber,
                    landlordName: data.landlordName,
                    landlordEmail: data.landlordEmail,
                    landlordPhone: data.landlordPhone,
                    landlordAddress: data.landlordAddress,
                    tenantNames: tenantNamesForLeaseGenerator,
                    rentAmount: data.rentAmount,
                    securityDeposit: data.securityDeposit,
                    leaseStartDate: data.leaseStartDate,
                    leaseEndDate: data.leaseEndDate,
                    paymentDueDate: data.paymentDueDate,
                    lateFeeAmount: data.lateFeeAmount,
                    lateFeeDays: data.lateFeeDays,
                    paymentMethod: data.paymentMethod,
                    paymentAddress: data.paymentAddress,
                    petPolicy: data.petPolicy,
                    petDeposit: data.petDeposit,
                    smokingPolicy: data.smokingPolicy,
                    maintenanceResponsibility: data.maintenanceResponsibility,
                    utilitiesIncluded: data.utilitiesIncluded,
                    additionalTerms: data.additionalTerms
                },
                stateKey: data.state,
                format: formatForGenerator
            })

            // Show warnings if any
            if (leaseResult.warnings.length > 0) {
                leaseResult.warnings.forEach(warning => {
                    toast.warning(warning)
                })
            }

            // Form data is already in the correct format (tenantNames: { name: string }[])
            const formDataForGenerator: LeaseGeneratorForm = {
                ...data,
                tenantNames: data.tenantNames.filter(
                    tenant => tenant.name.trim() !== ''
                )
            }

            await onGenerate(formDataForGenerator, selectedFormat)

            // Track successful generation
            posthog?.capture('lease_generator_success', {
                format: selectedFormat,
                tenant_count: data.tenantNames.length,
                rent_amount: data.rentAmount,
                state: data.state,
                is_compliant: leaseResult.isCompliant,
                warnings_count: leaseResult.warnings.length,
                timestamp: new Date().toISOString()
            })

            toast.success(
                `${getStateFromSlug(data.state)?.name} lease agreement generated successfully!`
            )
        } catch (error) {
            // Track generation failure
            posthog?.capture('lease_generator_error', {
                format: selectedFormat,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            })

            toast.error('Failed to generate lease agreement')
            console.error('Lease generation error:', error)
        }
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            {/* Usage Status Header */}
            <Card className="border-primary/20">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <FileText className="text-primary h-6 w-6" />
                            <div>
                                <CardTitle>
                                    Free Lease Agreement Generator
                                </CardTitle>
                                <CardDescription>
                                    Generate lease agreements instantly
                                </CardDescription>
                            </div>
                        </div>
                        <div className="text-right">
                            {usageRemaining > 0 ? (
                                <Badge variant="secondary" className="text-sm">
                                    <CheckCircle className="mr-1 h-4 w-4" />
                                    {usageRemaining} free use
                                    {usageRemaining > 1 ? 's' : ''} remaining
                                </Badge>
                            ) : (
                                <Badge
                                    variant="destructive"
                                    className="text-sm"
                                >
                                    <CreditCard className="mr-1 h-4 w-4" />
                                    Payment required
                                </Badge>
                            )}
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-6"
            >
                <Tabs
                    defaultValue="property"
                    className="space-y-6"
                    onValueChange={(value: string) => {
                        posthog?.capture('lease_generator_tab_changed', {
                            tab: value,
                            timestamp: new Date().toISOString()
                        })
                    }}
                >
                    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                        <TabsTrigger
                            value="property"
                            className="flex items-center gap-2"
                        >
                            <Building className="h-4 w-4" />
                            Property
                        </TabsTrigger>
                        <TabsTrigger
                            value="parties"
                            className="flex items-center gap-2"
                        >
                            <User className="h-4 w-4" />
                            Parties
                        </TabsTrigger>
                        <TabsTrigger
                            value="terms"
                            className="flex items-center gap-2"
                        >
                            <DollarSign className="h-4 w-4" />
                            Terms
                        </TabsTrigger>
                        <TabsTrigger
                            value="additional"
                            className="flex items-center gap-2"
                        >
                            <FileText className="h-4 w-4" />
                            Additional
                        </TabsTrigger>
                    </TabsList>

                    {/* Property Information */}
                    <TabsContent value="property">
                        <PropertyInfoSection 
                            form={form} 
                            supportedStates={SUPPORTED_STATES_AND_REGIONS} 
                        />
                    </TabsContent>

                    {/* Parties Information */}
                    <TabsContent value="parties">
                        <PartiesInfoSection form={form} />
                    </TabsContent>

                    {/* Lease Terms */}
                    <TabsContent value="terms">
                        <LeaseTermsSection form={form} />
                    </TabsContent>

                    {/* Additional Terms */}
                    <TabsContent value="additional">
                        <AdditionalTermsSection
                            form={form}
                            utilitiesOptions={utilitiesOptions as string[]}
                            selectedUtilities={selectedUtilities}
                            handleUtilityToggle={
                                handleUtilityToggle as (utility: string) => void
                            }
                            selectedFormat={selectedFormat}
                            setSelectedFormat={
                                setSelectedFormat as React.Dispatch<
                                    React.SetStateAction<LeaseOutputFormat>
                                >
                            }
                        />
                    </TabsContent>
                </Tabs>

                {/* Generate Button */}
                <Card className="border-primary/20">
                    <CardContent className="pt-6">
                        <div className="space-y-4 text-center">
                            {requiresPayment && (
                                <div className="bg-destructive/10 border-destructive/20 rounded-lg border p-4">
                                    <div className="text-destructive flex items-center justify-center gap-2">
                                        <AlertTriangle className="h-5 w-5" />
                                        <span className="font-medium">
                                            Payment Required
                                        </span>
                                    </div>
                                    <p className="text-muted-foreground mt-2 text-sm">
                                        You've used your free lease generation.
                                        Pay $9.99 to generate unlimited leases
                                        for 24 hours.
                                    </p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                size="lg"
                                className="w-full px-12 md:w-auto"
                                disabled={isGenerating || requiresPayment}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Generating Lease...
                                    </>
                                ) : requiresPayment ? (
                                    <>
                                        <CreditCard className="mr-2 h-5 w-5" />
                                        Payment Required - $9.99
                                    </>
                                ) : (
                                    <>
                                        <Download className="mr-2 h-5 w-5" />
                                        Generate Lease Agreement
                                    </>
                                )}
                            </Button>

                            {!requiresPayment && usageRemaining === 1 && (
                                <p className="text-muted-foreground text-sm">
                                    This is your free trial. Additional leases
                                    require payment.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    )
}