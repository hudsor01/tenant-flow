'use client'

import { Suspense } from 'react'
import { motion } from '@/lib/lazy-motion'
import { useProperties } from '@/hooks/api/use-properties'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { DenseTable } from '@/components/data-table/dense-table'
import { propertyColumns } from '@/components/data-table/columns/property-columns'
import Link from 'next/link'

/**
 * Dashboard Recent Activity Component with Progressive Loading
 * Focused component for recent properties and activity with enhanced data visualization
 * Extracted from massive dashboard client component
 */

// Progressive Loading Skeleton
function ActivityLoadingSkeleton() {
	return (
		<div className="grid gap-4 lg:grid-cols-2">
			{Array.from({ length: 2 }).map((_, i) => (
				<Card key={i} className="animate-pulse">
					<CardHeader className="flex flex-row items-center justify-between space-y-0">
						<div className="space-y-2">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-3 w-48" />
						</div>
						<Skeleton className="h-4 w-4 rounded" />
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{Array.from({ length: 3 }).map((_, j) => (
								<div
									key={j}
									className="flex items-center space-x-4"
								>
									<Skeleton className="h-12 w-12 rounded" />
									<div className="flex-1 space-y-2">
										<Skeleton className="h-4 w-3/4" />
										<Skeleton className="h-3 w-1/2" />
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	)
}

export function DashboardRecentActivity() {
	const { data: properties, isLoading, error } = useProperties()

	if (error) {
		return (
			<motion.div
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.3 }}
			>
				<Alert
					variant="destructive"
					className="border-red-200 bg-red-50"
				>
					<i className="i-lucide-alert-triangle inline-block h-4 w-4"  />
					<AlertTitle>Error loading properties</AlertTitle>
					<AlertDescription>
						There was a problem loading your recent activity. Please
						try refreshing the page.
					</AlertDescription>
				</Alert>
			</motion.div>
		)
	}

	return (
		<Suspense fallback={<ActivityLoadingSkeleton />}>
			<div className="grid gap-4 lg:grid-cols-2">
				{/* Enhanced Recent Properties with Progressive Loading */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4, delay: 0.1 }}
				>
					<Card className="group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
						<CardHeader className="flex flex-row items-center justify-between space-y-0">
							<div>
								<CardTitle className="group-hover:text-primary text-base transition-colors">
									Recent Properties
								</CardTitle>
								<CardDescription>
									Your latest property additions
								</CardDescription>
							</div>
							<motion.div
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
							>
								<Button
									asChild
									variant="ghost"
									size="sm"
									className="group/btn"
								>
									<Link href="/properties">
										View all
										<motion.div
											animate={{ x: [0, 2, 0] }}
											transition={{
												duration: 2,
												repeat: Infinity,
												ease: 'easeInOut'
											}}
										>
											<i className="i-lucide-arrow-right inline-block ml-1 h-3 w-3 transition-transform group-hover/btn:translate-x-0.5"  />
										</motion.div>
									</Link>
								</Button>
							</motion.div>
						</CardHeader>
						<CardContent>
							{isLoading ? (
								<div className="space-y-3">
									{Array.from({ length: 3 }).map((_, i) => (
										<motion.div
											key={i}
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											transition={{ delay: i * 0.1 }}
											className="flex items-center space-x-4"
										>
											<Skeleton className="h-12 w-12 rounded" />
											<div className="space-y-2">
												<Skeleton className="h-4 w-32" />
												<Skeleton className="h-3 w-24" />
											</div>
										</motion.div>
									))}
								</div>
							) : properties && properties.length > 0 ? (
								<motion.div
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ duration: 0.3 }}
								>
									<DenseTable
										data={properties.slice(0, 5)}
										columns={propertyColumns.slice(0, 3)} // Show only name, address, type
									/>
								</motion.div>
							) : (
								<motion.div
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									className="text-muted-foreground py-8 text-center"
								>
									<motion.div
										animate={{
											scale: [1, 1.05, 1]
										}}
										transition={{
											duration: 2,
											repeat: Infinity,
											ease: 'easeInOut'
										}}
									>
										<i className="i-lucide-activity inline-block mx-auto mb-4 h-12 w-12 text-gray-300"  />
									</motion.div>
									<p>No properties yet</p>
									<motion.div
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.95 }}
									>
										<Button
											asChild
											variant="outline"
											size="sm"
											className="mt-2"
										>
											<Link href="/properties">
												Add your first property
											</Link>
										</Button>
									</motion.div>
								</motion.div>
							)}
						</CardContent>
					</Card>
				</motion.div>

				{/* Enhanced Quick Actions */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4, delay: 0.2 }}
				>
					<Card className="group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
						<CardHeader>
							<CardTitle className="group-hover:text-primary text-base transition-colors">
								Quick Actions
							</CardTitle>
							<CardDescription>
								Common tasks to get things done faster
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid gap-2">
								{[
									{
										href: '/properties',
										label: 'Add Property',
										delay: 0.1
									},
									{
										href: '/tenants',
										label: 'Add Tenant',
										delay: 0.2
									},
									{
										href: '/leases',
										label: 'Create Lease',
										delay: 0.3
									},
									{
										href: '/maintenance',
										label: 'Log Maintenance',
										delay: 0.4
									}
								].map((action, index) => (
									<motion.div
										key={action.href}
										initial={{ opacity: 0, x: -20 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{
											duration: 0.3,
											delay: action.delay
										}}
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
									>
										<Button
											asChild
											variant="outline"
											className="group/action hover:border-primary/30 hover:bg-primary/5 w-full justify-start transition-all duration-200"
										>
											<Link href={action.href}>
												<motion.div
													animate={{ x: [0, 2, 0] }}
													transition={{
														duration: 2,
														repeat: Infinity,
														ease: 'easeInOut',
														delay: index * 0.5
													}}
												>
													<i className="i-lucide-arrow-right inline-block mr-2 h-4 w-4 transition-transform group-hover/action:translate-x-0.5"  />
												</motion.div>
												{action.label}
											</Link>
										</Button>
									</motion.div>
								))}
							</div>
						</CardContent>
					</Card>
				</motion.div>
			</div>
		</Suspense>
	)
}
