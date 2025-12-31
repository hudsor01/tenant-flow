'use client'

import { Button } from '#components/ui/button'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from '#components/ui/empty'
import { Download, FileText } from 'lucide-react'
import Link from 'next/link'

export function ReportsEmptyState() {
	return (
		<Empty>
			<EmptyHeader>
				<EmptyMedia>
					<FileText className="size-12" />
				</EmptyMedia>
				<EmptyTitle>No report data yet</EmptyTitle>
				<EmptyDescription>
					Once payments, leases, and maintenance activity are recorded,
					reports will populate here.
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Link href="/reports/generate">
					<Button>
						<Download className="size-4 mr-2" />
						Generate a report
					</Button>
				</Link>
			</EmptyContent>
		</Empty>
	)
}
