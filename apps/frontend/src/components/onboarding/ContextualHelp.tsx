import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    HelpCircle,
    X,
    ArrowLeft,
    ArrowRight,
    Lightbulb,
    Target,
    BookOpen,
    Zap
} from 'lucide-react'

// Quick Help Button Component
interface QuickHelpProps {
    onStartTour: () => void
    onShowHelp: () => void
}

interface TourStep {
    id: string
    target: string // CSS selector for the target element
    title: string
    content: string
    placement: 'top' | 'bottom' | 'left' | 'right'
    showArrow?: boolean
    allowClickOutside?: boolean
}

interface GuidedTourProps {
    isActive: boolean
    steps: TourStep[]
    onComplete: () => void
    onSkip: () => void
    tourId: string
}

interface ContextualTooltipProps {
    children: React.ReactNode
    content: string
    title?: string
    trigger?: 'hover' | 'click'
    placement?: 'top' | 'bottom' | 'left' | 'right'
    showIcon?: boolean
    variant?: 'info' | 'tip' | 'warning' | 'success'
}

// Main Guided Tour Component
export function GuidedTour({ isActive, steps, onComplete, onSkip, tourId: _tourId }: GuidedTourProps) {
    const [currentStep, setCurrentStep] = useState(0)
    const [tourPosition, setTourPosition] = useState({ top: 0, left: 0 })
    const [isVisible, setIsVisible] = useState(false)

    const currentStepData = steps[currentStep]

    useEffect(() => {
        if (!isActive || !currentStepData) return

        const targetElement = document.querySelector(currentStepData.target)
        if (!targetElement) {
            console.warn(`Tour target not found: ${currentStepData.target}`)
            return
        }

        const updatePosition = () => {
            const rect = targetElement.getBoundingClientRect()
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft

            let top = 0
            let left = 0

            switch (currentStepData.placement) {
                case 'top':
                    top = rect.top + scrollTop - 120
                    left = rect.left + scrollLeft + rect.width / 2
                    break
                case 'bottom':
                    top = rect.bottom + scrollTop + 10
                    left = rect.left + scrollLeft + rect.width / 2
                    break
                case 'left':
                    top = rect.top + scrollTop + rect.height / 2
                    left = rect.left + scrollLeft - 320
                    break
                case 'right':
                    top = rect.top + scrollTop + rect.height / 2
                    left = rect.right + scrollLeft + 10
                    break
            }

            setTourPosition({ top, left })
            setIsVisible(true)

            // Scroll element into view if needed
            if (targetElement.scrollIntoView) {
                targetElement.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center',
                    inline: 'center'
                })
            }

            // Highlight the target element
            (targetElement as HTMLElement).style.position = 'relative';
            (targetElement as HTMLElement).style.zIndex = '1001';
            (targetElement as HTMLElement).style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 2px white';
            (targetElement as HTMLElement).style.borderRadius = '8px'
        }

        const timer = setTimeout(updatePosition, 100)
        window.addEventListener('resize', updatePosition)
        window.addEventListener('scroll', updatePosition)

        return () => {
            clearTimeout(timer)
            window.removeEventListener('resize', updatePosition)
            window.removeEventListener('scroll', updatePosition)
            
            // Remove highlight
            if (targetElement) {
                (targetElement as HTMLElement).style.position = '';
                (targetElement as HTMLElement).style.zIndex = '';
                (targetElement as HTMLElement).style.boxShadow = '';
                (targetElement as HTMLElement).style.borderRadius = ''
            }
        }
    }, [isActive, currentStep, currentStepData])

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1)
        } else {
            onComplete()
        }
    }

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1)
        }
    }

    const handleSkip = () => {
        // Clean up highlights
        steps.forEach(step => {
            const element = document.querySelector(step.target)
            if (element) {
                const el = element as HTMLElement
                (el as HTMLElement).style.position = '';
                (el as HTMLElement).style.zIndex = '';
                (el as HTMLElement).style.boxShadow = '';
                (el as HTMLElement).style.borderRadius = ''
            }
        })
        onSkip()
    }

    if (!isActive || !currentStepData || !isVisible) return null

    return (
        <>
            {/* Overlay */}
            <div className="fixed inset-0 bg-black/20 z-[1000]" />
            
            {/* Tour Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="fixed z-[1002] max-w-sm"
                style={{
                    top: tourPosition.top,
                    left: Math.max(16, Math.min(tourPosition.left - 150, window.innerWidth - 336)),
                }}
            >
                <Card className="border-primary/20 bg-card shadow-2xl">
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                    <Target className="h-4 w-4 text-primary" />
                                </div>
                                <Badge variant="outline" className="text-xs">
                                    {currentStep + 1} of {steps.length}
                                </Badge>
                            </div>
                            <Button variant="ghost" size="sm" onClick={handleSkip}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        
                        <h3 className="font-semibold text-foreground mb-2">
                            {currentStepData.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {currentStepData.content}
                        </p>
                        
                        <div className="flex justify-between items-center">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handlePrevious}
                                disabled={currentStep === 0}
                            >
                                <ArrowLeft className="h-4 w-4 mr-1" />
                                Back
                            </Button>
                            
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={handleSkip}>
                                    Skip Tour
                                </Button>
                                <Button size="sm" onClick={handleNext}>
                                    {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                                    {currentStep !== steps.length - 1 && (
                                        <ArrowRight className="h-4 w-4 ml-1" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </>
    )
}

// Contextual Tooltip Component
export function ContextualTooltip({
    children,
    content,
    title,
    trigger = 'hover',
    placement = 'top',
    showIcon = true,
    variant = 'info'
}: ContextualTooltipProps) {
    const [isVisible, setIsVisible] = useState(false)
    const [position, setPosition] = useState({ top: 0, left: 0 })
    const tooltipRef = React.useRef<HTMLDivElement>(null)
    const triggerRef = React.useRef<HTMLDivElement>(null)

    const getVariantIcon = () => {
        switch (variant) {
            case 'tip': return Lightbulb
            case 'warning': return HelpCircle
            case 'success': return Zap
            default: return BookOpen
        }
    }

    const getVariantStyles = () => {
        switch (variant) {
            case 'tip':
                return 'border-yellow-200 bg-yellow-50 text-yellow-800'
            case 'warning':
                return 'border-orange-200 bg-orange-50 text-orange-800'
            case 'success':
                return 'border-green-200 bg-green-50 text-green-800'
            default:
                return 'border-blue-200 bg-blue-50 text-blue-800'
        }
    }

    const Icon = getVariantIcon()

    const updatePosition = useCallback(() => {
        if (!triggerRef.current || !tooltipRef.current) return

        const triggerRect = triggerRef.current.getBoundingClientRect()
        const tooltipRect = tooltipRef.current.getBoundingClientRect()
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft

        let top = 0
        let left = 0

        switch (placement) {
            case 'top':
                top = triggerRect.top + scrollTop - tooltipRect.height - 8
                left = triggerRect.left + scrollLeft + (triggerRect.width - tooltipRect.width) / 2
                break
            case 'bottom':
                top = triggerRect.bottom + scrollTop + 8
                left = triggerRect.left + scrollLeft + (triggerRect.width - tooltipRect.width) / 2
                break
            case 'left':
                top = triggerRect.top + scrollTop + (triggerRect.height - tooltipRect.height) / 2
                left = triggerRect.left + scrollLeft - tooltipRect.width - 8
                break
            case 'right':
                top = triggerRect.top + scrollTop + (triggerRect.height - tooltipRect.height) / 2
                left = triggerRect.right + scrollLeft + 8
                break
        }

        setPosition({ top, left })
    }, [placement, setPosition])

    useEffect(() => {
        if (isVisible) {
            updatePosition()
            window.addEventListener('resize', updatePosition)
            window.addEventListener('scroll', updatePosition)
            return () => {
                window.removeEventListener('resize', updatePosition)
                window.removeEventListener('scroll', updatePosition)
            }
        }
        return () => {} // Return empty cleanup function when not visible
    }, [isVisible, placement, updatePosition])

    const handleShow = () => {
        setIsVisible(true)
    }

    const handleHide = () => {
        setIsVisible(false)
    }

    const handleClick = () => {
        if (trigger === 'click') {
            setIsVisible(!isVisible)
        }
    }

    return (
        <>
            <div
                ref={triggerRef}
                className="relative inline-block"
                onMouseEnter={trigger === 'hover' ? handleShow : undefined}
                onMouseLeave={trigger === 'hover' ? handleHide : undefined}
                onClick={trigger === 'click' ? handleClick : undefined}
            >
                {children}
            </div>

            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        ref={tooltipRef}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                        className={`fixed z-50 max-w-xs border rounded-lg p-3 shadow-lg ${getVariantStyles()}`}
                        style={{
                            top: position.top,
                            left: Math.max(8, Math.min(position.left, window.innerWidth - 320)),
                        }}
                    >
                        <div className="flex items-start gap-2">
                            {showIcon && (
                                <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                                {title && (
                                    <div className="font-medium text-sm mb-1">{title}</div>
                                )}
                                <div className="text-xs leading-relaxed">{content}</div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}



export function QuickHelpButton({ onStartTour, onShowHelp }: QuickHelpProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    return (
        <div className="fixed bottom-6 right-6 z-40">
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute bottom-16 right-0 mb-2"
                    >
                        <Card className="w-48 border-border bg-card shadow-lg">
                            <CardContent className="p-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start"
                                    onClick={() => {
                                        onStartTour()
                                        setIsMenuOpen(false)
                                    }}
                                >
                                    <Target className="h-4 w-4 mr-2" />
                                    Take Tour
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start"
                                    onClick={() => {
                                        onShowHelp()
                                        setIsMenuOpen(false)
                                    }}
                                >
                                    <BookOpen className="h-4 w-4 mr-2" />
                                    Help Center
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <Button
                    size="icon"
                    className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    <HelpCircle className="h-5 w-5" />
                </Button>
            </motion.div>
        </div>
    )
}

