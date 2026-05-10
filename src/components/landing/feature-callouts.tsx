import { FolderArchive, FileSignature, Shield } from 'lucide-react'

const callouts = [
	{
		icon: <FolderArchive className="size-5" />,
		title: 'Document Vault',
		description: 'Search, filter, and bulk-download every lease, receipt, and inspection report'
	},
	{
		icon: <FileSignature className="size-5" />,
		title: 'Lease E-Sign',
		description: 'Send leases for signature on Growth and Max plans'
	},
	{
		icon: <Shield className="size-5" />,
		title: 'Owner-Only Access',
		description: 'Row-level security per landlord. Tenants are records, never users'
	}
]

export function FeatureCallouts() {
	return (
		<section className="section-spacing-compact">
			<div className="max-w-7xl mx-auto px-6 lg:px-8">
				<div className="grid gap-3 md:grid-cols-3">
					{callouts.map(callout => (
						<div
							key={callout.title}
							className="flex items-center gap-3 card-standard px-4 py-3 hover:border-primary/30 hover:shadow-sm transition-all duration-200"
						>
							<div className="icon-container-md icon-container-primary">
								{callout.icon}
							</div>
							<div>
								<div className="font-semibold text-foreground text-sm">
									{callout.title}
								</div>
								<div className="text-muted-foreground text-xs">
									{callout.description}
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}
