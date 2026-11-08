import {
	Building2,
	DollarSign,
	FolderArchive,
	HelpCircle,
	LayoutDashboard,
	Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import { BlurFade } from "#components/ui/blur-fade";
import { cn } from "#lib/utils";

interface FeaturesSectionDemoProps {
	className?: string;
}

export default function FeaturesSectionDemo({
	className,
}: FeaturesSectionDemoProps) {
	const features = [
		{
			title: "Property Management",
			description:
				"Track leases, renewals, and maintenance in one place — Starter handles up to 5 properties, Growth up to 20, Max unlimited.",
			icon: <Building2 />,
		},
		{
			title: "Fast Setup",
			description:
				"Import your portfolio via CSV and start tracking the same day. No long onboarding, no implementation team required.",
			icon: <Zap />,
		},
		{
			title: "Transparent Pricing",
			description:
				"Three plans that scale with your portfolio. No hidden fees, no contracts, no charge for tenant accounts that don't exist.",
			icon: <DollarSign />,
		},
		{
			title: "Multi-Property Dashboard",
			description:
				"Manage your entire portfolio from one unified dashboard with revenue, occupancy, and maintenance metrics.",
			icon: <LayoutDashboard />,
		},
		{
			title: "Email Support",
			description:
				"Email support on every plan. Phone and priority support on Growth and Max. No tenant tickets to triage.",
			icon: <HelpCircle />,
		},
		{
			title: "Document Vault",
			description:
				"Per-entity storage with global search, multi-select filters, date-range, and tax-season zip downloads. Custom categories per landlord.",
			icon: <FolderArchive />,
		},
	];

	return (
		<section
			className={cn(
				"section-spacing relative overflow-hidden bg-transparent",
				className,
			)}
		>
			<div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
				<div className="text-center mb-16 max-w-3xl mx-auto">
					<h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight text-foreground mb-4 leading-tight">
						Everything you need for
						<span className="text-primary-text block">
							professional property management
						</span>
					</h2>
					<p className="text-xl text-muted-foreground leading-relaxed">
						Purpose-built for the missing middle: too big for spreadsheets, too
						small for enterprise solutions.
					</p>
				</div>

				<div
					className={cn(
						"grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 relative z-10",
					)}
				>
					{features.map((feature, index) => (
						<BlurFade key={feature.title} delay={0.2 + index * 0.1}>
							<Feature {...feature} />
						</BlurFade>
					))}
				</div>
			</div>
		</section>
	);
}

interface FeatureProps {
	title: string;
	description: string;
	icon: ReactNode;
}

const Feature = ({ title, description, icon }: FeatureProps) => {
	return (
		// A feature card is not a control: no hover state (66.2-39 part I).
		<div className="relative p-6 rounded bg-card/50 border border-border/40 backdrop-blur-sm">
			<div className="mb-4 relative z-10">
				<div className="size-12 rounded bg-primary/10 text-primary flex-center">
					<div className="size-6">{icon}</div>
				</div>
			</div>

			<h3 className="typography-large tracking-tight text-foreground mb-3 leading-tight">
				{title}
			</h3>

			<p className="mb-0 text-muted-foreground leading-relaxed text-sm">
				{description}
			</p>
		</div>
	);
};
