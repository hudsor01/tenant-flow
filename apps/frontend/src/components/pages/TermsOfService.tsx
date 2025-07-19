import { motion } from 'framer-motion'
import { Navigation } from '@/components/layout/Navigation'

function TermsOfService() {
	const fadeInUp = {
		initial: { opacity: 0, y: 20 },
		animate: { opacity: 1, y: 0 },
		transition: { duration: 0.6 }
	}

	return (
		<>
			<Navigation context="public" />
			<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
				<div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
					<motion.div {...fadeInUp} className="mx-auto max-w-4xl">
						<div className="mb-12 text-center">
							<h1 className="mb-4 text-4xl font-bold text-gray-900">
								Terms of Service
							</h1>
							<p className="text-lg text-gray-600">
								Last updated:{' '}
								{new Date().toLocaleDateString('en-US', {
									year: 'numeric',
									month: 'long',
									day: 'numeric'
								})}
							</p>
						</div>
						<motion.div
							initial={{ opacity: 0, y: 40 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.8, delay: 0.2 }}
						>
							<div className="rounded-lg border-2 border-gray-200 bg-white/90 shadow-xl backdrop-blur-sm">
								<div className="p-8">
									<div className="max-w-none">
										<section className="mb-8">
											<h2 className="mb-4 text-2xl font-semibold text-gray-900">
												1. Acceptance of Terms
											</h2>
											<p className="text-gray-700">
												By accessing and using
												TenantFlow ("the Service"), you
												accept and agree to be bound by
												the terms and provision of this
												agreement. If you do not agree
												to abide by the above, please do
												not use this service.
											</p>
										</section>

										<section className="mb-8">
											<h2 className="mb-4 text-2xl font-semibold text-gray-900">
												2. Description of Service
											</h2>
											<p className="text-gray-700">
												TenantFlow is a property
												management platform that
												provides tools for landlords and
												property managers to manage
												their rental properties,
												tenants, leases, and related
												activities. The Service includes
												but is not limited to:
											</p>
											<ul className="mt-2 ml-4 list-inside list-disc text-gray-700">
												<li>
													Property and tenant
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
											<h2 className="mb-4 text-2xl font-semibold text-gray-900">
												3. User Accounts
											</h2>
											<p className="text-gray-700">
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
											<p className="mt-4 text-gray-700">
												You are responsible for
												safeguarding the password and
												for all activities that occur
												under your account. You agree
												not to disclose your password to
												any third party.
											</p>
										</section>

										<section className="mb-8">
											<h2 className="mb-4 text-2xl font-semibold text-gray-900">
												4. Acceptable Use
											</h2>
											<p className="text-gray-700">
												You agree to use the Service
												only for lawful purposes and in
												accordance with these Terms. You
												agree not to:
											</p>
											<ul className="mt-2 ml-4 list-inside list-disc text-gray-700">
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
											<h2 className="mb-4 text-2xl font-semibold text-gray-900">
												5. Payment Terms
											</h2>
											<p className="text-gray-700">
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
											<h2 className="mb-4 text-2xl font-semibold text-gray-900">
												6. Data and Privacy
											</h2>
											<p className="text-gray-700">
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
											<h2 className="mb-4 text-2xl font-semibold text-gray-900">
												7. Disclaimer of Warranties
											</h2>
											<p className="text-gray-700">
												The Service is provided "as is"
												and "as available" without any
												representations or warranties,
												express or implied. We make no
												representations or warranties in
												relation to the Service or the
												information and activities on
												the Service.
											</p>
										</section>

										<section className="mb-8">
											<h2 className="mb-4 text-2xl font-semibold text-gray-900">
												8. Limitation of Liability
											</h2>
											<p className="text-gray-700">
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
											<h2 className="mb-4 text-2xl font-semibold text-gray-900">
												9. Termination
											</h2>
											<p className="text-gray-700">
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
											<h2 className="mb-4 text-2xl font-semibold text-gray-900">
												10. Changes to Terms
											</h2>
											<p className="text-gray-700">
												We reserve the right to modify
												or replace these Terms at any
												time. If a revision is material,
												we will provide at least 30 days
												notice prior to any new terms
												taking effect.
											</p>
										</section>

										<section className="mb-8">
											<h2 className="mb-4 text-2xl font-semibold text-gray-900">
												11. Contact Information
											</h2>
											<p className="text-gray-700">
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
						</motion.div>
					</motion.div>
				</div>
			</div>
		</>
	)
}

export default TermsOfService
