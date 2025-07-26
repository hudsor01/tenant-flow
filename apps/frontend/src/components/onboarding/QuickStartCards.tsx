import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    CheckCircle2,
    Circle,
    Home,
    Users,
    FileText,
    CreditCard,
    Settings,
    ArrowRight,
    ChevronDown,
    ChevronUp,
    Star,
    Clock,
    Target,
    Zap
} from 'lucide-react'
import { ContextualTooltip } from './ContextualHelp'

interface QuickStartStep {
    id: string
    title: string
    description: string
    icon: React.ComponentType<{ className?: string }>
    isCompleted: boolean
    isOptional?: boolean
    estimatedTime: string
    difficulty: 'easy' | 'medium' | 'hard'
    action: () => void
    helpText?: string
}

interface QuickStartCard {
    id: string
    title: string
    description: string
    category: 'essential' | 'recommended' | 'advanced'
    progress: number
    steps: QuickStartStep[]
    icon: React.ComponentType<{ className?: string }>
    color: string
}

interface QuickStartCardsProps {
    onStartWizard: () => void
    onStartTour: (tourId: string) => void
    onTriggerAchievement: (achievementId: string) => void
    hasProperties: boolean
    hasTenants: boolean
    hasMaintenanceRequests: boolean
}

export function QuickStartCards({
    onStartWizard,
    onStartTour,
    onTriggerAchievement,
    hasProperties,
    hasTenants,
    hasMaintenanceRequests
}: QuickStartCardsProps) {
    const [expandedCard, setExpandedCard] = useState<string | null>(null)
    const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())

    const handleStepComplete = (stepId: string) => {
        setCompletedSteps(prev => new Set([...prev, stepId]))
        
        // Trigger achievements based on completed steps
        if (stepId === 'add-first-property' && !hasProperties) {
            onTriggerAchievement('FIRST_PROPERTY')
        } else if (stepId === 'invite-first-tenant' && !hasTenants) {
            onTriggerAchievement('FIRST_TENANT')
        }
    }

    const quickStartCards: QuickStartCard[] = [
        {
            id: 'setup-basics',
            title: 'Essential Setup',
            description: 'Get started with the core features you need',
            category: 'essential',
            icon: Home,
            color: 'blue',
            progress: Math.round(([
                hasProperties ? 1 : 0,
                hasTenants ? 1 : 0,
                completedSteps.has('setup-profile') ? 1 : 0
            ].reduce((a, b) => a + b, 0) / 3) * 100),
            steps: [
                {
                    id: 'setup-profile',
                    title: 'Complete Your Profile',
                    description: 'Add your contact information and preferences',
                    icon: Settings,
                    isCompleted: completedSteps.has('setup-profile'),
                    estimatedTime: '2 min',
                    difficulty: 'easy',
                    action: () => onStartTour('profile-setup'),
                    helpText: 'Your profile helps tenants and vendors contact you easily.'
                },
                {
                    id: 'add-first-property',
                    title: 'Add Your First Property',
                    description: 'Set up your rental property with basic details',
                    icon: Home,
                    isCompleted: hasProperties,
                    estimatedTime: '5 min',
                    difficulty: 'easy',
                    action: () => {
                        // This would open the property modal
                        handleStepComplete('add-first-property')
                    },
                    helpText: 'Properties are the foundation of your rental business.'
                },
                {
                    id: 'invite-first-tenant',
                    title: 'Invite Your First Tenant',
                    description: 'Give tenants access to their portal',
                    icon: Users,
                    isCompleted: hasTenants,
                    estimatedTime: '3 min',
                    difficulty: 'easy',
                    action: () => {
                        handleStepComplete('invite-first-tenant')
                    },
                    helpText: 'Tenants can pay rent and submit requests through their portal.'
                }
            ]
        },
        {
            id: 'optimize-workflow',
            title: 'Optimize Your Workflow',
            description: 'Streamline operations with advanced features',
            category: 'recommended',
            icon: Zap,
            color: 'purple',
            progress: Math.round(([
                completedSteps.has('setup-rent-collection') ? 1 : 0,
                completedSteps.has('customize-communications') ? 1 : 0,
                hasMaintenanceRequests ? 1 : 0
            ].reduce((a, b) => a + b, 0) / 3) * 100),
            steps: [
                {
                    id: 'setup-rent-collection',
                    title: 'Set Up Rent Collection',
                    description: 'Enable automatic rent payments',
                    icon: CreditCard,
                    isCompleted: completedSteps.has('setup-rent-collection'),
                    estimatedTime: '10 min',
                    difficulty: 'medium',
                    action: () => onStartTour('rent-collection'),
                    helpText: 'Automate rent collection to save time and reduce late payments.'
                },
                {
                    id: 'customize-communications',
                    title: 'Customize Communications',
                    description: 'Set up automated messages and notifications',
                    icon: FileText,
                    isCompleted: completedSteps.has('customize-communications'),
                    isOptional: true,
                    estimatedTime: '15 min',
                    difficulty: 'medium',
                    action: () => handleStepComplete('customize-communications'),
                    helpText: 'Automated messages keep tenants informed and engaged.'
                },
                {
                    id: 'handle-maintenance',
                    title: 'Handle Maintenance Request',
                    description: 'Process your first maintenance ticket',
                    icon: Settings,
                    isCompleted: hasMaintenanceRequests,
                    isOptional: true,
                    estimatedTime: '5 min',
                    difficulty: 'easy',
                    action: () => onStartTour('maintenance-workflow'),
                    helpText: 'Efficient maintenance handling keeps tenants happy.'
                }
            ]
        },
        {
            id: 'advanced-features',
            title: 'Advanced Features',
            description: 'Unlock the full potential of TenantFlow',
            category: 'advanced',
            icon: Star,
            color: 'gold',
            progress: Math.round(([
                completedSteps.has('setup-analytics') ? 1 : 0,
                completedSteps.has('integrate-accounting') ? 1 : 0,
                completedSteps.has('mobile-app-setup') ? 1 : 0
            ].reduce((a, b) => a + b, 0) / 3) * 100),
            steps: [
                {
                    id: 'setup-analytics',
                    title: 'Set Up Analytics Dashboard',
                    description: 'Track performance metrics and insights',
                    icon: Target,
                    isCompleted: completedSteps.has('setup-analytics'),
                    isOptional: true,
                    estimatedTime: '8 min',
                    difficulty: 'medium',
                    action: () => handleStepComplete('setup-analytics'),
                    helpText: 'Analytics help you make data-driven decisions.'
                },
                {
                    id: 'integrate-accounting',
                    title: 'Connect Accounting Software',
                    description: 'Sync with QuickBooks, Xero, or other tools',
                    icon: FileText,
                    isCompleted: completedSteps.has('integrate-accounting'),
                    isOptional: true,
                    estimatedTime: '20 min',
                    difficulty: 'hard',
                    action: () => handleStepComplete('integrate-accounting'),
                    helpText: 'Streamline your financial reporting and tax preparation.'
                },
                {
                    id: 'mobile-app-setup',
                    title: 'Download Mobile App',
                    description: 'Manage properties on the go',
                    icon: Users,
                    isCompleted: completedSteps.has('mobile-app-setup'),
                    isOptional: true,
                    estimatedTime: '3 min',
                    difficulty: 'easy',
                    action: () => handleStepComplete('mobile-app-setup'),
                    helpText: 'Access your dashboard anywhere with our mobile app.'
                }
            ]
        }
    ]

    const getCategoryBadgeColor = (category: QuickStartCard['category']) => {
        switch (category) {
            case 'essential': return 'bg-red-100 text-red-800 border-red-200'
            case 'recommended': return 'bg-blue-100 text-blue-800 border-blue-200'
            case 'advanced': return 'bg-purple-100 text-purple-800 border-purple-200'
        }
    }

    const getDifficultyBadgeColor = (difficulty: QuickStartStep['difficulty']) => {
        switch (difficulty) {
            case 'easy': return 'bg-green-100 text-green-800'
            case 'medium': return 'bg-yellow-100 text-yellow-800'
            case 'hard': return 'bg-red-100 text-red-800'
        }
    }

    const getProgressColor = (progress: number) => {
        if (progress === 100) return 'from-green-500 to-green-600'
        if (progress >= 50) return 'from-blue-500 to-blue-600'
        return 'from-gray-400 to-gray-500'
    }

    const toggleCard = (cardId: string) => {
        setExpandedCard(expandedCard === cardId ? null : cardId)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Quick Start Guide</h2>
                    <p className="text-muted-foreground">
                        Complete these steps to get the most out of TenantFlow
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={onStartWizard}
                    className="hidden sm:flex"
                >
                    <Target className="mr-2 h-4 w-4" />
                    Start Guided Setup
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quickStartCards.map((card, index) => {
                    const isExpanded = expandedCard === card.id
                    const completedStepsCount = card.steps.filter(step => step.isCompleted).length
                    const totalSteps = card.steps.length

                    return (
                        <motion.div
                            key={card.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                            className="h-fit"
                        >
                            <Card className="border-border bg-card hover:shadow-lg transition-all duration-200">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`
                                                flex h-10 w-10 items-center justify-center rounded-lg
                                                ${card.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                                                  card.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                                                  'bg-yellow-100 text-yellow-600'}
                                            `}>
                                                <card.icon className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1">
                                                <CardTitle className="text-lg">{card.title}</CardTitle>
                                                <CardDescription className="text-sm">
                                                    {card.description}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <Badge className={getCategoryBadgeColor(card.category)}>
                                            {card.category}
                                        </Badge>
                                    </div>

                                    <div className="space-y-2 mt-4">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Progress</span>
                                            <span className="font-medium">
                                                {completedStepsCount}/{totalSteps} complete
                                            </span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <motion.div
                                                className={`h-full bg-gradient-to-r ${getProgressColor(card.progress)} rounded-full`}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${card.progress}%` }}
                                                transition={{ duration: 0.8, delay: index * 0.1 }}
                                            />
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="pt-0">
                                    <Button
                                        variant="ghost"
                                        onClick={() => toggleCard(card.id)}
                                        className="w-full justify-between p-0 h-auto font-normal"
                                    >
                                        <span className="text-sm text-muted-foreground">
                                            {isExpanded ? 'Hide steps' : 'Show steps'}
                                        </span>
                                        {isExpanded ? (
                                            <ChevronUp className="h-4 w-4" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4" />
                                        )}
                                    </Button>

                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="mt-4 space-y-3"
                                            >
                                                {card.steps.map((step) => (
                                                    <div
                                                        key={step.id}
                                                        className={`
                                                            flex items-start gap-3 p-3 rounded-lg border transition-colors
                                                            ${step.isCompleted 
                                                                ? 'bg-green-50 border-green-200' 
                                                                : 'bg-muted/30 border-border hover:bg-muted/50'
                                                            }
                                                        `}
                                                    >
                                                        <div className="flex-shrink-0 mt-1">
                                                            {step.isCompleted ? (
                                                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                            ) : (
                                                                <Circle className="h-5 w-5 text-muted-foreground" />
                                                            )}
                                                        </div>
                                                        
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h4 className="font-medium text-sm text-foreground">
                                                                    {step.title}
                                                                </h4>
                                                                {step.isOptional && (
                                                                    <Badge variant="outline" className="text-xs">
                                                                        Optional
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            
                                                            <p className="text-xs text-muted-foreground mb-2">
                                                                {step.description}
                                                            </p>
                                                            
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                    <Clock className="h-3 w-3" />
                                                                    {step.estimatedTime}
                                                                </div>
                                                                <Badge 
                                                                    variant="outline" 
                                                                    className={`text-xs ${getDifficultyBadgeColor(step.difficulty)}`}
                                                                >
                                                                    {step.difficulty}
                                                                </Badge>
                                                            </div>
                                                            
                                                            {!step.isCompleted && (
                                                                <div className="flex items-center gap-2">
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={step.action}
                                                                        className="text-xs h-7"
                                                                    >
                                                                        Start
                                                                        <ArrowRight className="ml-1 h-3 w-3" />
                                                                    </Button>
                                                                    
                                                                    {step.helpText && (
                                                                        <ContextualTooltip
                                                                            content={step.helpText}
                                                                            variant="tip"
                                                                            placement="top"
                                                                        >
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="h-7 w-7 p-0"
                                                                            >
                                                                                <Circle className="h-3 w-3" />
                                                                            </Button>
                                                                        </ContextualTooltip>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )
                })}
            </div>
        </div>
    )
}