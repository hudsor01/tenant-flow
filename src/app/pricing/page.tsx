import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import { PageLayout } from "#components/layout/page-layout";
import { LeadCaptureModal } from "#components/marketing/lead-capture-modal";
import { StickyConversionCta } from "#components/marketing/sticky-conversion-cta";
import { TestimonialsSection } from "#components/sections/testimonials-section";
import { JsonLdScript } from "#components/seo/json-ld-script";
import { Badge } from "#components/ui/badge";
import { getSiteUrl } from "#lib/generate-metadata";
import { createBreadcrumbJsonLd } from "#lib/seo/breadcrumbs";
import { createFaqJsonLd } from "#lib/seo/faq-schema";
import { createPageMetadata } from "#lib/seo/page-metadata";
import { createSoftwareApplicationJsonLd } from "#lib/seo/software-application-schema";
import { realTestimonials } from "../../data/testimonials";
import { PricingSection } from "./_components/pricing-section";
import {
	PricingCtaSection,
	PricingFaqSection,
	PricingStatsGrid,
	pricingFaqs,
} from "./pricing-content";

// ISR — pricing copy + JSON-LD are static; refresh once an hour to pick up
// any pricing-content.tsx edits without a full redeploy.
export const revalidate = 3600;

export const metadata: Metadata = createPageMetadata({
	title: "Property Management Software Pricing | Plans from $19/mo",
	description:
		"Property management software for independent landlords. Starter ($19/mo, 5 properties), Growth ($49/mo, 20 properties), Max ($149/mo, unlimited properties). 14-day free trial, no credit card required.",
	path: "/pricing",
	ogImage: "/api/og/pricing",
});

export default async function PricingPage() {
	const faqJsonLd = createFaqJsonLd(
		pricingFaqs.map((faq) => ({ question: faq.question, answer: faq.answer })),
	);
	const breadcrumbJsonLd = createBreadcrumbJsonLd("/pricing");
	// SaaS is software, not a shippable retail Product — use SoftwareApplication
	// so the page isn't pulled into Google's Merchant-listings validation (which
	// requires shipping + return policy). The 3 tiers collapse to an
	// AggregateOffer price range ($19–$149).
	const softwareJsonLd = createSoftwareApplicationJsonLd({
		name: "TenantFlow Property Management Software",
		description:
			"Property management software for independent landlords. Starter $19/mo (5 properties), Growth $49/mo (20 properties), Max $149/mo (unlimited properties). 14-day free trial, no credit card required.",
		url: `${getSiteUrl()}/pricing`,
		offers: [{ price: "19.00" }, { price: "49.00" }, { price: "149.00" }],
	});

	return (
		<PageLayout>
			<JsonLdScript schema={faqJsonLd} />
			<JsonLdScript schema={breadcrumbJsonLd} />
			<JsonLdScript schema={softwareJsonLd} />
			{/* Minimal Hero with Pricing Above the Fold */}
			<section className="relative overflow-hidden section-spacing animate-in fade-in duration-700">
				<div className="relative mx-auto flex max-w-7xl flex-col gap-12 px-6 text-center lg:px-8">
					<div className="flex flex-col items-center gap-6">
						<Badge variant="trustIndicator" size="trust">
							<div
								className="h-2 w-2 rounded-full bg-primary animate-pulse"
								aria-hidden="true"
							/>
							Built for landlords — 14-day free trial, no credit card
						</Badge>
						<h1 className="text-balance typography-h1 tracking-tight text-foreground sm:text-5xl lg:text-6xl">
							Simple, transparent pricing for{" "}
							<span className="hero-highlight">every portfolio</span>
						</h1>
						<p className="mx-auto max-w-2xl text-balance text-lg text-muted-foreground">
							Choose your plan and start your 14-day free trial. Upgrade anytime
							as your portfolio grows.
						</p>
					</div>
					<div id="plans">
						<PricingSection />
					</div>
					<div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
						<div className="flex items-center gap-2">
							<CheckCircle2 className="h-4 w-4 text-success" />
							No credit card required
						</div>
						<div className="flex items-center gap-2">
							<CheckCircle2 className="h-4 w-4 text-success" />
							14-day free trial
						</div>
						<div className="flex items-center gap-2">
							<CheckCircle2 className="h-4 w-4 text-success" />
							Cancel anytime
						</div>
					</div>
				</div>
			</section>
			<PricingStatsGrid />
			<TestimonialsSection
				className="animate-in fade-in duration-700 delay-200"
				testimonials={realTestimonials}
			/>
			<PricingFaqSection />
			<PricingCtaSection />
			<StickyConversionCta />
			<LeadCaptureModal />
		</PageLayout>
	);
}
