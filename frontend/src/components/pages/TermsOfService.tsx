import { motion } from 'framer-motion'
import { PublicNavigation } from '@/components/layout/PublicNavigation'

export function TermsOfService() {
	const fadeInUp = {
		initial: { opacity: 0, y: 20 },
		animate: { opacity: 1, y: 0 },
		transition: { duration: 0.6 }
	}

	return (
		<>
			<PublicNavigation variant="tools" />
			<div className="from-background via-background to-primary/5 min-h-screen bg-gradient-to-br">
				<div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
					<motion.div {...fadeInUp} className="mx-auto max-w-4xl">
						<div className="bg-card/80 rounded-lg border shadow-lg backdrop-blur-sm">
							<div className="p-8">
								<h1 className="mb-8 text-4xl font-bold">Terms of Service</h1>
								<p className="text-muted-foreground mb-8">
									Last updated: {new Date().toLocaleDateString()}
								</p>

								<div className="prose prose-gray max-w-none">
									<section className="mb-8">
										<h2 className="mb-4 text-2xl font-semibold">1. Acceptance of Terms</h2>
										<p>
											By accessing and using TenantFlow ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
										</p>
									</section>

									<section className="mb-8">
										<h2 className="mb-4 text-2xl font-semibold">2. Description of Service</h2>
										<p>
											TenantFlow is a property management platform that provides tools for landlords and property managers to manage their rental properties, tenants, leases, and related activities. The Service includes but is not limited to:
										</p>
										<ul className="list-disc list-inside ml-4 mt-2">
											<li>Property and tenant management tools</li>
											<li>Lease generation and management</li>
											<li>Rent collection and payment tracking</li>
											<li>Maintenance request management</li>
											<li>Financial reporting and analytics</li>
											<li>Document storage and management</li>
										</ul>
									</section>

									<section className="mb-8">
										<h2 className="mb-4 text-2xl font-semibold">3. User Accounts</h2>
										<p>
											To access certain features of the Service, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.
										</p>
										<p className="mt-4">
											You are responsible for safeguarding the password and for all activities that occur under your account. You agree not to disclose your password to any third party.
										</p>
									</section>

									<section className="mb-8">
										<h2 className="mb-4 text-2xl font-semibold">4. Acceptable Use</h2>
										<p>You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to:</p>
										<ul className="list-disc list-inside ml-4 mt-2">
											<li>Use the Service in any way that violates applicable laws or regulations</li>
											<li>Transmit any material that is defamatory, offensive, or otherwise objectionable</li>
											<li>Attempt to gain unauthorized access to any portion of the Service</li>
											<li>Interfere with or disrupt the Service or servers connected to the Service</li>
											<li>Use the Service to store or transmit malicious code</li>
										</ul>
									</section>

									<section className="mb-8">
										<h2 className="mb-4 text-2xl font-semibold">5. Payment Terms</h2>
										<p>
											The Service offers both free and paid subscription plans. Paid subscriptions are billed in advance on a monthly or annual basis. You agree to pay all charges incurred by you or anyone using your account.
										</p>
										<p className="mt-4">
											All fees are non-refundable unless otherwise stated. We reserve the right to change our pricing at any time, with reasonable notice provided to existing subscribers.
										</p>
									</section>

									<section className="mb-8">
										<h2 className="mb-4 text-2xl font-semibold">6. Data and Privacy</h2>
										<p>
											Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices regarding the collection, use, and disclosure of your personal information.
										</p>
										<p className="mt-4">
											You retain ownership of any data you submit to the Service. You grant us a limited license to use, store, and process your data solely for the purpose of providing the Service to you.
										</p>
									</section>

									<section className="mb-8">
										<h2 className="mb-4 text-2xl font-semibold">7. Disclaimer of Warranties</h2>
										<p>
											The Service is provided "as is" and "as available" without any representations or warranties, express or implied. We make no representations or warranties in relation to the Service or the information and activities on the Service.
										</p>
									</section>

									<section className="mb-8">
										<h2 className="mb-4 text-2xl font-semibold">8. Limitation of Liability</h2>
										<p>
											In no event shall TenantFlow be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
										</p>
									</section>

									<section className="mb-8">
										<h2 className="mb-4 text-2xl font-semibold">9. Termination</h2>
										<p>
											We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever, including without limitation if you breach the Terms.
										</p>
									</section>

									<section className="mb-8">
										<h2 className="mb-4 text-2xl font-semibold">10. Changes to Terms</h2>
										<p>
											We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
										</p>
									</section>

									<section className="mb-8">
										<h2 className="mb-4 text-2xl font-semibold">11. Contact Information</h2>
										<p>
											If you have any questions about these Terms of Service, please contact us at:
										</p>
										<p className="mt-4">
											<strong>Email:</strong> legal@tenantflow.com<br />
											<strong>Address:</strong> TenantFlow Legal Department<br />
											123 Business Ave, Suite 100<br />
											City, State 12345<br />
											United States
										</p>
									</section>
								</div>
							</div>
						</div>
					</motion.div>
				</div>
			</div>
		</>
	)
}