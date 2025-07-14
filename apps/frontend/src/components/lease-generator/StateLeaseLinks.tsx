import React from 'react'
import { Link } from '@tanstack/react-router'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink, Star, Users } from 'lucide-react'
import {
	ALL_LEASE_DATA,
	TOP_5_STATES,
	INTERNATIONAL_LEASE_DATA,
	getStateUrlSlug
} from '@/lib/state-data'

interface StateLeaseLinksProps {
	showAll?: boolean
	showInternational?: boolean
	className?: string
}

export function StateLeaseLinks({
	showAll = false,
	showInternational = false,
	className
}: StateLeaseLinksProps) {
	// Show top 5 by default, or all states if requested
	const statesToShow = showAll
		? Object.entries(ALL_LEASE_DATA)
				.filter(
					([key]) =>
						!Object.keys(INTERNATIONAL_LEASE_DATA).includes(key)
				)
				.sort((a, b) => b[1].searchVolume - a[1].searchVolume)
		: TOP_5_STATES.map(key => [key, ALL_LEASE_DATA[key]] as const)

	const internationalRegions = Object.entries(INTERNATIONAL_LEASE_DATA).sort(
		(a, b) => b[1].searchVolume - a[1].searchVolume
	)

	return (
		<div className={className}>
			<div className="mb-8 text-center">
				<h2 className="mb-4 text-3xl font-bold">
					{showAll
						? 'All State Lease Generators'
						: 'Popular State Lease Generators'}
				</h2>
				<p className="text-muted-foreground text-lg">
					Generate state-compliant lease agreements with all required
					legal disclosures
				</p>
			</div>

			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{statesToShow.map(([key, stateData]) => {
					const stateSlug = getStateUrlSlug(stateData.name)
					const isTopState = TOP_5_STATES.includes(
						key as (typeof TOP_5_STATES)[number]
					)

					return (
						<Card
							key={key}
							className="group border border-gray-200 transition-all duration-300 hover:border-blue-300 hover:shadow-lg"
						>
							<CardHeader className="pb-4">
								<div className="flex items-center justify-between">
									<CardTitle className="flex items-center gap-2 text-xl">
										{stateData.name}
										{isTopState && (
											<Badge
												variant="secondary"
												className="bg-yellow-100 text-yellow-700"
											>
												<Star className="mr-1 h-3 w-3" />
												Popular
											</Badge>
										)}
									</CardTitle>
									<Badge
										variant="outline"
										className="text-xs"
									>
										{stateData.code}
									</Badge>
								</div>
								<CardDescription className="line-clamp-2 text-sm">
									{stateData.metaDescription}
								</CardDescription>
							</CardHeader>

							<CardContent className="space-y-4">
								{/* State Stats */}
								<div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
									<div className="flex items-center gap-2">
										<Users className="h-4 w-4 text-blue-600" />
										<div>
											<div className="font-medium">
												{stateData.marketSize}k
											</div>
											<div className="text-muted-foreground text-xs">
												rental units
											</div>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<ExternalLink className="h-4 w-4 text-green-600" />
										<div>
											<div className="font-medium">
												{stateData.searchVolume.toLocaleString()}
											</div>
											<div className="text-muted-foreground text-xs">
												monthly searches
											</div>
										</div>
									</div>
								</div>

								{/* Key Legal Requirements */}
								<div className="rounded-lg bg-gray-50 p-3">
									<h4 className="mb-2 text-sm font-medium">
										Key Requirements:
									</h4>
									<ul className="text-muted-foreground space-y-1 text-xs">
										<li>
											• Entry notice:{' '}
											{
												stateData.legalRequirements
													.noticeToEnter
											}
										</li>
										<li>
											• Termination:{' '}
											{
												stateData.legalRequirements
													.noticePeriod
											}
										</li>
										{stateData.legalRequirements
											.securityDepositLimit !==
											'No statutory limit' && (
											<li>
												• Security deposit:{' '}
												{
													stateData.legalRequirements
														.securityDepositLimit
												}
											</li>
										)}
									</ul>
								</div>

								{/* CTA Button */}
								<Link
									to={`/lease-generator/${stateSlug}`}
									className="block"
								>
									<Button
										className="w-full transition-colors group-hover:bg-blue-600 group-hover:text-white"
										variant={
											isTopState ? 'default' : 'outline'
										}
									>
										Generate {stateData.name} Lease
										<ExternalLink className="ml-2 h-4 w-4" />
									</Button>
								</Link>
							</CardContent>
						</Card>
					)
				})}
			</div>

			{!showAll && (
				<div className="mt-8 text-center">
					<Link to="/lease-generator/states">
						<Button variant="outline" size="lg">
							View All 50 States
							<ExternalLink className="ml-2 h-4 w-4" />
						</Button>
					</Link>
				</div>
			)}

			{/* International Regions Section */}
			{(showInternational || internationalRegions.length > 0) && (
				<div className="mt-16">
					<div className="mb-8 text-center">
						<h2 className="mb-4 text-3xl font-bold">
							International Lease Generators
						</h2>
						<p className="text-muted-foreground text-lg">
							Generate compliant lease agreements for
							international markets
						</p>
					</div>

					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{internationalRegions.map(([key, regionData]) => {
							const regionSlug = getStateUrlSlug(regionData.name)

							return (
								<Card
									key={key}
									className="group border border-gray-200 transition-all duration-300 hover:border-blue-300 hover:shadow-lg"
								>
									<CardHeader className="pb-4">
										<div className="flex items-center justify-between">
											<CardTitle className="flex items-center gap-2 text-xl">
												{regionData.name}
												<Badge
													variant="secondary"
													className="bg-blue-100 text-blue-700"
												>
													<Star className="mr-1 h-3 w-3" />
													International
												</Badge>
											</CardTitle>
											<Badge
												variant="outline"
												className="text-xs"
											>
												{regionData.code}
											</Badge>
										</div>
										<CardDescription className="line-clamp-2 text-sm">
											{regionData.metaDescription}
										</CardDescription>
									</CardHeader>

									<CardContent className="space-y-4">
										{/* Region Stats */}
										<div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
											<div className="flex items-center gap-2">
												<Users className="h-4 w-4 text-blue-600" />
												<div>
													<div className="font-medium">
														{regionData.marketSize}k
													</div>
													<div className="text-muted-foreground text-xs">
														rental units
													</div>
												</div>
											</div>
											<div className="flex items-center gap-2">
												<ExternalLink className="h-4 w-4 text-green-600" />
												<div>
													<div className="font-medium">
														{regionData.searchVolume.toLocaleString()}
													</div>
													<div className="text-muted-foreground text-xs">
														monthly searches
													</div>
												</div>
											</div>
										</div>

										{/* Key Legal Requirements */}
										<div className="rounded-lg bg-gray-50 p-3">
											<h4 className="mb-2 text-sm font-medium">
												Key Requirements:
											</h4>
											<ul className="text-muted-foreground space-y-1 text-xs">
												<li>
													• Entry notice:{' '}
													{
														regionData
															.legalRequirements
															.noticeToEnter
													}
												</li>
												<li>
													• Termination:{' '}
													{
														regionData
															.legalRequirements
															.noticePeriod
													}
												</li>
												{regionData.legalRequirements
													.securityDepositLimit !==
													'No statutory limit' && (
													<li>
														• Security deposit:{' '}
														{
															regionData
																.legalRequirements
																.securityDepositLimit
														}
													</li>
												)}
											</ul>
										</div>

										{/* CTA Button */}
										<Link
											to={`/lease-generator/${regionSlug}`}
											className="block"
										>
											<Button
												className="w-full transition-colors group-hover:bg-blue-600 group-hover:text-white"
												variant="default"
											>
												Generate {regionData.name} Lease
												<ExternalLink className="ml-2 h-4 w-4" />
											</Button>
										</Link>
									</CardContent>
								</Card>
							)
						})}
					</div>
				</div>
			)}
		</div>
	)
}

export default StateLeaseLinks
