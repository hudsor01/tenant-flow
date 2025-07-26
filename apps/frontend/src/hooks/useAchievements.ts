import { useState, useEffect, useCallback } from 'react'

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
    const [currentAchievement, setCurrentAchievement] = useState<{ id: string; title: string } | null>(null)
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

        // Set the achievement and show it
        setCurrentAchievement({ id: achievementId, title: achievementId })
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