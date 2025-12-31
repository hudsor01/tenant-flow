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

export default function DocumentsClient() {
	return (
		<div className="container mx-auto space-y-6 py-6">
			<div className="flex items-center gap-3">
				<FileText className="size-8 text-primary" />
				<div>
					<h1 className="typography-h2">Documents</h1>
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
						<div className="space-y-2 text-muted">
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
								<Link href="/documents/lease-template">
									<Eye className="mr-2 size-4" />
									View Details
								</Link>
							</Button>
							<Button size="sm" asChild>
								<Link href="/documents/lease-template">
									<ArrowRight className="mr-2 size-4" />
									Access Template
								</Link>
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Property Inspection Report Template */}
				<Card className="transition-all hover:shadow-md">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<FileText className="size-5" />
							Property Inspection Report
						</CardTitle>
						<CardDescription>
							Pre/post move-in checklists with photo documentation
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2 text-muted">
							<p>Include every room, fixture, and appliance with photo proof:</p>
							<ul className="list-disc space-y-1 pl-4">
								<li>Move-in/move-out checklist builder</li>
								<li>Photo uploads and notes</li>
								<li>Inspector signatures</li>
								<li>Exportable PDF summary</li>
							</ul>
						</div>
						<div className="flex gap-2">
							<Button variant="outline" size="sm" asChild>
								<Link href="/documents/templates/property-inspection">
									<Eye className="mr-2 size-4" />
									View Details
								</Link>
							</Button>
							<Button size="sm" asChild>
								<Link href="/documents/templates/property-inspection">
									<ArrowRight className="mr-2 size-4" />
									Access Template
								</Link>
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Rental Application Template */}
				<Card className="transition-all hover:shadow-md">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<FileText className="size-5" />
							Rental Application
						</CardTitle>
						<CardDescription>
							Tenant application forms with screening-ready fields
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2 text-muted">
							<p>Collect applicant data and authorize screenings:</p>
							<ul className="list-disc space-y-1 pl-4">
								<li>Employment and income verification</li>
								<li>Background check consent</li>
								<li>Reference tracking</li>
								<li>Custom screening criteria</li>
							</ul>
						</div>
						<div className="flex gap-2">
							<Button variant="outline" size="sm" asChild>
								<Link href="/documents/templates/rental-application">
									<Eye className="mr-2 size-4" />
									View Details
								</Link>
							</Button>
							<Button size="sm" asChild>
								<Link href="/documents/templates/rental-application">
									<ArrowRight className="mr-2 size-4" />
									Access Template
								</Link>
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Tenant Notice Template */}
				<Card className="transition-all hover:shadow-md">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<FileText className="size-5" />
							Tenant Notice
						</CardTitle>
						<CardDescription>
							Late rent, lease violation, and move-out notices
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2 text-muted">
							<p>Automate compliant communication with residents:</p>
							<ul className="list-disc space-y-1 pl-4">
								<li>Late rent notices with cure dates</li>
								<li>Lease violation escalation</li>
								<li>Move-out communication</li>
								<li>State-specific clauses</li>
							</ul>
						</div>
						<div className="flex gap-2">
							<Button variant="outline" size="sm" asChild>
								<Link href="/documents/templates/tenant-notice">
									<Eye className="mr-2 size-4" />
									View Details
								</Link>
							</Button>
							<Button size="sm" asChild>
								<Link href="/documents/templates/tenant-notice">
									<ArrowRight className="mr-2 size-4" />
									Access Template
								</Link>
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Maintenance Request Form Template */}
				<Card className="transition-all hover:shadow-md">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<FileText className="size-5" />
							Maintenance Request Form
						</CardTitle>
						<CardDescription>
							Printable work order forms for vendors
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2 text-muted">
							<p>Standardize maintenance workflows and approvals:</p>
							<ul className="list-disc space-y-1 pl-4">
								<li>Priority and scheduling fields</li>
								<li>Access instructions</li>
								<li>Vendor-ready work orders</li>
								<li>Owner branding</li>
							</ul>
						</div>
						<div className="flex gap-2">
							<Button variant="outline" size="sm" asChild>
								<Link href="/documents/templates/maintenance-request">
									<Eye className="mr-2 size-4" />
									View Details
								</Link>
							</Button>
							<Button size="sm" asChild>
								<Link href="/documents/templates/maintenance-request">
									<ArrowRight className="mr-2 size-4" />
									Access Template
								</Link>
							</Button>
						</div>
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
							<Link href="/leases">
								<FileText className="mr-2 size-4" />
								Generate Custom Lease
							</Link>
						</Button>
						<Button variant="outline" className="justify-start" asChild>
							<Link href="/documents/lease-template">
								<Download className="mr-2 size-4" />
								Download Template
							</Link>
						</Button>
						<Button variant="outline" className="justify-start" asChild>
							<Link href="/properties">
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
