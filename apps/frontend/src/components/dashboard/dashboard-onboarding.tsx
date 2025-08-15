'use client'

import { useState, useEffect } from 'react'
import { useDashboardStats } from '@/hooks/api/use-dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Sparkles, CheckCircle2, Building2, Users, FileText, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * Onboarding progress hook
 * Extracted from massive dashboard client component
 */
function useOnboardingProgress() {
  const { data: stats } = useDashboardStats()
  const [dismissed, setDismissed] = useState(false)
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissedKey = 'onboarding-dismissed'
      setDismissed(localStorage.getItem(dismissedKey) === 'true')
    }
  }, [])
  
  const steps = [
    { 
      id: 'property', 
      label: 'Add a property', 
      completed: (stats?.properties?.totalProperties || 0) > 0,
      href: '/properties/new',
      icon: Building2
    },
    { 
      id: 'tenant', 
      label: 'Add a tenant', 
      completed: (stats?.tenants?.totalTenants || 0) > 0,
      href: '/tenants/new',
      icon: Users
    },
    { 
      id: 'lease', 
      label: 'Create a lease', 
      completed: (stats?.leases?.totalLeases || 0) > 0,
      href: '/leases/new',
      icon: FileText
    }
  ]

  const completedSteps = steps.filter(step => step.completed).length
  const totalSteps = steps.length
  const isComplete = completedSteps === totalSteps
  const progressPercentage = (completedSteps / totalSteps) * 100

  const dismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding-dismissed', 'true')
      setDismissed(true)
    }
  }

  return {
    steps,
    completedSteps,
    totalSteps,
    isComplete,
    progressPercentage,
    dismissed,
    dismiss
  }
}

/**
 * Onboarding Component
 * Focused component for dashboard onboarding flow
 */
export function DashboardOnboarding() {
  const { steps, completedSteps, totalSteps, isComplete, progressPercentage, dismissed, dismiss } = useOnboardingProgress()

  if (dismissed || isComplete) {
    return null
  }

  return (
    <Card className="card-modern relative overflow-hidden border-blue-200 bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-purple-50/60 dark:border-blue-800 dark:from-blue-950/40 dark:via-indigo-950/20 dark:to-purple-950/30">
      {/* Animated background elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-2xl animate-pulse" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-indigo-400/10 to-blue-400/10 rounded-full blur-xl animate-pulse delay-1000" />
      
      <CardHeader className="pb-4 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-blue-200">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">Welcome to TenantFlow!</CardTitle>
              <CardDescription className="text-sm font-medium">
                Let's get your property management set up in {totalSteps} quick steps.
              </CardDescription>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={dismiss}
            className="btn-modern text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 relative">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Setup Progress</span>
            <span className="text-sm font-medium text-muted-foreground">
              {completedSteps} of {totalSteps} completed
            </span>
          </div>
          <div className="space-y-2">
            <Progress 
              value={progressPercentage} 
              className="h-3 bg-blue-100 dark:bg-blue-950/50" 
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Getting started</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
          </div>
        </div>
        
        <div className="grid gap-3">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div
                key={step.id}
                className={cn(
                  "group relative flex items-center justify-between p-4 rounded-xl transition-all duration-300",
                  "border backdrop-blur-sm",
                  step.completed 
                    ? "bg-green-50/80 border-green-300 shadow-sm" 
                    : "bg-background/80 border-border hover:border-primary/30 hover:bg-muted/30 hover:shadow-md hover:-translate-y-0.5"
                )}
              >
                {/* Step number indicator */}
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background border-2 border-border flex items-center justify-center text-xs font-bold">
                  {step.completed ? (
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                  ) : (
                    <span className="text-muted-foreground">{index + 1}</span>
                  )}
                </div>
                
                <div className="flex items-center gap-4 ml-4">
                  <div className={cn(
                    "p-2 rounded-lg transition-all duration-300",
                    step.completed 
                      ? "bg-green-100 border border-green-200" 
                      : "bg-primary/10 border border-primary/20 group-hover:bg-primary/20"
                  )}>
                    <Icon className={cn(
                      "h-4 w-4 transition-colors duration-300",
                      step.completed 
                        ? "text-green-600" 
                        : "text-primary group-hover:text-primary/80"
                    )} />
                  </div>
                  <div>
                    <span className={cn(
                      "text-sm font-semibold transition-colors duration-300",
                      step.completed 
                        ? "text-green-700 dark:text-green-400" 
                        : "text-foreground"
                    )}>
                      {step.label}
                    </span>
                    {step.completed && (
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                        Completed ✓
                      </p>
                    )}
                  </div>
                </div>
                
                {!step.completed && (
                  <Button 
                    asChild 
                    size="sm" 
                    className="btn-modern bg-primary/10 hover:bg-primary/20 text-primary border-primary/30 hover:border-primary/50"
                  >
                    <Link href={step.href} className="focus-modern">
                      Start
                      <ArrowRight className="ml-2 h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}