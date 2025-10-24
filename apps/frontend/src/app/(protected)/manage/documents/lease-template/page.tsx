
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { FileText, Info } from 'lucide-react'

export default function LeaseTemplatePage() {
	return (
		<div className="container mx-auto py-6 space-y-6">
			<div className="flex items-center gap-3">
				<FileText className="size-8 text-primary" />
				<div>
					<h1 className="text-3xl font-bold">Lease Agreement Template</h1>
					<p className="text-muted-foreground">
						Professional lease agreement template with state compliance
					</p>
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				{/* Template Overview */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Info className="size-5" />
							Template Features
						</CardTitle>
						<CardDescription>
							Comprehensive residential lease agreement template
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-3">
							<div className="flex items-start gap-3">
								<div className="size-2 rounded-full bg-primary mt-2" />
								<div>
									<p className="font-medium">State Compliance</p>
									<p className="text-sm text-muted-foreground">
										Includes state-specific requirements and disclosures
									</p>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<div className="size-2 rounded-full bg-primary mt-2" />
								<div>
									<p className="font-medium">Professional Layout</p>
									<p className="text-sm text-muted-foreground">
										Clean, professional PDF formatting with signatures
									</p>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<div className="size-2 rounded-full bg-primary mt-2" />
								<div>
									<p className="font-medium">Comprehensive Terms</p>
									<p className="text-sm text-muted-foreground">
										Covers rent, deposits, policies, and legal requirements
									</p>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<div className="size-2 rounded-full bg-primary mt-2" />
								<div>
									<p className="font-medium">Customizable</p>
									<p className="text-sm text-muted-foreground">
										Property details, tenant info, and terms can be customized
									</p>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Template Actions */}
				<Card>
					<CardHeader>
						<CardTitle>Template Actions</CardTitle>
						<CardDescription>
							Generate customized lease agreements
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="pt-4">
							<p className="text-sm text-muted-foreground">
								<strong>Note:</strong> To generate customized lease agreements
								with your property and tenant data, use the lease generator in
								the Leases section.
							</p>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Template Sections */}
			<Card>
				<CardHeader>
					<CardTitle>Template Sections</CardTitle>
					<CardDescription>
						Overview of what&apos;s included in the lease agreement template
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						<div className="space-y-2">
							<h4 className="font-medium">1. Parties Information</h4>
							<p className="text-sm text-muted-foreground">
								Landlord and tenant details with contact information
							</p>
						</div>
						<div className="space-y-2">
							<h4 className="font-medium">2. Property Description</h4>
							<p className="text-sm text-muted-foreground">
								Complete property details, amenities, and specifications
							</p>
						</div>
						<div className="space-y-2">
							<h4 className="font-medium">3. Lease Terms</h4>
							<p className="text-sm text-muted-foreground">
								Rent amount, due dates, security deposit, and fees
							</p>
						</div>
						<div className="space-y-2">
							<h4 className="font-medium">4. Property Rules</h4>
							<p className="text-sm text-muted-foreground">
								Pet policy, smoking rules, guest policies, maintenance
							</p>
						</div>
						<div className="space-y-2">
							<h4 className="font-medium">5. Terms & Conditions</h4>
							<p className="text-sm text-muted-foreground">
								Legal terms, utilities, entry rights, termination
							</p>
						</div>
						<div className="space-y-2">
							<h4 className="font-medium">6. Signatures</h4>
							<p className="text-sm text-muted-foreground">
								Professional signature section with date fields
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
