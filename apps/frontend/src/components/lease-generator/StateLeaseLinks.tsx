import React from 'react'
import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'
import { getAllStates } from '@/lib/state-data'

interface StateLeaseLinksProps {
	className?: string
}

export function StateLeaseLinks({ className }: StateLeaseLinksProps) {
	// Always show all states, as we no longer have popularity/search data
	const states = getAllStates()

	return (
		<div className={className}>
			<div className="mb-8 text-center">
				<h2 className="mb-4 text-3xl font-bold">
					All State Lease Generators
				</h2>
				<p className="text-muted-foreground text-lg">
					Generate lease agreements for any state.
				</p>
			</div>

			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{states.map(state => (
					<Card
						key={state.slug}
						className="group border border-gray-200 transition-all duration-300 hover:border-blue-300 hover:shadow-lg"
					>
						<CardHeader className="pb-4">
							<div className="flex items-center justify-between">
								<CardTitle className="flex items-center gap-2 text-xl">
									{state.name}
								</CardTitle>
								<Badge variant="outline" className="text-xs">
									{state.code}
								</Badge>
							</div>
						</CardHeader>

						<CardContent className="space-y-4">
							<Link
								to="/tools/lease-generator/$state"
								params={{ state: state.slug }}
								className="block"
							>
								<Button
									className="w-full transition-colors group-hover:bg-blue-600 group-hover:text-white"
									variant="default"
								>
									Generate {state.name} Lease
									<ExternalLink className="ml-2 h-4 w-4" />
								</Button>
							</Link>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	)
}

export default StateLeaseLinks
