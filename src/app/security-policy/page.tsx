import type { Metadata } from "next";
import { PageLayout } from "#components/layout/page-layout";
import { JsonLdScript } from "#components/seo/json-ld-script";
import { createBreadcrumbJsonLd } from "#lib/seo/breadcrumbs";
import { createPageMetadata } from "#lib/seo/page-metadata";

export const metadata: Metadata = createPageMetadata({
	title: "Security Policy & Vulnerability Disclosure",
	description:
		"How to report a vulnerability in TenantFlow, our response timeline and safe harbor, and the controls that protect landlord account data and tenant records.",
	path: "/security-policy",
});

export default function SecurityPolicyPage() {
	return (
		<PageLayout>
			<JsonLdScript schema={createBreadcrumbJsonLd("/security-policy")} />
			<div className="mx-auto min-h-screen max-w-4xl px-6 lg:px-8 section-spacing">
				<h1 className="mb-8 typography-h1">Security Policy</h1>
				<p className="mb-6 text-muted-foreground">
					Last Updated: November 26, 2026
				</p>

				<div className="prose prose-gray dark:prose-invert max-w-none">
					<section className="mb-8">
						<h2 id="commitment" className="mb-4 typography-h3 scroll-mt-24">
							1. Commitment to Security
						</h2>
						{/* The concrete controls (2026-11-24 SEO audit SP4). */}
						<p>
							TenantFlow holds landlords&apos; property records, leases, rent
							ledgers, documents and tenant contact details. These controls
							protect them:
						</p>
						<ul className="mt-5 mb-4 ml-6 pl-6.5 list-disc [&>li]:my-2">
							<li>
								Data is encrypted in transit (TLS) and at rest, on Supabase.
							</li>
							<li>
								Postgres row-level security isolates each landlord&apos;s data
								on every request. Tenants never sign in, so there are no tenant
								accounts to attack.
							</li>
							<li>
								Owners can turn on two-factor sign-in with an authenticator app
								in Settings.
							</li>
							<li>
								Lease-signing and rental-application links are stored only as
								hashes.
							</li>
							<li>
								Error reports drop the query string from every URL and replace
								signing and application link tokens before they leave the
								browser or server.
							</li>
							<li>
								Owners can download their data and request account deletion from
								Settings at any time.
							</li>
						</ul>
						<p>
							We appreciate the work of security researchers who help keep these
							controls sound.
						</p>
						<p>
							This policy outlines how to report security vulnerabilities
							responsibly and what you can expect from us in return.
						</p>
					</section>

					<section className="mb-8">
						<h2 id="reporting" className="mb-4 typography-h3 scroll-mt-24">
							2. Reporting a Vulnerability
						</h2>
						<p>
							If you discover a security vulnerability, please report it to us
							by email:
						</p>
						<ul className="mt-5 mb-4 ml-6 pl-6.5 list-disc [&>li]:my-2">
							<li>
								Email:{" "}
								<a
									href="mailto:security@tenantflow.app"
									className="text-primary-text underline"
								>
									security@tenantflow.app
								</a>
							</li>
							<li>
								Encrypt sensitive details using our{" "}
								<a
									href="/.well-known/pgp-key.txt"
									className="text-primary-text underline"
								>
									PGP public key
								</a>
							</li>
						</ul>
						<p>Please include the following in your report:</p>
						<ul className="mt-5 mb-4 ml-6 pl-6.5 list-disc [&>li]:my-2">
							<li>
								A clear description of the vulnerability and its potential
								impact
							</li>
							<li>Step-by-step instructions to reproduce the issue</li>
							<li>Any relevant URLs, screenshots, or proof-of-concept code</li>
							<li>Your contact information for follow-up questions</li>
						</ul>
					</section>

					<section className="mb-8">
						<h2
							id="response-timeline"
							className="mb-4 typography-h3 scroll-mt-24"
						>
							3. Response Timeline
						</h2>
						<ul className="mt-5 mb-4 ml-6 pl-6.5 list-disc [&>li]:my-2">
							<li>
								<strong>Acknowledgment:</strong> We aim to acknowledge your
								report within 24 hours.
							</li>
							<li>
								<strong>Assessment:</strong> We will assess the severity and
								provide an initial response within 72 hours.
							</li>
							<li>
								<strong>Resolution:</strong> Critical and high-severity issues
								are prioritized for immediate remediation. We will keep you
								informed of our progress.
							</li>
							<li>
								<strong>Disclosure:</strong> We follow a 90-day coordinated
								disclosure timeline. We will work with you to agree on a public
								disclosure date after the fix has been deployed.
							</li>
						</ul>
					</section>

					<section className="mb-8">
						<h2 id="scope" className="mb-4 typography-h3 scroll-mt-24">
							4. Scope
						</h2>
						<h3 className="mb-3 typography-h4">4.1 In Scope</h3>
						<ul className="mt-5 mb-4 ml-6 pl-6.5 list-disc [&>li]:my-2">
							<li>tenantflow.app and all subdomains</li>
							<li>Authentication and authorization vulnerabilities</li>
							<li>
								Data validation and injection attacks (SQL injection, XSS, CSRF,
								SSRF)
							</li>
							<li>Remote code execution</li>
							<li>Privilege escalation</li>
							<li>Information disclosure (PII, financial data, credentials)</li>
							<li>Row Level Security bypass in database access</li>
							<li>Payment processing vulnerabilities (Stripe integration)</li>
							<li>Edge Function and API endpoint security issues</li>
						</ul>

						<h3 className="mb-3 typography-h4">4.2 Out of Scope</h3>
						<ul className="mt-5 mb-4 ml-6 pl-6.5 list-disc [&>li]:my-2">
							<li>Social engineering attacks against employees or users</li>
							<li>Physical security issues</li>
							<li>Denial of service (DoS/DDoS) attacks</li>
							<li>Spam or content injection without security impact</li>
							<li>Issues requiring extensive or unlikely user interaction</li>
							<li>
								Vulnerabilities in third-party services (Stripe, Supabase,
								Vercel) — please report directly to those providers
							</li>
							<li>Outdated software versions without a demonstrated exploit</li>
							<li>
								Missing security headers that do not lead to a direct
								vulnerability
							</li>
						</ul>
					</section>

					<section className="mb-8">
						<h2 id="safe-harbor" className="mb-4 typography-h3 scroll-mt-24">
							5. Safe Harbor
						</h2>
						<p>
							We consider security research conducted in accordance with this
							policy to be authorized, and we will not pursue legal action
							against researchers who:
						</p>
						<ul className="mt-5 mb-4 ml-6 pl-6.5 list-disc [&>li]:my-2">
							<li>Act in good faith and follow this disclosure policy</li>
							<li>
								Avoid accessing, modifying, or deleting data belonging to other
								users
							</li>
							<li>Do not disrupt or degrade the service for other users</li>
							<li>
								Do not exploit vulnerabilities beyond what is necessary to
								demonstrate the issue
							</li>
							<li>
								Report vulnerabilities promptly and do not publicly disclose
								before coordination with us
							</li>
						</ul>
						<p>
							If legal action is initiated by a third party against you for
							activities conducted in accordance with this policy, we will take
							reasonable steps to make it known that your actions were
							authorized under this program.
						</p>
					</section>

					<section className="mb-8">
						<h2 id="recognition" className="mb-4 typography-h3 scroll-mt-24">
							6. Recognition
						</h2>
						<p>
							We value the contributions of security researchers. With your
							permission, we will acknowledge your contribution after the issue
							has been resolved. We do not currently offer monetary bounties,
							but we are open to discussing this for critical findings.
						</p>
					</section>

					<section className="mb-8">
						<h2 id="contact" className="mb-4 typography-h3 scroll-mt-24">
							7. Contact &amp; Monitored Inboxes
						</h2>
						<p className="mb-0">
							For security-related inquiries, contact us at{" "}
							<a
								href="mailto:security@tenantflow.app"
								className="text-primary-text underline"
							>
								security@tenantflow.app
							</a>
							. Acknowledged within 24 hours per § 3.
						</p>
						<p className="mt-3">
							For support and product questions, visit the{" "}
							<a href="/help" className="text-primary-text underline">
								Help Center
							</a>{" "}
							or email{" "}
							<a
								href="mailto:support@tenantflow.app"
								className="text-primary-text underline"
							>
								support@tenantflow.app
							</a>
							. Responded to within 1 business day (US business hours, Monday
							through Friday).
						</p>
					</section>
				</div>
			</div>
		</PageLayout>
	);
}
