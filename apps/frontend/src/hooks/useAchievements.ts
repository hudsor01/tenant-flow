import { useState, useEffect, useCallback } from 'react'
import { ACHIEVEMENTS } from '@/constants/achievements'

export interface Achievement {
    id: string
    title: string
    description: string
    icon: React.ComponentType<{ className?: string }>
    category: 'first-time' | 'milestone' | 'progress' | 'feature'
    points?: number
    unlockMessage?: string
    nextSteps?: string[]
    celebrationLevel: 'small' | 'medium' | 'large'
}

export function useAchievements() {
    const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null)
    const [isVisible, setIsVisible] = useState(false)
    const [completedAchievements, setCompletedAchievements] = useState<Set<string>>(new Set())

    useEffect(() => {
        // Load completed achievements from localStorage
        const saved = localStorage.getItem('tenantflow-achievements')
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                setCompletedAchievements(new Set(parsed))
            } catch {
                console.warn('Failed to parse achievements from localStorage')
            }
        }
    }, [])

    const triggerAchievement = useCallback((achievementId: string) => {
        if (completedAchievements.has(achievementId)) {
            return // Already completed
        }

        // Get the full achievement data
        const achievement = ACHIEVEMENTS[achievementId]
        if (!achievement) {
            console.warn(`Achievement ${achievementId} not found`)
            return
        }

        // Set the achievement and show it
        setCurrentAchievement(achievement)
        setIsVisible(true)

        // Mark as completed
        const updated = new Set(completedAchievements)
        updated.add(achievementId)
        setCompletedAchievements(updated)
        
        // Save to localStorage
        localStorage.setItem('tenantflow-achievements', JSON.stringify(Array.from(updated)))
    }, [completedAchievements])

    const hideAchievement = useCallback(() => {
        setIsVisible(false)
    }, [])

    return {
        currentAchievement,
        isVisible,
        triggerAchievement,
        hideAchievement,
        completedAchievements
    }
}