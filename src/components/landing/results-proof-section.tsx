import { Download, FileSignature, FolderArchive, Search } from "lucide-react";
import { BlurFade } from "#components/ui/blur-fade";
import { LazySection } from "#components/ui/lazy-section";
import { SectionSkeleton } from "#components/ui/section-skeleton";

// Phase 67 cleanup: replaced unsubstantiated marketing numbers with
// feature counts that map directly to shipped product capabilities.
// If we want to put real percentages back, they need a documented
// methodology backed by customer data.
const stats = [
	{
		icon: FolderArchive,
		value: "5",
		label: "Entity branches in the vault",
	},
	{
		icon: Search,
		value: "Global",
		label: "Full-text search across docs",
	},
	{
		icon: Download,
		value: "500",
		label: "Tax-season zip cap",
	},
	{
		icon: FileSignature,
		value: "Growth+",
		label: "Lease e-sign tier",
	},
];

export function ResultsProofSection() {
	return (
		<LazySection
			fallback={<SectionSkeleton height={500} variant="grid" />}
			minHeight={500}
		>
			<section className="section-spacing bg-muted/30">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<BlurFade delay={0.4} inView>
						<div className="text-center mb-16">
							<h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
								What ships in the box
							</h2>
							<p className="text-muted-foreground text-lg max-w-3xl mx-auto">
								Every plan starts with the document vault. Higher tiers unlock
								more e-sign volume and more storage.
							</p>
						</div>

						<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
							{stats.map((stat) => (
								<div key={stat.label} className="text-center group">
									<div className="icon-container-lg bg-primary/10 text-primary mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
										<stat.icon className="size-8" />
									</div>
									<div className="typography-h1 text-foreground mb-2">
										{stat.value}
									</div>
									<div className="text-muted-foreground">{stat.label}</div>
								</div>
							))}
						</div>
					</BlurFade>
				</div>
			</section>
		</LazySection>
	);
}
