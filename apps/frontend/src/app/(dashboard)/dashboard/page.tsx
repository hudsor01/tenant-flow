'use client'

import { useDashboardStats } from '@/hooks/api/use-dashboard'
import { useProperties } from '@/hooks/api/use-properties'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  AlertTriangle, 
  Building2, 
  Users, 
  FileText, 
  Wrench,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Home,
  TrendingUp,
  Calendar
} from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { DashboardErrorBoundary } from '@/components/dashboard/dashboard-error-boundary'

// First-time user detection and progress tracking
function useOnboardingProgress() {
  const { data: stats } = useDashboardStats()
  const [dismissed, setDismissed] = useState(false)
  
  useEffect(() => {
    const dismissedKey = 'onboarding-dismissed'
    setDismissed(localStorage.getItem(dismissedKey) === 'true')
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
      completed: (stats?.leases?.activeLeases || 0) > 0,
      href: '/leases/new',
      icon: FileText
    }
  ]
  
  const completedSteps = steps.filter(s => s.completed).length
  const progress = (completedSteps / steps.length) * 100
  const isNewUser = completedSteps === 0
  const isPartiallyComplete = completedSteps > 0 && completedSteps < steps.length
  
  const dismissOnboarding = () => {
    localStorage.setItem('onboarding-dismissed', 'true')
    setDismissed(true)
  }
  
  return {
    steps,
    progress,
    isNewUser,
    isPartiallyComplete,
    completedSteps,
    dismissed,
    dismissOnboarding
  }
}

// Enhanced onboarding banner for first-time users
function OnboardingBanner() {
  const { steps, progress, isNewUser, isPartiallyComplete, completedSteps, dismissed, dismissOnboarding } = useOnboardingProgress()
  
  if (dismissed || (!isNewUser && !isPartiallyComplete)) {
    return null
  }
  
  return (
    <Card className={cn(
      "border-2 transition-all duration-300",
      isNewUser ? "border-primary/50 bg-primary/5" : "border-green-500/50 bg-green-50/50 dark:bg-green-950/20"
    )}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              {isNewUser ? (
                <>
                  <Sparkles className="h-5 w-5 text-primary" />
                  Welcome to TenantFlow!
                </>
              ) : (
                <>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Great progress!
                </>
              )}
            </CardTitle>
            <CardDescription>
              {isNewUser 
                ? "Let's get your property management system set up in just 3 steps"
                : `You're ${completedSteps} of 3 steps into your setup`
              }
            </CardDescription>
          </div>
          {!isNewUser && (
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissOnboarding}
              className="text-muted-foreground hover:text-foreground"
            >
              Dismiss
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress} className="h-2" />
        
        <div className="grid gap-3 md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isNext = !step.completed && steps.slice(0, index).every(s => s.completed)
            
            return (
              <Link
                key={step.id}
                href={step.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg border p-3 transition-all",
                  step.completed 
                    ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" 
                    : isNext
                    ? "border-primary/50 bg-primary/5 hover:bg-primary/10"
                    : "border-muted bg-muted/30 opacity-60"
                )}
              >
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  step.completed 
                    ? "bg-green-500 text-white" 
                    : isNext
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted-foreground/20"
                )}>
                  {step.completed ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={cn(
                    "font-medium",
                    step.completed ? "text-green-700 dark:text-green-400" : ""
                  )}>
                    {step.label}
                  </p>
                  {step.completed ? (
                    <p className="text-xs text-muted-foreground">Completed</p>
                  ) : isNext ? (
                    <p className="text-xs text-primary">Start now →</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Upcoming</p>
                  )}
                </div>
                {isNext && (
                  <ArrowRight className="h-4 w-4 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                )}
              </Link>
            )
          })}
        </div>
        
        {isNewUser && (
          <Alert className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900 dark:text-blue-200">Pro Tip</AlertTitle>
            <AlertDescription className="text-blue-800 dark:text-blue-300">
              Complete these steps to unlock the full power of TenantFlow. It takes less than 5 minutes!
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

// Enhanced stats cards with better empty states
function DashboardStats() {
  const { data: stats, isLoading, error } = useDashboardStats({
    refetchInterval: 5 * 60 * 1000 // Refetch every 5 minutes
  })
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load dashboard statistics. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    )
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[100px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[80px] mb-2" />
              <Skeleton className="h-3 w-[120px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }
  
  const hasData = (stats?.properties?.totalProperties || 0) > 0
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className={cn(
        "transition-all",
        !hasData && "hover:border-primary/50 hover:bg-primary/5"
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.properties?.totalProperties || 0}</div>
          {hasData ? (
            <p className="text-xs text-muted-foreground">
              {stats?.properties?.occupancyRate || 0}% occupancy rate
            </p>
          ) : (
            <Link href="/properties/new" className="text-xs text-primary hover:underline">
              Add your first property →
            </Link>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.tenants?.totalTenants || 0}</div>
          <p className="text-xs text-muted-foreground">
            {stats?.leases?.activeLeases || 0} active leases
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Leases</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.leases?.activeLeases || 0}</div>
          <p className="text-xs text-muted-foreground">
            {stats?.leases?.expiredLeases || 0} expired leases
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
          <Wrench className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.maintenanceRequests?.open || 0}</div>
          <p className="text-xs text-muted-foreground">
            Pending requests
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// Enhanced recent properties with better empty state
function RecentProperties() {
  const { data: properties, isLoading, error } = useProperties({ limit: 5 })
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Properties</CardTitle>
          <CardDescription>
            Your most recently added properties
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load properties. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Properties</CardTitle>
        <CardDescription>
          Your most recently added properties
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex-1">
                  <Skeleton className="h-4 w-[200px] mb-2" />
                  <Skeleton className="h-3 w-[300px]" />
                </div>
                <Skeleton className="h-8 w-[60px]" />
              </div>
            ))
          ) : properties?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-primary/10 p-3 mb-4">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">No properties yet</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-[250px]">
                Start by adding your first property to begin managing your real estate portfolio
              </p>
              <Link href="/properties/new">
                <Button>
                  <Building2 className="mr-2 h-4 w-4" />
                  Add Your First Property
                </Button>
              </Link>
            </div>
          ) : (
            properties?.map((property) => (
              <div key={property.id} className="flex items-center justify-between group">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 mt-0.5">
                    <Home className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium group-hover:text-primary transition-colors">
                      {property.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {property.address}, {property.city}, {property.state}
                    </p>
                    {property.units && property.units.length > 0 && (
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {property.units.length} units
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
                <Link href={`/properties/${property.id}`}>
                  <Button variant="outline" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    View
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Quick actions with helpful descriptions
function QuickActions() {
  const actions = [
    {
      label: 'Add New Property',
      description: 'Register a property to manage',
      href: '/properties/new',
      icon: Building2,
      color: 'text-blue-600'
    },
    {
      label: 'Add New Tenant',
      description: 'Create tenant profiles',
      href: '/tenants/new',
      icon: Users,
      color: 'text-green-600'
    },
    {
      label: 'Create New Lease',
      description: 'Set up lease agreements',
      href: '/leases/new',
      icon: FileText,
      color: 'text-purple-600'
    },
    {
      label: 'Maintenance Requests',
      description: 'View and manage repairs',
      href: '/maintenance',
      icon: Wrench,
      color: 'text-orange-600'
    }
  ]
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks and workflows</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Link key={action.href} href={action.href} className="block">
              <Button 
                variant="outline" 
                className="w-full justify-start h-auto py-3 px-3 hover:bg-primary/5 hover:border-primary/50 transition-all group"
              >
                <div className={cn("rounded-lg bg-background p-2 mr-3", action.color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <div className="font-medium group-hover:text-primary transition-colors">
                    {action.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {action.description}
                  </div>
                </div>
              </Button>
            </Link>
          )
        })}
      </CardContent>
    </Card>
  )
}

// Upcoming events placeholder (for future implementation)
function UpcomingEvents() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Events</CardTitle>
        <CardDescription>Important dates and deadlines</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="rounded-full bg-muted p-3 mb-4">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground max-w-[200px]">
            Lease expirations and rent due dates will appear here
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function DashboardContent() {
  const { data: stats } = useDashboardStats()
  const isNewUser = (stats?.properties?.totalProperties || 0) === 0
  
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            {isNewUser 
              ? "Welcome! Let's get your property management started"
              : "Manage your properties, tenants, and leases"
            }
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link href="/properties/new">
            <Button>
              <Building2 className="mr-2 h-4 w-4" />
              Add Property
            </Button>
          </Link>
        </div>
      </div>
      
      <OnboardingBanner />
      
      <DashboardStats />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 space-y-4">
          <RecentProperties />
          <UpcomingEvents />
        </div>
        <div className="col-span-3">
          <QuickActions />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <DashboardErrorBoundary>
      <DashboardContent />
    </DashboardErrorBoundary>
  )
}