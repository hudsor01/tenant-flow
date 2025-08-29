import { Button } from '@/components/ui/button'

interface Property_ErrorStateProps {
	onBackToProperties: () => void
}

/**
 * Error state component for property detail page
 * Displays when property is not found or fails to load
 */
export default function Property_ErrorState({
	onBackToProperties
}: Property_ErrorStateProps) {
	return (
		<div className="flex min-h-[300px] flex-col items-center justify-center sm:min-h-[400px]">
			<i className="i-lucide-building-2 text-muted-foreground mb-4 h-12 w-12"  />
			<h3 className="text-lg font-semibold">Property not found</h3>
			<p className="text-muted-foreground mt-2">
				The property you&apos;re looking for doesn&apos;t exist.
			</p>
			<Button onClick={onBackToProperties} className="mt-4">
				<i className="i-lucide-arrow-left mr-2 h-4 w-4"  />
				Back to Properties
			</Button>
		</div>
	)
}
