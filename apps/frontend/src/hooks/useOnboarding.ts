import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useApiAuth'
import { trpc } from '@/lib/utils/trpc'

export interface OnboardingState {
    hasCompletedWizard: boolean
    hasSeenQuickStart: boolean
    completedTours: Set<string>
    dismissedCards: Set<string>
    currentStep: string | null
    isFirstVisit: boolean
}

export interface OnboardingProgress {
    profileComplete: boolean
    hasProperties: boolean
    hasTenants: boolean
    hasMaintenanceRequests: boolean
    hasSetupPayments: boolean
    overallProgress: number
}

// Define available tours
export const TOUR_DEFINITIONS = {
    'dashboard-overview': {
        id: 'dashboard-overview',
        name: 'Dashboard Overview',
        description: 'Learn your way around the dashboard',
        steps: [
            {
                id: 'welcome',
                target: '[data-tour="dashboard-header"]',
                title: 'Welcome to Your Dashboard',
                content: 'This is your command center for managing all your properties and tenants.',
                placement: 'bottom' as const
            },
            {
                id: 'stats',
                target: '[data-tour="stats-cards"]',
                title: 'Key Metrics at a Glance',
                content: 'Monitor your revenue, tenant count, and maintenance requests here.',
                placement: 'bottom' as const
            },
            {
                id: 'quick-actions',
                target: '[data-tour="quick-actions"]',
                title: 'Quick Actions',
                content: 'Access common tasks like adding properties or inviting tenants.',
                placement: 'left' as const
            },
            {
                id: 'activity-feed',
                target: '[data-tour="activity-feed"]',
                title: 'Recent Activity',
                content: 'Stay updated with the latest actions and alerts from your properties.',
                placement: 'top' as const
            }
        ]
    },
    'property-management': {
        id: 'property-management',
        name: 'Property Management',
        description: 'Learn how to add and manage properties',
        steps: [
            {
                id: 'add-property-button',
                target: '[data-testid="add-property-button"]',
                title: 'Adding Properties',
                content: 'Click here to add your first property. You\'ll need basic details like address and rent.',
                placement: 'bottom' as const
            },
            {
                id: 'property-list',
                target: '[data-tour="properties-list"]',
                title: 'Property Overview',
                content: 'All your properties are listed here with key information and quick actions.',
                placement: 'top' as const
            }
        ]
    },
    'tenant-portal': {
        id: 'tenant-portal',
        name: 'Tenant Portal',
        description: 'Set up tenant access and communication',
        steps: [
            {
                id: 'invite-tenant',
                target: '[data-tour="invite-tenant"]',
                title: 'Inviting Tenants',
                content: 'Send invitations to give tenants access to their portal for payments and requests.',
                placement: 'bottom' as const
            },
            {
                id: 'tenant-management',
                target: '[data-tour="tenant-list"]',
                title: 'Tenant Management',
                content: 'View tenant information, lease details, and communication history.',
                placement: 'top' as const
            }
        ]
    }
}

export function useOnboarding() {
    const { user } = useAuth()
    const { data: propertiesData } = trpc.properties.list.useQuery({})
    const { data: tenantsData } = trpc.tenants.list.useQuery({})
    const { data: maintenanceData } = trpc.maintenance.list.useQuery({})

    // Core onboarding state
    const [onboardingState, setOnboardingState] = useState<OnboardingState>({
        hasCompletedWizard: false,
        hasSeenQuickStart: false,
        completedTours: new Set(),
        dismissedCards: new Set(),
        currentStep: null,
        isFirstVisit: true
    })

    // Wizard and tour visibility
    const [showWizard, setShowWizard] = useState(false)
    const [activeTour, setActiveTour] = useState<string | null>(null)
    const [showQuickStart, setShowQuickStart] = useState(false)

    // Load saved onboarding state from localStorage
    useEffect(() => {
        const savedState = localStorage.getItem('tenantflow-onboarding')
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState)
                setOnboardingState({
                    ...parsed,
                    completedTours: new Set(parsed.completedTours || []),
                    dismissedCards: new Set(parsed.dismissedCards || [])
                })
            } catch (error) {
                console.warn('Failed to parse onboarding state:', error)
            }
        }
    }, [])

    // Save onboarding state to localStorage
    const saveOnboardingState = useCallback((newState: Partial<OnboardingState>) => {
        const updatedState = { ...onboardingState, ...newState }
        setOnboardingState(updatedState)
        
        const stateToSave = {
            ...updatedState,
            completedTours: [...updatedState.completedTours],
            dismissedCards: [...updatedState.dismissedCards]
        }
        localStorage.setItem('tenantflow-onboarding', JSON.stringify(stateToSave))
    }, [onboardingState])

    // Calculate onboarding progress
    const getOnboardingProgress = useCallback((): OnboardingProgress => {
        const properties = propertiesData?.properties || []
        const tenants = tenantsData?.tenants || []
        const maintenanceRequests = Array.isArray(maintenanceData) ? maintenanceData : []

        const progress = {
            profileComplete: !!(user?.name && user?.email),
            hasProperties: properties.length > 0,
            hasTenants: tenants.length > 0,
            hasMaintenanceRequests: maintenanceRequests.length > 0,
            hasSetupPayments: false, // This would come from payment setup data
            overallProgress: 0
        }

        // Calculate overall progress percentage
        const completedItems = [
            progress.profileComplete,
            progress.hasProperties,
            progress.hasTenants,
            progress.hasMaintenanceRequests,
            progress.hasSetupPayments
        ].filter(Boolean).length

        progress.overallProgress = Math.round((completedItems / 5) * 100)

        return progress
    }, [user, propertiesData, tenantsData, maintenanceData])

    // Determine if user should see onboarding
    const shouldShowOnboarding = useCallback((): boolean => {
        if (!user) return false
        
        const progress = getOnboardingProgress()
        
        // Show onboarding if:
        // 1. They haven't completed the wizard AND
        // 2. They have less than 50% progress OR it's their first visit
        return !onboardingState.hasCompletedWizard && 
               (progress.overallProgress < 50 || onboardingState.isFirstVisit)
    }, [user, onboardingState, getOnboardingProgress])

    // Auto-show onboarding for new users
    useEffect(() => {
        if (shouldShowOnboarding() && !showWizard && onboardingState.isFirstVisit) {
            const timer = setTimeout(() => {
                setShowWizard(true)
                saveOnboardingState({ isFirstVisit: false })
            }, 2000) // Show after 2 seconds to let dashboard load

            return () => clearTimeout(timer)
        }
        return () => {} // Return empty cleanup function when condition is not met
    }, [shouldShowOnboarding, showWizard, onboardingState.isFirstVisit, saveOnboardingState])

    // Show quick start cards for users who completed wizard but need more setup
    useEffect(() => {
        const progress = getOnboardingProgress()
        if (onboardingState.hasCompletedWizard && 
            progress.overallProgress < 80 && 
            !onboardingState.hasSeenQuickStart) {
            setShowQuickStart(true)
        }
    }, [onboardingState, getOnboardingProgress])

    // Onboarding actions
    const startWizard = useCallback(() => {
        setShowWizard(true)
    }, [])

    const completeWizard = useCallback(() => {
        setShowWizard(false)
        saveOnboardingState({ 
            hasCompletedWizard: true,
            hasSeenQuickStart: true 
        })
        setShowQuickStart(true)
    }, [saveOnboardingState])

    const skipWizard = useCallback(() => {
        setShowWizard(false)
        saveOnboardingState({ hasCompletedWizard: true })
    }, [saveOnboardingState])

    const startTour = useCallback((tourId: string) => {
        if (TOUR_DEFINITIONS[tourId as keyof typeof TOUR_DEFINITIONS]) {
            setActiveTour(tourId)
        }
    }, [])

    const completeTour = useCallback((tourId: string) => {
        setActiveTour(null)
        const newCompletedTours = new Set([...onboardingState.completedTours, tourId])
        saveOnboardingState({ completedTours: newCompletedTours })
    }, [onboardingState.completedTours, saveOnboardingState])

    const skipTour = useCallback(() => {
        setActiveTour(null)
    }, [])

    const dismissQuickStart = useCallback(() => {
        setShowQuickStart(false)
        saveOnboardingState({ hasSeenQuickStart: true })
    }, [saveOnboardingState])

    const dismissCard = useCallback((cardId: string) => {
        const newDismissedCards = new Set([...onboardingState.dismissedCards, cardId])
        saveOnboardingState({ dismissedCards: newDismissedCards })
    }, [onboardingState.dismissedCards, saveOnboardingState])

    const resetOnboarding = useCallback(() => {
        const resetState: OnboardingState = {
            hasCompletedWizard: false,
            hasSeenQuickStart: false,
            completedTours: new Set(),
            dismissedCards: new Set(),
            currentStep: null,
            isFirstVisit: true
        }
        setOnboardingState(resetState)
        localStorage.removeItem('tenantflow-onboarding')
        setShowWizard(false)
        setActiveTour(null)
        setShowQuickStart(false)
    }, [])

    // Get current tour data
    const getCurrentTour = useCallback(() => {
        if (!activeTour) return null
        return TOUR_DEFINITIONS[activeTour as keyof typeof TOUR_DEFINITIONS] || null
    }, [activeTour])

    // Check if specific tour has been completed
    const hasTourBeenCompleted = useCallback((tourId: string) => {
        return onboardingState.completedTours.has(tourId)
    }, [onboardingState.completedTours])

    const progress = getOnboardingProgress()

    return {
        // State
        ...onboardingState,
        progress,
        showWizard,
        showQuickStart,
        activeTour,
        
        // Computed values
        shouldShowOnboarding: shouldShowOnboarding(),
        currentTour: getCurrentTour(),
        
        // Actions
        startWizard,
        completeWizard,
        skipWizard,
        startTour,
        completeTour,
        skipTour,
        dismissQuickStart,
        dismissCard,
        resetOnboarding,
        hasTourBeenCompleted,
        
        // Data for components
        tourDefinitions: TOUR_DEFINITIONS
    }
}

// Achievement system hook
export function useAchievements() {
    const [currentAchievement, setCurrentAchievement] = useState<{ id: string; title: string } | null>(null)
    const [isVisible, setIsVisible] = useState(false)

    const triggerAchievement = useCallback((achievementId: string) => {
        // Set the achievement and show it
        setCurrentAchievement({ id: achievementId, title: achievementId })
        setIsVisible(true)
    }, [])

    const hideAchievement = useCallback(() => {
        setIsVisible(false)
        setTimeout(() => setCurrentAchievement(null), 300) // Wait for animation
    }, [])

    return {
        currentAchievement,
        isVisible,
        triggerAchievement,
        hideAchievement
    }
}