import { Skeleton } from '@/components/ui/skeleton'

export default function AppLoading() {
	return (
		<div className="min-h-screen bg-background touch-manipulation transform-gpu will-change-contents">
			{/* Hero Section Skeleton */}
			<section className="relative overflow-hidden py-24 sm:py-32">
				<div className="mx-auto max-w-7xl px-6 lg:px-8">
					<div className="mx-auto max-w-4xl text-center">
						<Skeleton className="mx-auto mb-8 h-16 w-3/4" />
						<Skeleton className="mx-auto mb-12 h-6 w-1/2" />

						<div className="mt-10 flex items-center justify-center gap-6">
							<Skeleton className="h-12 w-40" />
							<Skeleton className="h-12 w-40" />
						</div>

						{/* Animated Metrics Skeleton */}
						<div className="mt-16 grid grid-cols-2 gap-8 md:grid-cols-4">
							{[...Array(4)].map((_, i) => (
								<div key={i} className="text-center">
									<Skeleton className="mx-auto mb-2 h-8 w-16" />
									<Skeleton className="mx-auto h-4 w-24" />
								</div>
							))}
						</div>
					</div>
				</div>
			</section>

			{/* Features Section Skeleton */}
			<section className="py-24 sm:py-32">
				<div className="mx-auto max-w-7xl px-6 lg:px-8">
					<div className="mx-auto max-w-2xl text-center">
						<Skeleton className="mx-auto mb-4 h-10 w-64" />
						<Skeleton className="mx-auto h-6 w-80" />
					</div>

					<div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
						{[...Array(3)].map((_, i) => (
							<div key={i} className="relative rounded-2xl border card-padding">
								<Skeleton className="mb-4 h-8 w-8 rounded-full" />
								<Skeleton className="mb-2 h-6 w-3/4" />
								<Skeleton className="h-4 w-full" />
								<Skeleton className="mt-2 h-4 w-2/3" />
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Pricing Section Skeleton */}
			<section className="py-24 sm:py-32 bg-muted/30">
				<div className="mx-auto max-w-7xl px-6 lg:px-8">
					<div className="mx-auto max-w-2xl text-center">
						<Skeleton className="mx-auto mb-4 h-10 w-48" />
						<Skeleton className="mx-auto h-6 w-64" />
					</div>

					<div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">
						{[...Array(3)].map((_, i) => (
							<div key={i} className="relative rounded-2xl border card-padding">
								<Skeleton className="mb-2 h-8 w-32" />
								<Skeleton className="mb-4 h-4 w-48" />
								<Skeleton className="mb-6 h-12 w-24" />

								<div className="space-y-3">
									{[...Array(3)].map((_, j) => (
										<div key={j} className="flex items-center">
											<Skeleton className="mr-3 h-4 w-4 rounded-full" />
											<Skeleton className="h-4 w-3/4" />
										</div>
									))}
								</div>

								<div className="mt-8">
									<Skeleton className="h-12 w-full" />
								</div>
							</div>
						))}
					</div>
				</div>
			</section>
		</div>
	)
}
