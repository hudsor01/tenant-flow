'use client'

import { Alert, AlertDescription, AlertTitle } from '#components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { useMobileAccessibility } from '#hooks/use-mobile-accessibility'
import { useOfflineData } from '#hooks/use-offline-data'
import { cn } from '#lib/utils'
import type { Property } from '@repo/shared/types/core'
import { Building2, WifiOff } from 'lucide-react'
import { useEffect } from 'react'
import { PropertyForm } from './property-form.client'

type PropertyFormComponentProps = React.ComponentProps<typeof PropertyForm>

interface MobilePropertyFormProps extends PropertyFormComponentProps {
	offlineEntityKey?: string
}

export function MobilePropertyForm({
	offlineEntityKey = 'properties',
	...formProps
}: MobilePropertyFormProps) {
	const { isHighContrast } = useMobileAccessibility()
	const { isOnline } = useOfflineData<Property>(offlineEntityKey)

	useEffect(() => {
		if (isHighContrast) {
			document.body.classList.add('high-contrast-mode')
			return () => document.body.classList.remove('high-contrast-mode')
		}

		document.body.classList.remove('high-contrast-mode')
		return undefined
	}, [isHighContrast])

	return (
		<section className="md:hidden">
			<Card
				className={cn(
					'border-none bg-card/90 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-card/80',
					isHighContrast && 'outline outline-2 outline-primary/60'
				)}
			>
				<CardHeader className="flex flex-col gap-2">
					<div className="flex items-center gap-3">
						<span className="rounded-2xl bg-primary/10 p-3">
							<Building2 className="size-5 text-primary" aria-hidden />
						</span>
						<CardTitle className="text-lg font-semibold">
							{formProps.mode === 'create' ? 'Add Property' : 'Edit Property'}
						</CardTitle>
					</div>
					<p className="text-sm text-muted-foreground">
						Mobile-first form with offline awareness and accessible touch targets.
					</p>
				</CardHeader>
				<CardContent className="space-y-4">
					{!isOnline ? (
						<Alert className="rounded-2xl border-yellow-200 bg-yellow-50 text-yellow-900">
							<WifiOff className="size-4" aria-hidden />
							<AlertTitle>Offline mode</AlertTitle>
							<AlertDescription>
								You can keep editing. We will sync once you reconnect.
							</AlertDescription>
						</Alert>
					) : null}

					<PropertyForm {...formProps} className="max-w-full space-y-4" />
				</CardContent>
			</Card>
		</section>
	)
}
