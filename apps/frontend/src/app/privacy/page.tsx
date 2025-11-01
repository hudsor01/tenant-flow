import Footer from '#components/layout/footer'
import { Navbar } from '#components/layout/navbar'
import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Privacy Policy | TenantFlow',
	description: 'TenantFlow Privacy Policy - Learn how we collect, use, and protect your data.'
}

export default function PrivacyPage() {
	return (
		<div className="relative min-h-screen flex flex-col">
			<Navbar />
			<div className="mx-auto min-h-screen max-w-4xl px-6 py-16 pt-32">
			<h1 className="mb-8 text-4xl font-bold">Privacy Policy</h1>
			<p className="mb-6 text-sm text-muted-foreground">
				Last Updated: October 5, 2025
			</p>

			<div className="prose prose-gray dark:prose-invert max-w-none">
				<section className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold">1. Introduction</h2>
					<p>
						Welcome to TenantFlow (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to
						protecting your privacy and ensuring the security of your personal
						information. This Privacy Policy explains how we collect, use,
						disclose, and safeguard your information when you use our property
						management software platform.
					</p>
					<p>
						By using TenantFlow, you consent to the data practices described in
						this policy. If you do not agree with our policies and practices,
						please do not use our services.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold">
						2. Information We Collect
					</h2>

					<h3 className="mb-3 text-xl font-semibold">
						2.1 Information You Provide
					</h3>
					<p>We collect information that you voluntarily provide to us:</p>
					<ul className="mb-4 ml-6 list-disc space-y-2">
						<li>
							<strong>Account Information:</strong> Name, email address, phone
							number, and password when you create an account
						</li>
						<li>
							<strong>Profile Information:</strong> Company name, business
							address, profile photo, and other details you add to your profile
						</li>
						<li>
							<strong>Property Data:</strong> Property addresses, unit details,
							rental rates, lease terms, and related property management
							information
						</li>
						<li>
							<strong>Tenant Information:</strong> Tenant names, contact
							information, lease agreements, payment history (as entered by you)
						</li>
						<li>
							<strong>Financial Data:</strong> Payment information for rent
							collection and subscription billing (processed securely through
							Stripe)
						</li>
						<li>
							<strong>Communications:</strong> Messages, support requests, and
							feedback you send to us
						</li>
					</ul>

					<h3 className="mb-3 text-xl font-semibold">
						2.2 Information Collected Automatically
					</h3>
					<p>
						When you use TenantFlow, we automatically collect certain
						information:
					</p>
					<ul className="mb-4 ml-6 list-disc space-y-2">
						<li>
							<strong>Usage Data:</strong> Pages viewed, features used, time
							spent on pages, and interaction patterns
						</li>
						<li>
							<strong>Device Information:</strong> Browser type, operating
							system, device type, IP address
						</li>
						<li>
							<strong>Log Data:</strong> Access times, error logs, and
							performance metrics
						</li>
						<li>
							<strong>Cookies and Tracking:</strong> We use cookies and similar
							technologies to enhance your experience and collect analytics data
						</li>
					</ul>

					<h3 className="mb-3 text-xl font-semibold">
						2.3 Third-Party Authentication
					</h3>
					<p>
						If you choose to sign in using Google OAuth, we collect:
					</p>
					<ul className="mb-4 ml-6 list-disc space-y-2">
						<li>Your Google account email address</li>
						<li>Your Google profile name and photo (if publicly available)</li>
						<li>
							OAuth tokens to authenticate your session (not stored permanently)
						</li>
					</ul>
					<p>
						We do not access your Google account data beyond what is necessary
						for authentication and will never read your emails, contacts, or
						other Google services without explicit permission.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold">
						3. How We Use Your Information
					</h2>
					<p>We use the collected information for the following purposes:</p>
					<ul className="mb-4 ml-6 list-disc space-y-2">
						<li>
							<strong>Service Delivery:</strong> Provide, maintain, and improve
							our property management platform
						</li>
						<li>
							<strong>Account Management:</strong> Create and manage your
							account, authenticate users
						</li>
						<li>
							<strong>Payment Processing:</strong> Process rent collection and
							subscription payments securely
						</li>
						<li>
							<strong>Communication:</strong> Send important updates, security
							alerts, and respond to support requests
						</li>
						<li>
							<strong>Analytics:</strong> Analyze usage patterns to improve user
							experience and platform performance
						</li>
						<li>
							<strong>Security:</strong> Detect, prevent, and address fraud,
							security issues, and technical problems
						</li>
						<li>
							<strong>Legal Compliance:</strong> Comply with legal obligations
							and enforce our Terms of Service
						</li>
					</ul>
				</section>

				<section className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold">
						4. How We Share Your Information
					</h2>
					<p>We do not sell your personal information. We may share your information in the following circumstances:</p>

					<h3 className="mb-3 text-xl font-semibold">4.1 Service Providers</h3>
					<p>We share data with trusted third-party service providers:</p>
					<ul className="mb-4 ml-6 list-disc space-y-2">
						<li>
							<strong>Supabase:</strong> Database hosting and authentication
						</li>
						<li>
							<strong>Stripe:</strong> Payment processing for rent collection
							and subscriptions
						</li>
						<li>
							<strong>Vercel:</strong> Frontend hosting and deployment
						</li>
						<li>
							<strong>Railway:</strong> Backend API hosting
						</li>
						<li>
							<strong>Resend:</strong> Transactional email delivery
						</li>
					</ul>
					<p>
						These providers are contractually obligated to protect your data and
						use it only for the services they provide to us.
					</p>

					<h3 className="mb-3 text-xl font-semibold">4.2 Legal Requirements</h3>
					<p>We may disclose your information if required by law or to:</p>
					<ul className="mb-4 ml-6 list-disc space-y-2">
						<li>Comply with legal processes or government requests</li>
						<li>Enforce our Terms of Service</li>
						<li>Protect the rights, property, or safety of TenantFlow, our users, or the public</li>
					</ul>

					<h3 className="mb-3 text-xl font-semibold">4.3 Business Transfers</h3>
					<p>
						If TenantFlow is involved in a merger, acquisition, or sale of
						assets, your information may be transferred. We will notify you of
						any such change and provide choices regarding your information.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold">5. Data Security</h2>
					<p>We implement industry-standard security measures to protect your data:</p>
					<ul className="mb-4 ml-6 list-disc space-y-2">
						<li>
							<strong>Encryption:</strong> All data is encrypted in transit
							(HTTPS/TLS) and at rest (AES-256)
						</li>
						<li>
							<strong>Access Controls:</strong> Role-based access control and
							multi-factor authentication options
						</li>
						<li>
							<strong>Secure Infrastructure:</strong> Hosted on SOC 2 compliant
							platforms (Supabase, Vercel, Railway)
						</li>
						<li>
							<strong>Regular Audits:</strong> Security monitoring, vulnerability
							scanning, and penetration testing
						</li>
						<li>
							<strong>Data Backups:</strong> Regular automated backups with
							disaster recovery procedures
						</li>
					</ul>
					<p>
						While we strive to protect your information, no method of
						transmission over the Internet is 100% secure. You are responsible
						for maintaining the confidentiality of your account credentials.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold">6. Data Retention</h2>
					<p>
						We retain your personal information for as long as necessary to
						provide our services and comply with legal obligations:
					</p>
					<ul className="mb-4 ml-6 list-disc space-y-2">
						<li>
							<strong>Active Accounts:</strong> Data is retained while your
							account is active
						</li>
						<li>
							<strong>Deleted Accounts:</strong> Data is deleted within 90 days
							after account deletion, except where required by law
						</li>
						<li>
							<strong>Financial Records:</strong> Payment and tax records
							retained for 7 years as required by law
						</li>
						<li>
							<strong>Backup Data:</strong> Backups are retained for 90 days for
							disaster recovery purposes
						</li>
					</ul>
				</section>

				<section className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold">7. Your Rights and Choices</h2>
					<p>You have the following rights regarding your personal information:</p>

					<h3 className="mb-3 text-xl font-semibold">7.1 Access and Portability</h3>
					<p>
						You can access and export your data at any time through your account
						settings or by contacting us at{' '}
						<a href="mailto:privacy@tenantflow.app" className="text-primary underline">
							privacy@tenantflow.app
						</a>
					</p>

					<h3 className="mb-3 text-xl font-semibold">7.2 Correction and Updates</h3>
					<p>
						You can update your account information, property data, and tenant
						records directly through the platform.
					</p>

					<h3 className="mb-3 text-xl font-semibold">7.3 Deletion</h3>
					<p>
						You can delete your account and associated data at any time through
						account settings. Some information may be retained as required by
						law or for legitimate business purposes.
					</p>

					<h3 className="mb-3 text-xl font-semibold">7.4 Marketing Communications</h3>
					<p>
						You can opt out of marketing emails by clicking &quot;unsubscribe&quot; in any
						marketing email or updating your communication preferences in
						account settings.
					</p>

					<h3 className="mb-3 text-xl font-semibold">7.5 Do Not Track</h3>
					<p>
						Some browsers support a &quot;Do Not Track&quot; feature. TenantFlow does not
						currently respond to Do Not Track signals.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold">8. Cookies and Tracking Technologies</h2>
					<p>We use the following types of cookies:</p>
					<ul className="mb-4 ml-6 list-disc space-y-2">
						<li>
							<strong>Essential Cookies:</strong> Required for basic platform
							functionality (authentication, security)
						</li>
						<li>
							<strong>Analytics Cookies:</strong> Help us understand usage
							patterns and improve the platform
						</li>
						<li>
							<strong>Preference Cookies:</strong> Remember your settings and
							preferences
						</li>
					</ul>
					<p>
						You can control cookie preferences through your browser settings.
						Disabling essential cookies may impact platform functionality.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold">9. Children&apos;s Privacy</h2>
					<p>
						TenantFlow is not intended for use by individuals under the age of
						18. We do not knowingly collect personal information from children.
						If we become aware that we have collected information from a child,
						we will delete it promptly.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold">10. International Users</h2>
					<p>
						TenantFlow is operated in the United States. If you are accessing
						our services from outside the U.S., your information will be
						transferred to and processed in the United States, which may have
						different data protection laws than your country.
					</p>
					<p>
						For users in the European Economic Area (EEA), we comply with GDPR
						requirements and provide appropriate safeguards for data transfers.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold">11. Third-Party Links</h2>
					<p>
						Our platform may contain links to third-party websites or services.
						We are not responsible for the privacy practices of these external
						sites. We encourage you to review their privacy policies before
						providing any personal information.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold">12. Changes to This Privacy Policy</h2>
					<p>
						We may update this Privacy Policy from time to time to reflect
						changes in our practices or for legal, operational, or regulatory
						reasons. We will notify you of significant changes by:
					</p>
					<ul className="mb-4 ml-6 list-disc space-y-2">
						<li>Posting the updated policy on this page</li>
						<li>Updating the &quot;Last Updated&quot; date at the top</li>
						<li>Sending an email notification for material changes</li>
					</ul>
					<p>
						Your continued use of TenantFlow after changes become effective
						constitutes acceptance of the updated policy.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold">13. Contact Us</h2>
					<p>
						If you have questions, concerns, or requests regarding this Privacy
						Policy or our data practices, please contact us:
					</p>
					<div className="mt-4 rounded-lg bg-muted p-6">
						<p className="mb-2">
							<strong>Email:</strong>{' '}
							<a href="mailto:privacy@tenantflow.app" className="text-primary underline">
								privacy@tenantflow.app
							</a>
						</p>
						<p className="mb-2">
							<strong>Support:</strong>{' '}
							<a href="mailto:support@tenantflow.app" className="text-primary underline">
								support@tenantflow.app
							</a>
						</p>
						<p>
							<strong>Response Time:</strong> We aim to respond to all privacy
							requests within 30 days
						</p>
					</div>
				</section>

				<section className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold">14. California Privacy Rights (CCPA)</h2>
					<p>
						If you are a California resident, you have additional rights under
						the California Consumer Privacy Act (CCPA):
					</p>
					<ul className="mb-4 ml-6 list-disc space-y-2">
						<li>Right to know what personal information we collect and how it&apos;s used</li>
						<li>Right to request deletion of your personal information</li>
						<li>Right to opt-out of the sale of personal information (we do not sell data)</li>
						<li>Right to non-discrimination for exercising your privacy rights</li>
					</ul>
					<p>
						To exercise these rights, email{' '}
						<a href="mailto:privacy@tenantflow.app" className="text-primary underline">
							privacy@tenantflow.app
						</a>
					</p>
				</section>

				<div className="mt-12 border-t pt-8 text-sm text-muted-foreground">
					<p>
						This Privacy Policy is effective as of October 5, 2025 and applies
						to all users of the TenantFlow platform.
					</p>
					<p className="mt-4">
						<strong>TenantFlow</strong> is a property management software
						platform designed to help property managers efficiently manage
						properties, tenants, leases, and financial operations.
					</p>
				</div>
			</div>
			</div>
			<Footer />
		</div>
	)
}
