'use client'

import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Skeleton } from '#components/ui/skeleton'
import { cn } from '#lib/utils'

interface CardLayoutProps {
	title: string
	description?: string
	children?: React.ReactNode
	footer?: React.ReactNode
	className?: string
	isLoading?: boolean
	error?: string | null
}

interface CardLayoutSectionProps {
	children: React.ReactNode
	className?: string
}

const CardLayoutSection = ({ children, className }: CardLayoutSectionProps) => (
	<div className={cn('space-y-4', className)}>{children}</div>
)

const CardLayoutSkeleton = () => (
	<Card>
		<CardHeader className="space-y-4">
			<Skeleton className="h-8 w-64" />
			<Skeleton className="h-4 w-48" />
		</CardHeader>
		<CardContent className="space-y-4">
			<Skeleton className="h-12 w-full" />
			<Skeleton className="h-12 w-full" />
			<Skeleton className="h-12 w-full" />
		</CardContent>
		<CardFooter>
			<Skeleton className="h-10 w-32" />
		</CardFooter>
	</Card>
)

const CardLayoutError = ({ message }: { message: string }) => (
	<Card>
		<CardHeader>
			<CardTitle>Error</CardTitle>
			<CardDescription>{message}</CardDescription>
		</CardHeader>
	</Card>
)

const CardLayout = ({
	title,
	description,
	children,
	footer,
	className,
	isLoading,
	error
}: CardLayoutProps) => {
	if (error) {
		return <CardLayoutError message={error} />
	}

	if (isLoading) {
		return <CardLayoutSkeleton />
	}

	return (
		<Card className={cn('w-full', className)}>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				{description && <CardDescription>{description}</CardDescription>}
			</CardHeader>
			<CardContent>
				<CardLayoutSection>{children}</CardLayoutSection>
			</CardContent>
			{footer && <CardFooter>{footer}</CardFooter>}
		</Card>
	)
}

export { CardLayout, CardLayoutError, CardLayoutSection, CardLayoutSkeleton }
