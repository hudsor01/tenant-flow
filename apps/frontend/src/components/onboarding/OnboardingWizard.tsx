import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FocusTrap } from '@/components/ui/focus-trap'
import { useAccessibility } from '@/hooks/use-accessibility'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
    CheckCircle2, 
    Circle, 
    ArrowLeft, 
    ArrowRight, 
    Home, 
    Users, 
    Settings,
    Star,
    PartyPopper,
    X
} from 'lucide-react'
import { useAuth } from '@/hooks/useApiAuth'
import { trpc } from '@/lib/utils/trpc'

interface OnboardingStep {
    id: string
    title: string
    description: string
    icon: React.ComponentType<{ className?: string }>
    content: React.ReactNode
    isCompleted: boolean
    canSkip: boolean
}

interface OnboardingWizardProps {
    isOpen: boolean
    onClose: () => void
    onComplete: () => void
}

export function OnboardingWizard({ isOpen, onClose, onComplete }: OnboardingWizardProps) {
    const [currentStep, setCurrentStep] = useState(0)
    const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
    const { announce } = useAccessibility()
    const { user } = useAuth()
    const { data: propertiesData } = trpc.properties.list.useQuery({})
    const { data: tenantsData } = trpc.tenants.list.useQuery({})
    
    const properties = propertiesData?.properties || []
    const tenants = tenantsData?.tenants || []

    // Check completion status for each step
    const stepCompletionStatus = {
        welcome: true, // Always completed after viewing
        profile: !!(user?.name && user?.email), // Completed if user has basic info
        property: properties.length > 0, // Completed if user has properties
        tenants: tenants.length > 0, // Completed if user has tenants
        success: false // Will be completed at the end
    }

    const steps: OnboardingStep[] = [
        {
            id: 'welcome',
            title: 'Welcome to TenantFlow!',
            description: 'Let\'s get you set up for property management success',
            icon: PartyPopper,
            canSkip: false,
            isCompleted: stepCompletionStatus.welcome,
            content: (
                <div className="text-center space-y-6">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                        <PartyPopper className="h-10 w-10 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-foreground mb-2">
                            Welcome, {user?.name || 'Property Manager'}! 🎉
                        </h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            We're excited to help you streamline your property management. 
                            This quick setup will have you managing properties like a pro in just a few minutes.
                        </p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4 text-left max-w-sm mx-auto">
                        <h4 className="font-semibold text-foreground mb-2">What we'll cover:</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                            <li className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                Set up your first property
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                Invite your first tenant
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                Explore key features
                            </li>
                        </ul>
                    </div>
                </div>
            )
        },
        {
            id: 'profile',
            title: 'Your Profile',
            description: 'Make sure your account information is complete',
            icon: Settings,
            canSkip: true,
            isCompleted: stepCompletionStatus.profile,
            content: (
                <div className="space-y-6">
                    <div className="text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                            <Settings className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">
                            Profile Setup
                        </h3>
                        <p className="text-muted-foreground">
                            Your profile information helps tenants and vendors contact you.
                        </p>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <p className="font-medium text-foreground">Name</p>
                                    <p className="text-sm text-muted-foreground">
                                        {user?.name || 'Not set'}
                                    </p>
                                </div>
                            </div>
                            {user?.name ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                                <Circle className="h-5 w-5 text-muted-foreground" />
                            )}
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <p className="font-medium text-foreground">Email</p>
                                    <p className="text-sm text-muted-foreground">
                                        {user?.email}
                                    </p>
                                </div>
                            </div>
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                        </div>
                    </div>
                    
                    {!stepCompletionStatus.profile && (
                        <div className="text-center">
                            <Button variant="outline" size="sm">
                                Update Profile
                            </Button>
                        </div>
                    )}
                </div>
            )
        },
        {
            id: 'property',
            title: 'Add Your First Property',
            description: 'Set up your first rental property to get started',
            icon: Home,
            canSkip: false,
            isCompleted: stepCompletionStatus.property,
            content: (
                <div className="space-y-6">
                    <div className="text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                            <Home className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">
                            Add Your First Property
                        </h3>
                        <p className="text-muted-foreground">
                            Properties are the foundation of your rental business. Let's add your first one!
                        </p>
                    </div>
                    
                    {properties.length > 0 ? (
                        <div className="text-center space-y-4">
                            <div className="flex items-center justify-center gap-2 text-green-600">
                                <CheckCircle2 className="h-5 w-5" />
                                <span className="font-medium">Great! You have {properties.length} property(ies)</span>
                            </div>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <p className="text-sm text-green-800">
                                    Your property "{properties[0]?.name}" is ready to go. 
                                    You can now invite tenants and manage maintenance requests.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-muted/30 rounded-lg p-4 text-center">
                                <p className="text-sm text-muted-foreground mb-3">
                                    Adding a property will unlock:
                                </p>
                                <ul className="space-y-2 text-sm text-muted-foreground text-left max-w-xs mx-auto">
                                    <li className="flex items-center gap-2">
                                        <Star className="h-4 w-4 text-yellow-500" />
                                        Tenant management
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Star className="h-4 w-4 text-yellow-500" />
                                        Maintenance tracking
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Star className="h-4 w-4 text-yellow-500" />
                                        Rent collection
                                    </li>
                                </ul>
                            </div>
                            <div className="text-center">
                                <Button className="w-full">
                                    <Home className="mr-2 h-4 w-4" />
                                    Add Your First Property
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )
        },
        {
            id: 'tenants',
            title: 'Invite Your First Tenant',
            description: 'Connect with your tenants for seamless communication',
            icon: Users,
            canSkip: true,
            isCompleted: stepCompletionStatus.tenants,
            content: (
                <div className="space-y-6">
                    <div className="text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                            <Users className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">
                            Invite Your First Tenant
                        </h3>
                        <p className="text-muted-foreground">
                            Give your tenants access to make payments, submit maintenance requests, and more.
                        </p>
                    </div>
                    
                    {tenants.length > 0 ? (
                        <div className="text-center space-y-4">
                            <div className="flex items-center justify-center gap-2 text-green-600">
                                <CheckCircle2 className="h-5 w-5" />
                                <span className="font-medium">Excellent! You have {tenants.length} tenant(s)</span>
                            </div>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <p className="text-sm text-green-800">
                                    Your tenants can now access their portal to make payments and submit requests.
                                </p>
                            </div>
                        </div>
                    ) : properties.length > 0 ? (
                        <div className="space-y-4">
                            <div className="bg-muted/30 rounded-lg p-4 text-center">
                                <p className="text-sm text-muted-foreground mb-3">
                                    Tenant portal benefits:
                                </p>
                                <ul className="space-y-2 text-sm text-muted-foreground text-left max-w-xs mx-auto">
                                    <li className="flex items-center gap-2">
                                        <Star className="h-4 w-4 text-blue-500" />
                                        Online rent payments
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Star className="h-4 w-4 text-blue-500" />
                                        Maintenance requests
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Star className="h-4 w-4 text-blue-500" />
                                        Document sharing
                                    </li>
                                </ul>
                            </div>
                            <div className="text-center">
                                <Button className="w-full">
                                    <Users className="mr-2 h-4 w-4" />
                                    Invite Your First Tenant
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                                Add a property first, then you can invite tenants to it.
                            </p>
                        </div>
                    )}
                </div>
            )
        },
        {
            id: 'success',
            title: 'You\'re All Set!',
            description: 'Congratulations on setting up TenantFlow!',
            icon: CheckCircle2,
            canSkip: false,
            isCompleted: false,
            content: (
                <div className="text-center space-y-6">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                        <CheckCircle2 className="h-10 w-10 text-green-600" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-foreground mb-2">
                            🎉 Congratulations!
                        </h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            You've successfully set up TenantFlow! You're now ready to manage your properties 
                            efficiently and provide an excellent experience for your tenants.
                        </p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4 text-left max-w-sm mx-auto">
                        <h4 className="font-semibold text-foreground mb-2">What's next?</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>• Explore your dashboard</li>
                            <li>• Set up rent collection</li>
                            <li>• Customize your tenant portal</li>
                            <li>• Add more properties as you grow</li>
                        </ul>
                    </div>
                    <Button onClick={onComplete} size="lg" className="w-full max-w-xs">
                        Go to Dashboard
                    </Button>
                </div>
            )
        }
    ]

    const currentStepData = steps[currentStep]
    const totalSteps = steps.length
    const progress = ((currentStep + 1) / totalSteps) * 100

    const handleNext = () => {
        if (currentStep < totalSteps - 1 && currentStepData) {
            setCompletedSteps((prev: Set<string>) => new Set([...prev, currentStepData.id]))
            setCurrentStep(currentStep + 1)
            const nextStep = steps[currentStep + 1]
            announce(`Moving to step ${currentStep + 2} of ${totalSteps}: ${nextStep?.title}`, 'polite')
        }
    }

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1)
            const prevStep = steps[currentStep - 1]
            announce(`Returned to step ${currentStep}: ${prevStep?.title}`, 'polite')
        }
    }

    const handleSkip = () => {
        if (currentStepData?.canSkip) {
            announce(`Skipped step: ${currentStepData.title}`, 'polite')
            handleNext()
        }
    }

    const canProceed = currentStepData?.isCompleted || currentStepData?.canSkip

    useEffect(() => {
        // Update completion status when data changes
        const newCompleted = new Set(completedSteps)
        if (stepCompletionStatus.profile) newCompleted.add('profile')
        if (stepCompletionStatus.property) newCompleted.add('property')
        if (stepCompletionStatus.tenants) newCompleted.add('tenants')
        setCompletedSteps(newCompleted)
    }, [stepCompletionStatus.profile, stepCompletionStatus.property, stepCompletionStatus.tenants, completedSteps])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <FocusTrap isActive={isOpen}>
                <div 
                    className="w-full max-w-2xl mx-4"
                    role="dialog"
                    aria-labelledby="wizard-title"
                    aria-describedby="wizard-description"
                    aria-modal="true"
                >
                <Card className="border-border bg-card shadow-2xl">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                    {currentStepData && <currentStepData.icon className="h-5 w-5 text-primary" />}
                                </div>
                                <div>
                                    <CardTitle id="wizard-title" className="text-xl">{currentStepData?.title}</CardTitle>
                                    <CardDescription id="wizard-description">{currentStepData?.description}</CardDescription>
                                </div>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => {
                                    announce('Onboarding wizard closed', 'polite')
                                    onClose()
                                }}
                                aria-label="Close onboarding wizard"
                            >
                                <X className="h-4 w-4" aria-hidden="true" />
                            </Button>
                        </div>
                        
                        <div className="space-y-2 mt-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Step {currentStep + 1} of {totalSteps}
                                </span>
                                <span className="text-muted-foreground">
                                    {Math.round(progress)}% complete
                                </span>
                            </div>
                            <Progress value={progress} className="h-2" />
                        </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-6">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="min-h-[300px]"
                            >
                                {currentStepData?.content}
                            </motion.div>
                        </AnimatePresence>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-border">
                            <Button
                                variant="outline"
                                onClick={handlePrevious}
                                disabled={currentStep === 0}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Previous
                            </Button>
                            
                            <div className="flex items-center gap-2">
                                {currentStepData?.canSkip && !currentStepData?.isCompleted && (
                                    <Button variant="ghost" onClick={handleSkip}>
                                        Skip
                                    </Button>
                                )}
                                
                                {currentStep === totalSteps - 1 ? (
                                    <Button onClick={onComplete}>
                                        Complete Setup
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleNext}
                                        disabled={!canProceed}
                                    >
                                        Next
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
                </div>
            </FocusTrap>
        </div>
    )
}