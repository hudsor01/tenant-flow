import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Terms of Service | TenantFlow',
	description:
		'TenantFlow Terms of Service - Review the terms and conditions for using our property management platform.'
}

export default function TermsPage() {
	return (
		<div className="mx-auto min-h-screen max-w-4xl px-6 py-16">
			<h1 className="mb-8 text-4xl font-bold">Terms of Service</h1>
			<p className="mb-6 text-sm text-muted-foreground">
				Last Updated: October 5, 2025
			</p>

			<div className="prose prose-gray dark:prose-invert max-w-none">
				<section className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold">1. Agreement to Terms</h2>
					<p>
						These Terms of Service ("Terms") constitute a legally binding
						agreement between you ("User," "you," or "your") and TenantFlow
						("Company," "we," "us," or "our") concerning your access to and use
						of the TenantFlow property management platform ("Service" or
						"Platform").
					</p>
					<p>
						By accessing or using our Service, you agree to be bound by these
						Terms and our Privacy Policy. If you do not agree to these Terms,
						you may not access or use the Service.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold">2. Eligibility</h2>
					<p>To use TenantFlow, you must:</p>
					<ul className="mb-4 ml-6 list-disc space-y-2">
						<li>Be at least 18 years of age</li>
						<li>
							Have the legal capacity to enter into a binding contract
						</li>
						<li>
							Not be prohibited from using the Service under applicable laws
						</li>
						<li>
							Provide accurate, complete, and current account information
						</li>
					</ul>
					<p>
						By creating an account, you represent and warrant that you meet
						these eligibility requirements.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold">3. Account Registration and Security</h2>

					<h3 className="mb-3 text-xl font-semibold">3.1 Account Creation</h3>
					<p>
						To access certain features of the Platform, you must register for
						an account. You may create an account using:
					</p>
					<ul className="mb-4 ml-6 list-disc space-y-2">
						<li>Email and password</li>
						<li>Google OAuth authentication</li>
					</ul>

					<h3 className="mb-3 text-xl font-semibold">3.2 Account Security</h3>
					<p>You are responsible for:</p>
					<ul className="mb-4 ml-6 list-disc space-y-2">
						<li>
							Maintaining the confidentiality of your account credentials
						</li>
						<li>All activities that occur under your account</li>
						<li>
							Notifying us immediately of any unauthorized access or security
							breach
						</li>
						<li>Ensuring your account information remains accurate and current</li>
					</ul>
					<p>
						We are not liable for any loss or damage arising from your failure
						to comply with these security obligations.
					</p>

					<h3 className="mb-3 text-xl font-semibold">
						3.3 Account Termination
					</h3>
					<p>
						You may terminate your account at any time through account settings.
						We reserve the right to suspend or terminate accounts that violate
						these Terms.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold">
						4. Subscription and Payment
					</h2>

					<h3 className="mb-3 text-xl font-semibold">4.1 Subscription Plans</h3>
					<p>
						TenantFlow offers various subscription plans with different features
						and pricing. Current plans and pricing are available at{' '}
						<a
							href="https://tenantflow.app/pricing"
							className="text-primary underline"
						>
							tenantflow.app/pricing
						</a>
						.
					</p>

					<h3 className="mb-3 text-xl font-semibold">4.2 Billing</h3>
					<ul className="mb-4 ml-6 list-disc space-y-2">
						<li>
							<strong>Recurring Charges:</strong> Subscriptions are billed on a
							recurring basis (monthly or annually) based on your selected plan
						</li>
						<li>
							<strong>Payment Processing:</strong> All payments are processed
							securely through Stripe
						</li>
						<li>
							<strong>Automatic Renewal:</strong> Subscriptions automatically
							renew unless canceled before the renewal date
						</li>
						<li>
							<strong>Failed Payments:</strong> If a payment fails, we will
							attempt to collect payment again. Continued payment failure may
							result in service suspension
						</li>
					</ul>

					<h3 className="mb-3 text-xl font-semibold">4.3 Cancellation and Refunds</h3>
					<ul className="mb-4 ml-6 list-disc space-y-2">
						<li>
							You may cancel your subscription at any time through account
							settings
						</li>
						<li>
							Cancellations take effect at the end of the current billing period
						</li>
						<li>
							No refunds are provided for partial subscription periods unless
							required by law
						</li>
						<li>
							You will retain access to paid features until the end of your
							billing period
						</li>
					</ul>

					<h3 className="mb-3 text-xl font-semibold">4.4 Price Changes</h3>
					<p>
						We reserve the right to modify subscription pricing with 30 days'
						notice. Price changes will not affect existing subscriptions until
						renewal.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold">5. Acceptable Use</h2>

					<h3 className="mb-3 text-xl font-semibold">5.1 Permitted Use</h3>
					<p>You may use TenantFlow only for:</p>
					<ul className="mb-4 ml-6 list-disc space-y-2">
						<li>Managing your property portfolio</li>
						<li>Tracking tenants, leases, and maintenance requests</li>
						<li>Collecting rent and managing financials</li>
						<li>Generating reports and analytics</li>
						<li>Other lawful property management purposes</li>
					</ul>

					<h3 className="mb-3 text-xl font-semibold">5.2 Prohibited Activities</h3>
					<p>You agree not to:</p>
					<ul className="mb-4 ml-6 list-disc space-y-2">
						<li>
							Use the Service for any unlawful purpose or in violation of
							applicable laws
						</li>
						<li>
							Impersonate any person or entity or misrepresent your affiliation
						</li>
						<li>
							Interfere with or disrupt the Service or servers/networks
							connected to the Service
						</li>
						<li>
							Attempt to gain unauthorized access to any portion of the Service
						</li>
						<li>
							Use any automated means (bots, scrapers) to access the Service
							without permission
						</li>
						<li>
							Upload or transmit viruses, malware, or other malicious code
						</li>
						<li>
							Reverse engineer, decompile, or disassemble any portion of the
							Service
						</li>
						<li>
							Rent, lease, lend, sell, or sublicense access to the Service
						</li>
						<li>
							Collect or harvest personal information about other users without
							consent
						</li>
						<li>
							Use the Service to transmit spam, phishing attempts, or unsolicited
							communications
						</li>
					</ul>
				</section>

				<section className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold">6. User Content</h2>

					<h3 className="mb-3 text-xl font-semibold">6.1 Your Content</h3>
					<p>
						You retain all ownership rights to the data and content you upload,
						submit, or store in the Service ("User Content"), including:
					</p>
					<ul className="mb-4 ml-6 list-disc space-y-2">
						<li>Property information and listings</li>
						<li>Tenant data and records</li>
						<li>Lease agreements and documents</li>
						<li>Financial records and reports</li>
						<li>Photos, files, and communications</li>
					</ul>

					<h3 className="mb-3 text-xl font-semibold">6.2 License to Us</h3>
					<p>
						By uploading User Content, you grant TenantFlow a worldwide,
						non-exclusive, royalty-free license to use, store, reproduce, and
						process your User Content solely for the purpose of:
					</p>
					<ul className="mb-4 ml-6 list-disc space-y-2">
						<li>Providing and maintaining the Service</li>
						<li>Backing up and securing your data</li>
						<li>
							Improving the Service (in aggregated, anonymized form only)
						</li>
					</ul>
					<p>
						This license terminates when you delete your User Content or account,
						except for data retained in backups for up to 90 days.
					</p>

					<h3 className="mb-3 text-xl font-semibold">6.3 Content Responsibility</h3>
					<p>You are solely responsible for:</p>
					<ul className="mb-4 ml-6 list-disc space-y-2">
						<li>The accuracy and legality of your User Content</li>
						<li>
							Ensuring you have necessary rights to upload User Content
						</li>
						<li>
							Complying with fair housing laws and anti-discrimination
							regulations
						</li>
						<li>Backing up your data (we provide backups but recommend your own)</li>
					</ul>
				</section>

				<section className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold">
						7. Intellectual Property
					</h2>

					<h3 className="mb-3 text-xl font-semibold">7.1 Our Property</h3>
					<p>
						The Service and its original content (excluding User Content),
						features, and functionality are owned by TenantFlow and protected by
						copyright, trademark, and other intellectual property laws.
					</p>

					<h3 className="mb-3 text-xl font-semibold">7.2 Trademarks</h3>
					<p>
						"TenantFlow" and related logos are trademarks of TenantFlow. You may
						not use our trademarks without prior written permission.
					</p>

					<h3 className="mb-3 text-xl font-semibold">7.3 Feedback</h3>
					<p>
						If you provide feedback, suggestions, or ideas about the Service, you
						grant us the right to use and implement them without compensation or
						attribution.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold">8. Third-Party Services</h2>
					<p>The Service integrates with third-party services including:</p>
					<ul className="mb-4 ml-6 list-disc space-y-2">
						<li>
							<strong>Stripe:</strong> Payment processing for rent collection
						</li>
						<li>
							<strong>Google OAuth:</strong> Authentication services
						</li>
						<li>
							<strong>Email Providers:</strong> Transactional email delivery
						</li>
					</ul>
					<p>
						Your use of these third-party services is subject to their respective
						terms of service and privacy policies. We are not responsible for the
						actions or policies of third-party service providers.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold">
						9. Disclaimers and Limitations of Liability
					</h2>

					<h3 className="mb-3 text-xl font-semibold">9.1 Service "As Is"</h3>
					<p>
						THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES
						OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
					</p>
					<ul className="mb-4 ml-6 list-disc space-y-2">
						<li>Warranties of merchantability or fitness for a particular purpose</li>
						<li>Warranties that the Service will be uninterrupted or error-free</li>
						<li>Warranties regarding the accuracy or reliability of data</li>
					</ul>

					<h3 className="mb-3 text-xl font-semibold">9.2 No Legal Advice</h3>
					<p>
						TenantFlow does not provide legal, financial, or tax advice. The
						Service is a software tool only. Consult qualified professionals for
						legal, financial, or tax matters.
					</p>

					<h3 className="mb-3 text-xl font-semibold">9.3 Limitation of Liability</h3>
					<p>
						TO THE MAXIMUM EXTENT PERMITTED BY LAW, TENANTFLOW SHALL NOT BE LIABLE FOR:
					</p>
					<ul className="mb-4 ml-6 list-disc space-y-2">
						<li>
							Any indirect, incidental, special, consequential, or punitive
							damages
						</li>
						<li>Loss of profits, revenue, data, or business opportunities</li>
						<li>
							Damages arising from your use or inability to use the Service
						</li>
						<li>
							Damages arising from unauthorized access to your account or data
						</li>
					</ul>
					<p>
						OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID TO TENANTFLOW
						IN THE 12 MONTHS PRECEDING THE CLAIM.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold">10. Indemnification</h2>
					<p>
						You agree to indemnify, defend, and hold harmless TenantFlow, its
						officers, directors, employees, and agents from any claims, damages,
						losses, liabilities, and expenses (including attorney fees) arising
						from:
					</p>
					<ul className="mb-4 ml-6 list-disc space-y-2">
						<li>Your use of the Service</li>
						<li>Your User Content</li>
						<li>Your violation of these Terms</li>
						<li>Your violation of any third-party rights</li>
					</ul>
				</section>

				<section className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold">
						11. Dispute Resolution
					</h2>

					<h3 className="mb-3 text-xl font-semibold">11.1 Informal Resolution</h3>
					<p>
						If you have a dispute with TenantFlow, please contact us at{' '}
						<a
							href="mailto:support@tenantflow.app"
							className="text-primary underline"
						>
							support@tenantflow.app
						</a>{' '}
						to resolve the matter informally.
					</p>

					<h3 className="mb-3 text-xl font-semibold">11.2 Arbitration Agreement</h3>
					<p>
						If informal resolution is unsuccessful, any dispute shall be resolved
						through binding arbitration in accordance with the rules of the
						American Arbitration Association. Arbitration will be conducted in
						[Your State/Location].
					</p>

					<h3 className="mb-3 text-xl font-semibold">11.3 Class Action Waiver</h3>
					<p>
						You agree to resolve disputes on an individual basis only. You waive
						any right to participate in a class action lawsuit or class-wide
						arbitration.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold">12. Modifications to the Service</h2>
					<p>We reserve the right to:</p>
					<ul className="mb-4 ml-6 list-disc space-y-2">
						<li>Modify, suspend, or discontinue the Service at any time</li>
						<li>Add or remove features</li>
						<li>Impose usage limits</li>
						<li>Update technical requirements</li>
					</ul>
					<p>
						We will provide reasonable notice of material changes, but are not
						liable for modifications to the Service.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold">13. Modifications to Terms</h2>
					<p>
						We may revise these Terms at any time. Material changes will be
						communicated by:
					</p>
					<ul className="mb-4 ml-6 list-disc space-y-2">
						<li>Posting the updated Terms on this page</li>
						<li>Updating the "Last Updated" date</li>
						<li>Sending email notification for significant changes</li>
					</ul>
					<p>
						Continued use of the Service after changes become effective
						constitutes acceptance of the modified Terms.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold">14. Governing Law</h2>
					<p>
						These Terms are governed by and construed in accordance with the laws
						of [Your State], without regard to conflict of law principles.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold">15. Severability</h2>
					<p>
						If any provision of these Terms is found to be unenforceable or
						invalid, that provision will be limited or eliminated to the minimum
						extent necessary, and the remaining provisions will remain in full
						force.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold">16. Entire Agreement</h2>
					<p>
						These Terms, together with our Privacy Policy, constitute the entire
						agreement between you and TenantFlow regarding the Service and
						supersede all prior agreements.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold">17. Contact Information</h2>
					<p>For questions about these Terms, contact us:</p>
					<div className="mt-4 rounded-lg bg-muted p-6">
						<p className="mb-2">
							<strong>Email:</strong>{' '}
							<a
								href="mailto:legal@tenantflow.app"
								className="text-primary underline"
							>
								legal@tenantflow.app
							</a>
						</p>
						<p className="mb-2">
							<strong>Support:</strong>{' '}
							<a
								href="mailto:support@tenantflow.app"
								className="text-primary underline"
							>
								support@tenantflow.app
							</a>
						</p>
						<p>
							<strong>Response Time:</strong> We respond to legal inquiries
							within 7 business days
						</p>
					</div>
				</section>

				<div className="mt-12 border-t pt-8 text-sm text-muted-foreground">
					<p>
						By using TenantFlow, you acknowledge that you have read, understood,
						and agree to be bound by these Terms of Service.
					</p>
					<p className="mt-4">
						<strong>Last Updated:</strong> October 5, 2025
					</p>
					<p className="mt-2">
						<strong>Effective Date:</strong> October 5, 2025
					</p>
				</div>
			</div>
		</div>
	)
}
