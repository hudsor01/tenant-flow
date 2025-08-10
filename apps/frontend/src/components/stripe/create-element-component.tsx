import { forwardRef } from 'react'
import type { ComponentType, ForwardRefExoticComponent, RefAttributes } from 'react'

/**
 * Higher-order component to create forwarded ref components for Stripe Elements
 * This is useful for creating custom Stripe Element components with proper typing
 */
export function createElementComponent<P extends object>(
    displayName: string,
    Component: ComponentType<P>
): ForwardRefExoticComponent<P & RefAttributes<HTMLDivElement>> {
    const ForwardedComponent = forwardRef<HTMLDivElement, P>((props, ref) => {
        return (
            <div ref={ref}>
                <Component {...(props as P)} />
            </div>
        )
    })

    ForwardedComponent.displayName = displayName

    return ForwardedComponent as ForwardRefExoticComponent<P & RefAttributes<HTMLDivElement>>
}