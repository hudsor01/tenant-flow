import { Button } from '#components/ui/button'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from '#components/ui/empty'
import { BarChart3, FileText, Filter, Plus } from 'lucide-react'
import Link from 'next/link'

export default function ReportsPage() {
	return (
		<div className="@container/main flex min-h-screen w-full flex-col">
			{/* Top Section - Matching Dashboard */}
			<div className="border-b bg-background p-6 border-fill-tertiary">
				<div className="mx-auto max-w-400 py-4">
					<div className="flex-between mb-4">
						<div>
							<h1 className="typography-h2">Reports & Analytics</h1>
							<p className="text-muted-foreground mt-1">
								Generate and manage comprehensive business reports
							</p>
						</div>
						<div className="flex items-center gap-2">
							<Link href="/reports/analytics">
								<Button variant="outline" size="sm">
									<BarChart3 className="size-4 mr-2" />
									Analytics
								</Button>
							</Link>
							<Button variant="outline" size="sm">
								<Filter className="size-4 mr-2" />
								Filter
							</Button>
							<Button size="sm">
								<Plus className="size-4 mr-2" />
								New Report
							</Button>
						</div>
					</div>

					{/* Coming Soon Message - No Mock Data */}
					<Empty>
						<EmptyHeader>
							<EmptyMedia>
								<FileText className="size-12" />
							</EmptyMedia>
							<EmptyTitle>Reports Coming Soon</EmptyTitle>
							<EmptyDescription>
								Report generation features are currently in development. Check
								back soon!
							</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<div className="flex gap-2">
								<Link href="/reports/analytics">
									<Button>
										<BarChart3 className="size-4 mr-2" />
										View Analytics
									</Button>
								</Link>
								<Link href="/dashboard">
									<Button variant="outline">Return to Dashboard</Button>
								</Link>
							</div>
						</EmptyContent>
					</Empty>
				</div>
			</div>
		</div>
	)
}
