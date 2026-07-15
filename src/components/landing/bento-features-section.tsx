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
import { LazySection } from "#components/ui/lazy-section";
import { SectionSkeleton } from "#components/ui/section-skeleton";
import {
	AnalyticsPreview,
	LeaseDocuments,
	MaintenanceBoard,
	PropertyGrid,
	TenantListBackground,
	VaultPreview,
} from "./feature-backgrounds";

export function BentoFeaturesSection() {
	return (
		<LazySection
			fallback={<SectionSkeleton height={600} variant="grid" />}
			minHeight={600}
		>
			<section className="section-spacing">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<BlurFade delay={0.3} inView>
						<div className="text-center mb-16 space-y-6">
							<h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
								Everything you need to{" "}
								<span className="hero-highlight">manage properties</span>
							</h2>
							<p className="text-muted-foreground text-lg leading-relaxed max-w-3xl mx-auto">
								From lease management to maintenance tracking, TenantFlow gives
								you complete control over your property portfolio
							</p>
						</div>

						<BentoGrid>
							<BentoCard
								name="Property Management"
								className="md:col-span-2"
								background={<PropertyGrid />}
								Icon={Building}
								description="Track properties and units with occupancy and portfolio analytics. Up to 5/20/unlimited properties depending on plan."
								href="/pricing"
								cta="Start free"
							/>
							<BentoCard
								name="Document Vault"
								className="md:col-span-1 md:row-span-2"
								background={<VaultPreview />}
								Icon={FolderArchive}
								description="Per-entity document storage with global search, multi-select filters, date range, and bulk download"
								href="/pricing"
								cta="Start free"
							/>
							<BentoCard
								name="Tenant Records"
								className="md:col-span-1"
								background={<TenantListBackground />}
								Icon={Users}
								description="Track tenant contacts and lease history. No tenant logins — landlords own every record"
								href="/pricing"
								cta="Start free"
							/>
							<BentoCard
								name="Maintenance Tracking"
								className="md:col-span-1"
								background={<MaintenanceBoard />}
								Icon={Wrench}
								description="Kanban-style board with photo uploads and vendor assignment"
								href="/pricing"
								cta="Start free"
							/>
							<BentoCard
								name="Lease Management"
								className="md:col-span-1"
								background={<LeaseDocuments />}
								Icon={FileText}
								description="Digital lease signing on Growth and Max plans, with state-aware templates"
								href="/pricing"
								cta="Start free"
							/>
							<BentoCard
								name="Financial Analytics"
								className="md:col-span-2"
								background={<AnalyticsPreview />}
								Icon={PieChart}
								description="Revenue tracking, NOI calculations, and exportable financial reports for your entire portfolio"
								href="/pricing"
								cta="Start free"
							/>
						</BentoGrid>
					</BlurFade>
				</div>
			</section>
		</LazySection>
	);
}
