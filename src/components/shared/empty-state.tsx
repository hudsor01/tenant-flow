import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyMedia,
	EmptyTitle
} from '#components/ui/empty'
import { Button } from '#components/ui/button'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'

interface EmptyStateProps {
	icon: LucideIcon
	title: string
	description: string
	actionLabel?: string
	actionHref?: string
	onAction?: () => void
}

/**
 * Shared EmptyState component for consistent empty states across list pages.
 * Wraps the shadcn Empty compound component with a standardized interface.
 *
 * Usage:
 * - Provide icon + title + description for a read-only empty state
 * - Add actionLabel + actionHref for a linked CTA button
 * - Add actionLabel + onAction for a click CTA button
 */
export function EmptyState({
	icon: Icon,
	title,
	description,
	actionLabel,
	actionHref,
	onAction
}: EmptyStateProps) {
	return (
		<Empty>
			<EmptyMedia variant="icon">
				<Icon className="size-6" />
			</EmptyMedia>
			<EmptyTitle>{title}</EmptyTitle>
			<EmptyDescription>{description}</EmptyDescription>
			{actionLabel && (
				<EmptyContent>
					{actionHref ? (
						<Button asChild>
							<Link href={actionHref}>
								<Icon className="size-4 mr-2" />
								{actionLabel}
							</Link>
						</Button>
					) : onAction ? (
						<Button onClick={onAction}>
							<Icon className="size-4 mr-2" />
							{actionLabel}
						</Button>
					) : null}
				</EmptyContent>
			)}
		</Empty>
	)
}
