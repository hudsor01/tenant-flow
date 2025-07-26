import { useEffect, useRef, type ReactNode } from 'react'
import { useAccessibility } from '@/hooks/use-accessibility'

interface FocusTrapProps {
    children: ReactNode
    isActive?: boolean
    restoreFocus?: boolean
    autoFocus?: boolean
    className?: string
}

export function FocusTrap({ 
    children, 
    isActive = true, 
    restoreFocus = true, 
    autoFocus = true,
    className = ''
}: FocusTrapProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const { setFocusTrap, removeFocusTrap } = useAccessibility()

    useEffect(() => {
        if (!isActive || !containerRef.current) return

        if (autoFocus) {
            setFocusTrap(containerRef.current)
        }

        return () => {
            if (restoreFocus) {
                removeFocusTrap()
            }
        }
    }, [isActive, autoFocus, restoreFocus, setFocusTrap, removeFocusTrap])

    if (!isActive) {
        return <>{children}</>
    }

    return (
        <div 
            ref={containerRef}
            className={className}
            onKeyDown={(e) => {
                if (e.key === 'Escape') {
                    e.stopPropagation()
                }
            }}
        >
            {children}
        </div>
    )
}

