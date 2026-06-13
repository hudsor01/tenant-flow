import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { Button } from "#components/ui/button";

const benefits = [
	"Free 14-day trial",
	"No credit card required",
	"CSV import covers your whole portfolio",
];

export function BlogInlineCta() {
	return (
		<div className="not-prose my-12 rounded-2xl border border-primary/20 bg-linear-to-br from-primary/5 via-primary/[0.02] to-transparent p-8">
			<div className="flex flex-col gap-4">
				<p className="text-sm font-semibold uppercase tracking-wider text-primary-text">
					TenantFlow
				</p>
				{/* Styled as a heading but rendered as <p>: this CTA is repeated
				    inside every post body, so an <h3> here pollutes each post's
				    heading outline with non-content marketing copy. */}
				<p className="text-2xl font-bold text-foreground">
					Managing rentals shouldn&apos;t be this hard
				</p>
				<p className="text-muted-foreground leading-relaxed">
					Track leases, maintenance, and tenants in one platform. Replace your
					spreadsheets and Dropbox folders with a single document vault.
				</p>
				<div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
					{benefits.map((b) => (
						<span key={b} className="flex items-center gap-1.5">
							<Check className="size-4 text-primary" />
							{b}
						</span>
					))}
				</div>
				<div className="mt-2">
					<Button asChild>
						<Link href="/pricing">
							Start Free Trial
							<ArrowRight className="size-4 ml-2" />
						</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
