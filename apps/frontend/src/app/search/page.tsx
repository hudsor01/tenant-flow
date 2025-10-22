import { PageLayout } from '@/components/layout/page-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FileText, Filter, FolderOpen, Search, Users } from 'lucide-react'

export default function SearchPage() {
	return (
		<PageLayout containerClass="max-w-6xl py-8">
			<div className="flex flex-col gap-6">
				{/* Search Header */}
				<div className="flex flex-col gap-4">
					<div className="flex flex-col gap-2">
						<h1 className="text-3xl font-bold">Search TenantFlow</h1>
						<p className="text-muted-foreground">
							Find properties, tenants, leases, and documents across your
							portfolio
						</p>
					</div>

					{/* Search Bar */}
					<div className="flex gap-2">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
							<Input
								id="global-search"
								name="search"
								placeholder="Search properties, tenants, leases..."
								className="pl-10 pr-4 py-3 text-base"
								aria-label="Global search"
							/>
						</div>
						<Button variant="outline" size="lg" className="px-6">
							<Filter className="size-4 mr-2" />
							Filters
						</Button>
						<Button size="lg" className="px-6">
							<Search className="size-4 mr-2" />
							Search
						</Button>
					</div>
				</div>

				{/* Quick Searches */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<Card className="cursor-pointer hover:bg-muted/50 transition-colors">
						<CardHeader className="pb-3">
							<div className="flex items-center gap-2">
								<FolderOpen className="size-5 text-primary" />
								<CardTitle className="text-base">Search Properties</CardTitle>
							</div>
							<CardDescription>
								Find properties by name, address, or type
							</CardDescription>
						</CardHeader>
					</Card>

					<Card className="cursor-pointer hover:bg-muted/50 transition-colors">
						<CardHeader className="pb-3">
							<div className="flex items-center gap-2">
								<Users className="size-5 text-primary" />
								<CardTitle className="text-base">Search Tenants</CardTitle>
							</div>
							<CardDescription>
								Look up tenants by name, email, or phone
							</CardDescription>
						</CardHeader>
					</Card>

					<Card className="cursor-pointer hover:bg-muted/50 transition-colors">
						<CardHeader className="pb-3">
							<div className="flex items-center gap-2">
								<FileText className="size-5 text-primary" />
								<CardTitle className="text-base">Search Leases</CardTitle>
							</div>
							<CardDescription>
								Find leases by status, dates, or terms
							</CardDescription>
						</CardHeader>
					</Card>
				</div>

				{/* Recent Searches */}
				<div className="flex flex-col gap-4">
					<h2 className="text-xl font-semibold">Recent Searches</h2>
					<div className="flex flex-wrap gap-2">
						<Badge
							variant="secondary"
							className="cursor-pointer hover:bg-secondary/80"
						>
							&quot;Sunset Gardens&quot;
						</Badge>
						<Badge
							variant="secondary"
							className="cursor-pointer hover:bg-secondary/80"
						>
							&quot;Active Leases&quot;
						</Badge>
						<Badge
							variant="secondary"
							className="cursor-pointer hover:bg-secondary/80"
						>
							&quot;Downtown Loft&quot;
						</Badge>
						<Badge
							variant="secondary"
							className="cursor-pointer hover:bg-secondary/80"
						>
							&quot;Maintenance Requests&quot;
						</Badge>
					</div>
				</div>

				{/* Search Tips */}
				<Card>
					<CardHeader>
						<CardTitle>Search Tips</CardTitle>
						<CardDescription>
							Get better results with these search techniques
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
							<div>
								<strong>Property Search:</strong>
								<p className="text-muted-foreground mt-1">
									Try searching by property name, address, or type (e.g.,
									&quot;apartment&quot;, &quot;commercial&quot;)
								</p>
							</div>
							<div>
								<strong>Tenant Search:</strong>
								<p className="text-muted-foreground mt-1">
									Search by full name, email address, or phone number for best
									results
								</p>
							</div>
							<div>
								<strong>Lease Search:</strong>
								<p className="text-muted-foreground mt-1">
									Use status filters like &quot;active&quot;, &quot;expired&quot;, or search by date
									ranges
								</p>
							</div>
							<div>
								<strong>Advanced Search:</strong>
								<p className="text-muted-foreground mt-1">
									Use quotes for exact phrases and filters to narrow down
									results
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</PageLayout>
	)
}
