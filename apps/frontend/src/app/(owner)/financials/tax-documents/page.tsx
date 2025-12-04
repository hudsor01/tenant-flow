import { TaxDocumentsClient } from './page.client'
import { Suspense } from 'react'
import { Card, CardContent, CardHeader } from '#components/ui/card'
import { Skeleton } from '#components/ui/skeleton'

interface TaxDocumentsPageProps {
	searchParams: Promise<{
		year?: string
	}>
}

const TaxDocumentsPage = async ({ searchParams }: TaxDocumentsPageProps) => {
	// In Next.js 16, searchParams is a Promise that must be awaited
	const { year: yearParam } = await searchParams
	const initialYear = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear()

	return (
		<Suspense fallback={<TaxDocumentsSkeleton />}>
			<TaxDocumentsClient initialYear={initialYear} />
		</Suspense>
	)
}

const TaxDocumentsSkeleton = () => {
	return (
		<div className="p-6 space-y-6">
			<div className="flex-between">
				<div>
					<h1 className="text-3xl font-bold">Tax Documents</h1>
					<p className="text-muted/600">
						Tax preparation and filing documents
					</p>
				</div>
				<div className="flex gap-2">
					<Skeleton className="h-10 w-24" />
					<Skeleton className="h-10 w-24" />
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{[1, 2, 3].map(i => (
					<Card key={i}>
						<CardHeader>
							<Skeleton className="h-6 w-32" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-8 w-full" />
							<Skeleton className="h-4 w-24 mt-2" />
						</CardContent>
					</Card>
				))}
			</div>

			<div className="space-y-4">
				{[1, 2, 3].map(i => (
					<div key={i}>
						<Skeleton className="h-6 w-48 mb-4" />
						<div className="space-y-2">
							{[1, 2, 3].map(j => (
								<div
									key={j}
									className="flex-between p-3 bg-muted/50 rounded-lg"
								>
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-6 w-24" />
								</div>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	)
}

export default TaxDocumentsPage
