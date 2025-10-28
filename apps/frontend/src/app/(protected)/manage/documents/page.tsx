'use client'

import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { ArrowRight, Download, Eye, FileText } from 'lucide-react'
import Link from 'next/link'

export default function DocumentsPage() {
	return (
		<div className="container mx-auto space-y-6 py-6">
			<div className="flex items-center gap-3">
				<FileText className="size-8 text-primary" />
				<div>
					<h1 className="text-3xl font-bold">Documents</h1>
					<p className="text-muted-foreground">
						Professional property management document templates
					</p>
				</div>
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				{/* Lease Agreement Template */}
				<Card className="transition-all hover:shadow-md">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<FileText className="size-5" />
							Lease Agreement Template
						</CardTitle>
						<CardDescription>
							Professional residential lease agreement with state compliance
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2 text-sm text-muted-foreground">
							<p>Comprehensive lease template including:</p>
							<ul className="list-disc space-y-1 pl-4">
								<li>State-specific requirements</li>
								<li>Professional PDF formatting</li>
								<li>Signature sections</li>
								<li>Legal compliance features</li>
							</ul>
						</div>
						<div className="flex gap-2">
							<Button variant="outline" size="sm" asChild>
								<Link href="/manage/documents/lease-template">
									<Eye className="mr-2 size-4" />
									View Details
								</Link>
							</Button>
							<Button size="sm" asChild>
								<Link href="/manage/documents/lease-template">
									<ArrowRight className="mr-2 size-4" />
									Access Template
								</Link>
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Future Templates Placeholder */}
				<Card className="opacity-60">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<FileText className="size-5" />
							Additional Templates
						</CardTitle>
						<CardDescription>
							More document templates coming soon
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2 text-sm text-muted-foreground">
							<p>Future templates will include:</p>
							<ul className="list-disc space-y-1 pl-4">
								<li>Property inspection reports</li>
								<li>Rental applications</li>
								<li>Tenant notices</li>
								<li>Maintenance request forms</li>
							</ul>
						</div>
						<Button size="sm" disabled>
							Coming Soon
						</Button>
					</CardContent>
				</Card>
			</div>

			{/* Quick Actions */}
			<Card>
				<CardHeader>
					<CardTitle>Quick Actions</CardTitle>
					<CardDescription>Common document-related tasks</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-3 md:grid-cols-3">
						<Button variant="outline" className="justify-start" asChild>
							<Link href="/manage/leases">
								<FileText className="mr-2 size-4" />
								Generate Custom Lease
							</Link>
						</Button>
						<Button variant="outline" className="justify-start" asChild>
							<Link href="/manage/documents/lease-template">
								<Download className="mr-2 size-4" />
								Download Template
							</Link>
						</Button>
						<Button variant="outline" className="justify-start" asChild>
							<Link href="/manage/properties">
								<FileText className="mr-2 size-4" />
								View Properties
							</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
