import Link from 'next/link'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '#components/ui/breadcrumb'

export interface CompareBreadcrumbProps {
	competitorName: string
}

/**
 * Visible breadcrumb for /compare/[competitor] pages.
 *
 * Path MUST match the segments emitted by `createBreadcrumbJsonLd` for the
 * same competitor so visible-vs-schema parity is preserved.
 */
export function CompareBreadcrumb({ competitorName }: CompareBreadcrumbProps) {
	return (
		<div className="max-w-7xl mx-auto px-6 lg:px-8 pt-6">
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link href="/">Home</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link href="/compare">Compare</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>TenantFlow vs {competitorName}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
		</div>
	)
}
