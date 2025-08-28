/**
 * Terms of Service Page - Server Component
 * Static legal content with proper SEO metadata
 */

import type { Metadata } from 'next/types'
import { Navigation } from '@/components/layout/Navigation'

export const metadata: Metadata = {
	title: 'Terms of Service | TenantFlow',
	description:
		'TenantFlow Terms of Service - Review the terms and conditions for using our property management platform.',
	robots: {
		index: true,
		follow: true
	}
}

export default function TermsOfServicePage() {
	return (
		<>
			<Navigation context="public" />
			<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
				<div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
					<div className="mx-auto max-w-4xl">
						<div className="mb-12 text-center">
							<h1 className="mb-4 text-4xl font-bold text-gray-9">
								Terms of Service
							</h1>
							<p className="text-lg text-gray-6">
								Last updated:{' '}
								{new Date().toLocaleDateString('en-US', {
									year: 'numeric',
									month: 'long',
									day: 'numeric'
								})}
							</p>
						</div>
						<div>
							<div className="rounded-lg border-2 border-gray-2 bg-white/90 shadow-xl backdrop-blur-sm">
								<div className="p-8">
									<div className="max-w-none">
										<section className="mb-8">
											<h2 className="mb-4 text-2xl font-semibold text-gray-9">
												1. Acceptance of Terms
											</h2>
											<p className="text-gray-7">
												By accessing and using
												TenantFlow (&quot;the
												Service&quot;), you accept and
												agree to be bound by the terms
												and provision of this agreement.
												If you do not agree to abide by
												the above, please do not use
												this service.
											</p>
										</section>

										<section className="mb-8">
											<h2 className="mb-4 text-2xl font-semibold text-gray-9">
												2. Description of Service
											</h2>
											<p className="text-gray-7">
												TenantFlow is a property
												management platform that
												provides tools for landlords and
												property managers to manage
												their rental properties,
												tenants, leases, and related
												activities. The Service includes
												but is not limited to:
											</p>
											<ul className="ml-4 mt-2 list-inside list-disc text-gray-7">
												<li>
													Property_ and tenant
													management tools
												</li>
												<li>
													Lease generation and
													management
												</li>
												<li>
													Rent collection and payment
													tracking
												</li>
												<li>
													Maintenance request
													management
												</li>
												<li>
													Financial reporting and
													analytics
												</li>
												<li>
													Document storage and
													management
												</li>
											</ul>
										</section>

										<section className="mb-8">
											<h2 className="mb-4 text-2xl font-semibold text-gray-9">
												3. User Accounts
											</h2>
											<p className="text-gray-7">
												To access certain features of
												the Service, you must register
												for an account. You agree to
												provide accurate, current, and
												complete information during the
												registration process and to
												update such information to keep
												it accurate, current, and
												complete.
											</p>
											<p className="mt-4 text-gray-7">
												You are responsible for
												safeguarding the password and
												for all activities that occur
												under your account. You agree
												not to disclose your password to
												any third party.
											</p>
										</section>

										<section className="mb-8">
											<h2 className="mb-4 text-2xl font-semibold text-gray-9">
												4. Acceptable Use
											</h2>
											<p className="text-gray-7">
												You agree to use the Service
												only for lawful purposes and in
												accordance with these Terms. You
												agree not to:
											</p>
											<ul className="ml-4 mt-2 list-inside list-disc text-gray-7">
												<li>
													Use the Service in any way
													that violates applicable
													laws or regulations
												</li>
												<li>
													Transmit any material that
													is defamatory, offensive, or
													otherwise objectionable
												</li>
												<li>
													Attempt to gain unauthorized
													access to any portion of the
													Service
												</li>
												<li>
													Interfere with or disrupt
													the Service or servers
													connected to the Service
												</li>
												<li>
													Use the Service to store or
													transmit malicious code
												</li>
											</ul>
										</section>

										<section className="mb-8">
											<h2 className="mb-4 text-2xl font-semibold text-gray-9">
												5. Payment Terms
											</h2>
											<p className="text-gray-7">
												The Service offers both free and
												paid subscription plans. Paid
												subscriptions are billed in
												advance on a MONTHLY or ANNUAL
												basis. You agree to pay all
												charges incurred by you or
												anyone using your account.
											</p>
											<p className="mt-4">
												All fees are non-refundable
												unless otherwise stated. We
												reserve the right to change our
												pricing at any time, with
												reasonable notice provided to
												existing subscribers.
											</p>
										</section>

										<section className="mb-8">
											<h2 className="mb-4 text-2xl font-semibold text-gray-9">
												6. Data and Privacy
											</h2>
											<p className="text-gray-7">
												Your privacy is important to us.
												Please review our Privacy
												Policy, which also governs your
												use of the Service, to
												understand our practices
												regarding the collection, use,
												and disclosure of your personal
												information.
											</p>
											<p className="mt-4">
												You retain ownership of any data
												you submit to the Service. You
												grant us a limited license to
												use, store, and process your
												data solely for the purpose of
												providing the Service to you.
											</p>
										</section>

										<section className="mb-8">
											<h2 className="mb-4 text-2xl font-semibold text-gray-9">
												7. Disclaimer of Warranties
											</h2>
											<p className="text-gray-7">
												The Service is provided &quot;as
												is&quot; and &quot;as
												available&quot; without any
												representations or warranties,
												express or implied. We make no
												representations or warranties in
												relation to the Service or the
												information and activities on
												the Service.
											</p>
										</section>

										<section className="mb-8">
											<h2 className="mb-4 text-2xl font-semibold text-gray-9">
												8. Limitation of Liability
											</h2>
											<p className="text-gray-7">
												In no event shall TenantFlow be
												liable for any indirect,
												incidental, special,
												consequential, or punitive
												damages, including without
												limitation, loss of profits,
												data, use, goodwill, or other
												intangible losses.
											</p>
										</section>

										<section className="mb-8">
											<h2 className="mb-4 text-2xl font-semibold text-gray-9">
												9. Termination
											</h2>
											<p className="text-gray-7">
												We may terminate or suspend your
												account and bar access to the
												Service immediately, without
												prior notice or liability, under
												our sole discretion, for any
												reason whatsoever, including
												without limitation if you breach
												the Terms.
											</p>
										</section>

										<section className="mb-8">
											<h2 className="mb-4 text-2xl font-semibold text-gray-9">
												10. Changes to Terms
											</h2>
											<p className="text-gray-7">
												We reserve the right to modify
												or replace these Terms at any
												time. If a revision is material,
												we will provide at least 30 days
												notice prior to any new terms
												taking effect.
											</p>
										</section>

										<section className="mb-8">
											<h2 className="mb-4 text-2xl font-semibold text-gray-9">
												11. Contact Information
											</h2>
											<p className="text-gray-7">
												If you have any questions about
												these Terms of Service, please
												contact us at:
											</p>
											<p className="mt-4">
												<strong>Email:</strong>{' '}
												legal@tenantflow.app
												<br />
												<strong>Address:</strong>{' '}
												TenantFlow Legal Department
												<br />
												123 Business Ave, Suite 100
												<br />
												City, State 12345
												<br />
												United States
											</p>
										</section>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	)
}
