import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    CheckCircle2,
    Star,
    Gift,
    Target,
    TrendingUp,
    X,
    ArrowRight
} from 'lucide-react'

import type { Achievement } from '@/hooks/useAchievements'

interface SuccessCelebrationProps {
    achievement: Achievement
    isVisible: boolean
    onClose: () => void
    onViewDashboard?: () => void
    onNextAction?: () => void
}

interface MilestoneTrackerProps {
    currentMilestone: number
    totalMilestones: number
    milestoneLabel: string
    onCelebrate: () => void
}

interface AchievementToastProps {
    achievement: Pick<Achievement, 'title' | 'icon' | 'points'>
    isVisible: boolean
    onClose: () => void
    duration?: number
}

// Confetti animation component
const ConfettiPiece = ({ delay }: { delay: number }) => (
    <motion.div
        className="absolute w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"
        initial={{ 
            x: Math.random() * window.innerWidth, 
            y: -20,
            rotate: 0,
            scale: 0.5
        }}
        animate={{ 
            y: window.innerHeight + 100,
            rotate: 360,
            scale: [0.5, 1, 0.5]
        }}
        transition={{ 
            duration: 3 + Math.random() * 2,
            delay: delay,
            ease: "easeOut"
        }}
    />
)

// Main Success Celebration Component
export function SuccessCelebration({ 
    achievement, 
    isVisible, 
    onClose, 
    onViewDashboard,
    onNextAction 
}: SuccessCelebrationProps) {
    const [showConfetti, setShowConfetti] = useState(false)

    useEffect(() => {
        if (isVisible && achievement.celebrationLevel === 'large') {
            setShowConfetti(true)
            const timer = setTimeout(() => setShowConfetti(false), 3000)
            return () => clearTimeout(timer)
        }
        return undefined
    }, [isVisible, achievement.celebrationLevel])

    useEffect(() => {
        if (isVisible && achievement.celebrationLevel === 'small') {
            const timer = setTimeout(() => onClose(), 5000)
            return () => clearTimeout(timer)
        }
        return undefined
    }, [isVisible, achievement.celebrationLevel, onClose])

    const getCelebrationContent = () => {
        switch (achievement.celebrationLevel) {
            case 'large':
                return (
                    <div className="text-center space-y-6 p-8">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ 
                                type: "spring", 
                                stiffness: 200, 
                                damping: 10,
                                delay: 0.2 
                            }}
                            className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r from-yellow-400 to-orange-500"
                        >
                            <achievement.icon className="h-12 w-12 text-white" />
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <h2 className="text-3xl font-bold text-foreground mb-2">
                                🎉 {achievement.title}!
                            </h2>
                            <p className="text-lg text-muted-foreground max-w-md mx-auto">
                                {achievement.description}
                            </p>
                        </motion.div>

                        {achievement.points && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.6 }}
                            >
                                <Badge variant="secondary" className="text-lg px-4 py-2">
                                    <Star className="h-4 w-4 mr-2 text-yellow-500" />
                                    +{achievement.points} points
                                </Badge>
                            </motion.div>
                        )}

                        {achievement.unlockMessage && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.8 }}
                                className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto"
                            >
                                <div className="flex items-center gap-2 text-green-800">
                                    <Gift className="h-4 w-4" />
                                    <span className="font-medium text-sm">Unlocked!</span>
                                </div>
                                <p className="text-sm text-green-700 mt-1">
                                    {achievement.unlockMessage}
                                </p>
                            </motion.div>
                        )}

                        {achievement.nextSteps && achievement.nextSteps.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1.0 }}
                                className="text-left max-w-md mx-auto"
                            >
                                <h4 className="font-semibold text-foreground mb-2">What's next?</h4>
                                <ul className="space-y-1 text-sm text-muted-foreground">
                                    {achievement.nextSteps.map((step, index) => (
                                        <li key={index} className="flex items-center gap-2">
                                            <Target className="h-3 w-3 text-blue-500" />
                                            {step}
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        )}

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.2 }}
                            className="flex gap-3 justify-center"
                        >
                            <Button variant="outline" onClick={onClose}>
                                Continue
                            </Button>
                            {onViewDashboard && (
                                <Button onClick={onViewDashboard}>
                                    <TrendingUp className="mr-2 h-4 w-4" />
                                    View Dashboard
                                </Button>
                            )}
                            {onNextAction && (
                                <Button onClick={onNextAction}>
                                    Next Step
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            )}
                        </motion.div>
                    </div>
                )

            case 'medium':
                return (
                    <div className="text-center space-y-4 p-6">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 10 }}
                            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-green-400 to-blue-500"
                        >
                            <achievement.icon className="h-8 w-8 text-white" />
                        </motion.div>

                        <div>
                            <h3 className="text-xl font-bold text-foreground mb-1">
                                {achievement.title}
                            </h3>
                            <p className="text-muted-foreground">
                                {achievement.description}
                            </p>
                        </div>

                        {achievement.points && (
                            <Badge variant="secondary">
                                <Star className="h-3 w-3 mr-1 text-yellow-500" />
                                +{achievement.points} points
                            </Badge>
                        )}

                        <div className="flex gap-2 justify-center">
                            <Button variant="outline" size="sm" onClick={onClose}>
                                Continue
                            </Button>
                            {onNextAction && (
                                <Button size="sm" onClick={onNextAction}>
                                    Next Step
                                </Button>
                            )}
                        </div>
                    </div>
                )

            default: // small
                return (
                    <div className="flex items-center gap-3 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                            <achievement.icon className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-medium text-foreground">
                                {achievement.title}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                                {achievement.description}
                            </p>
                        </div>
                        {achievement.points && (
                            <Badge variant="secondary" className="text-xs">
                                +{achievement.points}
                            </Badge>
                        )}
                        <Button variant="ghost" size="sm" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )
        }
    }

    if (!isVisible) return null

    return (
        <AnimatePresence>
            {/* Confetti */}
            {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-50">
                    {[...Array(50)].map((_, i) => (
                        <ConfettiPiece key={i} delay={i * 0.1} />
                    ))}
                </div>
            )}

            {/* Celebration Modal/Toast */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                className={`
                    fixed z-40 
                    ${achievement.celebrationLevel === 'small' 
                        ? 'top-6 right-6 max-w-sm' 
                        : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-md mx-4'
                    }
                `}
            >
                <Card className="border-border bg-card shadow-2xl">
                    <CardContent className="p-0">
                        {getCelebrationContent()}
                    </CardContent>
                </Card>
            </motion.div>

            {/* Backdrop for medium/large celebrations */}
            {achievement.celebrationLevel !== 'small' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30"
                    onClick={onClose}
                />
            )}
        </AnimatePresence>
    )
}

// Milestone Progress Tracker
export function MilestoneTracker({ 
    currentMilestone, 
    totalMilestones, 
    milestoneLabel,
    onCelebrate 
}: MilestoneTrackerProps) {
    const progress = (currentMilestone / totalMilestones) * 100
    const isComplete = currentMilestone >= totalMilestones

    useEffect(() => {
        if (isComplete) {
            onCelebrate()
        }
    }, [isComplete, onCelebrate])

    return (
        <Card className="border-border bg-card">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-foreground">Progress</h4>
                    <Badge variant={isComplete ? "default" : "secondary"}>
                        {currentMilestone} / {totalMilestones}
                    </Badge>
                </div>
                
                <div className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{milestoneLabel}</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                    </div>
                    
                    {isComplete && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 text-green-600 text-sm font-medium"
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            Milestone Complete!
                        </motion.div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

// Achievement Toast for quick notifications
export function AchievementToast({ 
    achievement, 
    isVisible, 
    onClose, 
    duration = 4000 
}: AchievementToastProps) {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(onClose, duration)
            return () => clearTimeout(timer)
        }
        return undefined
    }, [isVisible, duration, onClose])

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, x: 300 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 300 }}
                    className="fixed top-6 right-6 z-50 max-w-sm"
                >
                    <Card className="border-green-200 bg-green-50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                                    <achievement.icon className="h-4 w-4 text-green-600" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-medium text-green-900 text-sm">
                                        Achievement Unlocked!
                                    </h4>
                                    <p className="text-xs text-green-700">
                                        {achievement.title}
                                    </p>
                                </div>
                                {achievement.points && (
                                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                        +{achievement.points}
                                    </Badge>
                                )}
                                <Button variant="ghost" size="sm" onClick={onClose}>
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}
        </AnimatePresence>
    )
}