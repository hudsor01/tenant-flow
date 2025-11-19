'use client'

import { FloatingActionButton } from '#components/floating-action-button'
import { MobileOnboarding } from '#components/mobile-onboarding'
import { MobileNav } from '#components/mobile-nav'
import { MobileErrorBoundary } from '#components/ui/mobile-error-boundary'
import { useIsMobile } from '#hooks/use-mobile'
import { useMobileSecurity } from '#hooks/use-mobile-security'
import type { ReactNode } from 'react'

interface MobileChromeProps {
	children: ReactNode
}

export function MobileChrome({ children }: MobileChromeProps) {
	const isMobile = useIsMobile()
	const { requiresSecureContext } = useMobileSecurity()

	return (
		<MobileErrorBoundary>
			<div className="flex min-h-screen flex-col bg-background">
				{requiresSecureContext && isMobile ? (
					<div className="bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
						A secure (HTTPS) connection is required for mobile actions.
					</div>
				) : null}
				<div className={isMobile ? 'pb-28' : undefined}>{children}</div>
				{isMobile ? (
					<>
						<FloatingActionButton
							href="/manage/properties/new"
							label="Add property"
						/>
						<MobileNav />
						<MobileOnboarding />
					</>
				) : null}
			</div>
		</MobileErrorBoundary>
	)
}
