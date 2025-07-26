import { useState, useEffect } from 'react'

export function useTour(tourId: string) {
    const [activeTour, setActiveTour] = useState<string | null>(null)
    const [completedTours, setCompletedTours] = useState<Set<string>>(new Set())

    useEffect(() => {
        // Load completed tours from localStorage
        const saved = localStorage.getItem('tenantflow-completed-tours')
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                setCompletedTours(new Set(parsed))
            } catch {
                console.warn('Failed to parse completed tours from localStorage')
            }
        }
    }, [])

    const startTour = (id: string) => {
        setActiveTour(id)
    }

    const completeTour = (id: string) => {
        const updated = new Set(completedTours)
        updated.add(id)
        setCompletedTours(updated)
        setActiveTour(null)
        
        // Save to localStorage
        localStorage.setItem('tenantflow-completed-tours', JSON.stringify(Array.from(updated)))
    }

    const skipTour = () => {
        setActiveTour(null)
    }

    const isCompleted = (id: string) => completedTours.has(id)

    return {
        activeTour,
        completedTours,
        startTour,
        completeTour,
        skipTour,
        isCompleted,
        tourActive: activeTour === tourId
    }
}