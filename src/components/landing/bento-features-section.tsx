import {
	Building,
	FileText,
	FolderArchive,
	PieChart,
	Users,
	Wrench,
} from "lucide-react";
import { BentoCard, BentoGrid } from "#components/ui/bento-grid";
import { BlurFade } from "#components/ui/blur-fade";
import {
	AnalyticsPreview,
	LeaseDocuments,
	MaintenanceBoard,
	PropertyGrid,
	TenantListBackground,
	VaultPreview,
} from "./feature-backgrounds";

// Each card links to the page that goes deeper on its feature, with anchor
// text naming it (2026-11-24 SEO audit F2: all six said "Start free" and
// went to /pricing).
export function BentoFeaturesSection() {
	return (
		<section className="section-spacing">
			<div className="max-w-7xl mx-auto px-6 lg:px-8">
				<BlurFade delay={0.3}>
					<div className="text-center mb-16 space-y-6">
						<h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
							The tools you need to{" "}
							<span className="hero-highlight">manage properties</span>
						</h2>
						<p className="text-muted-foreground text-lg leading-relaxed max-w-3xl mx-auto">
							From lease management to maintenance tracking, TenantFlow keeps
							your property portfolio in one place
						</p>
					</div>

					<BentoGrid>
						<BentoCard
							name="Property Management"
							className="md:col-span-2"
							background={<PropertyGrid />}
							Icon={Building}
							description="Track properties and units with occupancy and portfolio analytics. Up to 5/20/unlimited properties depending on plan."
							href="/blog/how-tenantflow-organizes-your-properties-and-units-in-one-afternoon"
							cta="Set up properties and units"
						/>
						<BentoCard
							name="Document Vault"
							className="md:col-span-1 md:row-span-2"
							background={<VaultPreview />}
							Icon={FolderArchive}
							description="Per-entity document storage with global search, multi-select filters, date range, and bulk download"
							href="/blog/how-tenantflow-organizes-your-leases-receipts-and-inspection-photos-in-one-place"
							cta="Organize rental documents"
						/>
						<BentoCard
							name="Tenant Records"
							className="md:col-span-1"
							background={<TenantListBackground />}
							Icon={Users}
							description="Track tenant contacts and lease history. No tenant logins — landlords own every record"
							href="/blog/how-tenantflow-streamlines-application-collection-for-independent-landlords"
							cta="Take rental applications online"
						/>
						<BentoCard
							name="Maintenance Tracking"
							className="md:col-span-1"
							background={<MaintenanceBoard />}
							Icon={Wrench}
							description="Kanban-style board with photo uploads and vendor assignment"
							href="/resources/seasonal-maintenance-checklist"
							cta="Seasonal maintenance checklist"
						/>
						<BentoCard
							name="Lease Management"
							className="md:col-span-1"
							background={<LeaseDocuments />}
							Icon={FileText}
							description="Digital lease signing on Growth and Max plans, plus a lease template builder with PDF download"
							href="/blog/tenantflow-how-lease-renewal-reminders-keep-independent-landlords-organized"
							cta="Lease renewal reminders"
						/>
						<BentoCard
							name="Financial Analytics"
							className="md:col-span-2"
							background={<AnalyticsPreview />}
							Icon={PieChart}
							description="Rent ledger, income and cash flow statements, and CSV-exportable financial reports for your entire portfolio"
							href="/blog/how-tenantflow-s-rent-ledger-brings-order-to-your-rental-income"
							cta="How the rent ledger works"
						/>
					</BentoGrid>
				</BlurFade>
			</div>
		</section>
	);
}
