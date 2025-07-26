import {
    CheckCircle,
    Trophy,
    Star,
    Zap,
    Target,
    Award,
    TrendingUp,
    Shield,
    Home,
    Users
} from 'lucide-react'
import type { Achievement } from '@/hooks/useAchievements'

export const ACHIEVEMENTS: Record<string, Achievement> = {
    FIRST_PROPERTY: {
        id: 'FIRST_PROPERTY',
        title: 'First Property Added!',
        description: 'You\'ve successfully added your first property',
        icon: Home,
        category: 'first-time',
        points: 100,
        unlockMessage: 'Great start! Your property management journey begins.',
        nextSteps: [
            'Add units to your property',
            'Invite your first tenant',
            'Set up maintenance schedules'
        ],
        celebrationLevel: 'large'
    },
    WELCOME_ABOARD: {
        id: 'WELCOME_ABOARD',
        title: 'Welcome Aboard!',
        description: 'You\'ve completed the onboarding process',
        icon: Trophy,
        category: 'first-time',
        points: 50,
        unlockMessage: 'You\'re all set up and ready to go!',
        nextSteps: [
            'Add your first property',
            'Explore the dashboard',
            'Check out our help resources'
        ],
        celebrationLevel: 'medium'
    },
    FIRST_TENANT: {
        id: 'FIRST_TENANT',
        title: 'First Tenant Invited!',
        description: 'You\'ve invited your first tenant',
        icon: Users,
        category: 'first-time',
        points: 75,
        unlockMessage: 'Building your tenant community!',
        celebrationLevel: 'medium'
    },
    MILESTONE_5_PROPERTIES: {
        id: 'MILESTONE_5_PROPERTIES',
        title: 'Property Portfolio Growing!',
        description: 'You now manage 5 properties',
        icon: TrendingUp,
        category: 'milestone',
        points: 250,
        unlockMessage: 'Your portfolio is expanding nicely!',
        celebrationLevel: 'large'
    },
    QUICK_START_COMPLETE: {
        id: 'QUICK_START_COMPLETE',
        title: 'Quick Start Champion!',
        description: 'Completed all quick start tasks',
        icon: Zap,
        category: 'progress',
        points: 150,
        unlockMessage: 'You\'re a fast learner!',
        celebrationLevel: 'medium'
    },
    MAINTENANCE_HERO: {
        id: 'MAINTENANCE_HERO',
        title: 'Maintenance Hero!',
        description: 'Resolved 10 maintenance requests',
        icon: Shield,
        category: 'milestone',
        points: 200,
        unlockMessage: 'Your tenants appreciate your responsiveness!',
        celebrationLevel: 'medium'
    },
    FULL_OCCUPANCY: {
        id: 'FULL_OCCUPANCY',
        title: 'Full House!',
        description: 'All your units are occupied',
        icon: Star,
        category: 'milestone',
        points: 300,
        unlockMessage: 'Maximum occupancy achieved!',
        celebrationLevel: 'large'
    },
    POWER_USER: {
        id: 'POWER_USER',
        title: 'Power User!',
        description: 'Used 10 different features',
        icon: Award,
        category: 'feature',
        points: 175,
        unlockMessage: 'You\'re mastering TenantFlow!',
        celebrationLevel: 'medium'
    },
    STREAK_7_DAYS: {
        id: 'STREAK_7_DAYS',
        title: '7 Day Streak!',
        description: 'Logged in 7 days in a row',
        icon: Target,
        category: 'progress',
        points: 100,
        unlockMessage: 'Consistency is key!',
        celebrationLevel: 'small'
    },
    FIRST_PAYMENT: {
        id: 'FIRST_PAYMENT',
        title: 'First Payment Received!',
        description: 'Collected your first rent payment',
        icon: CheckCircle,
        category: 'first-time',
        points: 125,
        unlockMessage: 'Cash flow started!',
        celebrationLevel: 'medium'
    }
}