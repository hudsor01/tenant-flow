/**
 * Onboarding Wizard - MVP First-Time User Experience
 * 
 * Simple, effective onboarding without sophistication
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Building2, 
  Users, 
  FileText, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Home
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ElementType
  action: string
  href: string
  completed: boolean
}

export function OnboardingWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [skipped, setSkipped] = useState(false)
  
  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to TenantFlow!',
      description: 'Let\'s get your property management system set up in just a few steps.',
      icon: Sparkles,
      action: 'Get Started',
      href: '#',
      completed: false
    },
    {
      id: 'property',
      title: 'Add Your First Property',
      description: 'Start by adding a property you manage. You can add more later.',
      icon: Building2,
      action: 'Add Property',
      href: '/properties/new',
      completed: false
    },
    {
      id: 'units',
      title: 'Set Up Units',
      description: 'Add units or rooms to your property for detailed management.',
      icon: Home,
      action: 'Add Units',
      href: '/properties',
      completed: false
    },
    {
      id: 'tenants',
      title: 'Add Tenants',
      description: 'Add your current tenants to start tracking leases and payments.',
      icon: Users,
      action: 'Add Tenant',
      href: '/tenants/new',
      completed: false
    },
    {
      id: 'lease',
      title: 'Create a Lease',
      description: 'Set up lease agreements to track rent and tenant information.',
      icon: FileText,
      action: 'Create Lease',
      href: '/leases/new',
      completed: false
    },
    {
      id: 'complete',
      title: 'You\'re All Set!',
      description: 'Your property management system is ready. Explore the dashboard to see everything in action.',
      icon: CheckCircle2,
      action: 'Go to Dashboard',
      href: '/dashboard',
      completed: false
    }
  ]
  
  const progress = ((currentStep + 1) / steps.length) * 100
  const step = steps[currentStep]
  const Icon = step.icon
  
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }
  
  const handleSkip = () => {
    setSkipped(true)
    router.push('/dashboard')
  }
  
  const handleAction = () => {
    if (step.href === '#') {
      handleNext()
    } else {
      router.push(step.href)
    }
  }
  
  if (skipped) {
    return null
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">{step.title}</CardTitle>
          <CardDescription className="text-base mt-2">
            {step.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Progress value={progress} className="mb-8" />
          
          {currentStep === 0 && (
            <div className="space-y-4">
              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertDescription>
                  TenantFlow helps you manage properties, tenants, and leases all in one place.
                  This quick setup will have you running in under 5 minutes.
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="text-center p-4">
                  <Building2 className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <div className="font-medium">Properties</div>
                  <div className="text-sm text-muted-foreground">Manage all your properties</div>
                </div>
                <div className="text-center p-4">
                  <Users className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <div className="font-medium">Tenants</div>
                  <div className="text-sm text-muted-foreground">Track tenant information</div>
                </div>
                <div className="text-center p-4">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <div className="font-medium">Leases</div>
                  <div className="text-sm text-muted-foreground">Handle lease agreements</div>
                </div>
              </div>
            </div>
          )}
          
          {currentStep === steps.length - 1 && (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  Congratulations! Your property management system is ready to use.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3 mt-6">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span>Property management system configured</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span>Ready to add properties and tenants</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span>Dashboard and reports available</span>
                </div>
              </div>
            </div>
          )}
          
          {currentStep > 0 && currentStep < steps.length - 1 && (
            <div className="bg-muted/50 rounded-lg p-6 text-center">
              <Icon className="h-12 w-12 mx-auto mb-4 text-primary" />
              <p className="text-sm text-muted-foreground">
                Click the button below to {step.action.toLowerCase()}
              </p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-muted-foreground"
          >
            Skip Setup
          </Button>
          
          <div className="flex gap-2">
            {currentStep > 0 && currentStep < steps.length - 1 && (
              <Button
                variant="outline"
                onClick={handleNext}
              >
                I'll do this later
              </Button>
            )}
            
            <Button onClick={handleAction}>
              {step.action}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}