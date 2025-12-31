import { FileText } from 'lucide-react'
import { TenantNoticeTemplate } from '../components/tenant-notice-template.client'

export default function TenantNoticeTemplatePage() {
	return (
		<div className="container mx-auto space-y-6 py-6">
			<header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-3">
					<FileText className="hidden size-10 text-primary sm:block" />
					<div>
						<h1 className="typography-h2 tracking-tight">Tenant Notice</h1>
						<p className="text-muted-foreground">
							Create compliant late rent, lease violation, or move-out
							notices.
						</p>
					</div>
				</div>
			</header>

			<TenantNoticeTemplate />
		</div>
	)
}
