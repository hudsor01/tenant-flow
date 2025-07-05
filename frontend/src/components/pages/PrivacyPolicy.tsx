import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export function PrivacyPolicy() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12">
			<div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
				<div className="mb-12 text-center">
					<h1 className="mb-4 text-4xl font-bold text-gray-900">
						Privacy Policy
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

				<Card className="shadow-lg">
					<CardContent className="space-y-8 p-8">
						{/* Introduction */}
						<section>
							<h2 className="mb-4 text-2xl font-semibold text-gray-900">
								Introduction
							</h2>
							<p className="leading-relaxed text-gray-700">
								TenantFlow ("we," "our," or "us") is committed
								to protecting your privacy. This Privacy Policy
								explains how we collect, use, disclose, and
								safeguard your information when you visit our
								website tenantflow.app and use our property
								management platform.
							</p>
						</section>

						<Separator />

						{/* Information We Collect */}
						<section>
							<h2 className="mb-4 text-2xl font-semibold text-gray-900">
								Information We Collect
							</h2>

							<h3 className="mb-3 text-xl font-medium text-gray-800">
								Personal Information
							</h3>
							<p className="mb-4 text-gray-700">
								We collect information you provide directly to
								us, such as when you:
							</p>
							<ul className="mb-6 list-disc space-y-2 pl-6 text-gray-700">
								<li>
									Create an account or sign up for our
									services
								</li>
								<li>Use our property management features</li>
								<li>Contact us for support</li>
								<li>
									Subscribe to our newsletter or marketing
									communications
								</li>
							</ul>

							<p className="mb-4 text-gray-700">
								This information may include:
							</p>
							<ul className="mb-6 list-disc space-y-2 pl-6 text-gray-700">
								<li>
									Name and contact information (email, phone
									number, address)
								</li>
								<li>
									Account credentials (username, password)
								</li>
								<li>
									Property information (addresses, rental
									amounts, tenant details)
								</li>
								<li>
									Payment information (processed securely
									through Stripe)
								</li>
								<li>Communications with our support team</li>
							</ul>

							<h3 className="mb-3 text-xl font-medium text-gray-800">
								Automatically Collected Information
							</h3>
							<p className="mb-4 text-gray-700">
								We automatically collect certain information
								when you use our services:
							</p>
							<ul className="list-disc space-y-2 pl-6 text-gray-700">
								<li>
									Usage data and analytics (pages visited,
									features used, time spent)
								</li>
								<li>
									Device information (browser type, operating
									system, IP address)
								</li>
								<li>
									Log files and technical data for security
									and performance monitoring
								</li>
								<li>
									Cookies and similar tracking technologies
								</li>
							</ul>
						</section>

						<Separator />

						{/* How We Use Your Information */}
						<section>
							<h2 className="mb-4 text-2xl font-semibold text-gray-900">
								How We Use Your Information
							</h2>
							<p className="mb-4 text-gray-700">
								We use the information we collect to:
							</p>
							<ul className="list-disc space-y-2 pl-6 text-gray-700">
								<li>
									Provide, maintain, and improve our property
									management services
								</li>
								<li>
									Process transactions and send related
									information
								</li>
								<li>
									Generate lease agreements and other property
									management documents
								</li>
								<li>
									Send administrative information, updates,
									and security alerts
								</li>
								<li>
									Respond to your comments, questions, and
									customer service requests
								</li>
								<li>
									Analyze usage patterns to improve our
									platform
								</li>
								<li>
									Send marketing communications (with your
									consent)
								</li>
								<li>
									Detect, prevent, and address technical
									issues and security vulnerabilities
								</li>
								<li>Comply with legal obligations</li>
							</ul>
						</section>

						<Separator />

						{/* Information Sharing */}
						<section>
							<h2 className="mb-4 text-2xl font-semibold text-gray-900">
								Information Sharing and Disclosure
							</h2>
							<p className="mb-4 text-gray-700">
								We may share your information in the following
								situations:
							</p>

							<h3 className="mb-3 text-xl font-medium text-gray-800">
								Service Providers
							</h3>
							<p className="mb-4 text-gray-700">
								We work with third-party service providers who
								assist us in operating our platform:
							</p>
							<ul className="mb-6 list-disc space-y-2 pl-6 text-gray-700">
								<li>
									<strong>Supabase:</strong> Database and
									authentication services
								</li>
								<li>
									<strong>Stripe:</strong> Payment processing
									(they have their own privacy policy)
								</li>
								<li>
									<strong>Vercel:</strong> Website hosting and
									deployment
								</li>
								<li>
									<strong>PostHog:</strong> Analytics and
									product insights
								</li>
								<li>
									<strong>Resend:</strong> Email delivery
									services
								</li>
							</ul>

							<h3 className="mb-3 text-xl font-medium text-gray-800">
								Legal Requirements
							</h3>
							<p className="mb-4 text-gray-700">
								We may disclose your information if required to
								do so by law or in response to:
							</p>
							<ul className="mb-6 list-disc space-y-2 pl-6 text-gray-700">
								<li>
									Legal processes (subpoenas, court orders)
								</li>
								<li>Law enforcement requests</li>
								<li>
									Protecting our rights, property, or safety
								</li>
								<li>
									Protecting the rights, property, or safety
									of our users or others
								</li>
							</ul>

							<h3 className="mb-3 text-xl font-medium text-gray-800">
								Business Transfers
							</h3>
							<p className="text-gray-700">
								If TenantFlow is involved in a merger,
								acquisition, or sale of assets, your information
								may be transferred as part of that transaction.
								We will notify you before your information is
								transferred.
							</p>
						</section>

						<Separator />

						{/* Data Security */}
						<section>
							<h2 className="mb-4 text-2xl font-semibold text-gray-900">
								Data Security
							</h2>
							<p className="mb-4 text-gray-700">
								We implement appropriate technical and
								organizational security measures to protect your
								personal information:
							</p>
							<ul className="list-disc space-y-2 pl-6 text-gray-700">
								<li>Data encryption in transit and at rest</li>
								<li>
									Secure authentication and access controls
								</li>
								<li>Regular security audits and monitoring</li>
								<li>
									Staff training on data protection practices
								</li>
								<li>Incident response procedures</li>
							</ul>
							<p className="mt-4 text-gray-700">
								However, no method of transmission over the
								internet is 100% secure. While we strive to
								protect your information, we cannot guarantee
								absolute security.
							</p>
						</section>

						<Separator />

						{/* Your Rights and Choices */}
						<section>
							<h2 className="mb-4 text-2xl font-semibold text-gray-900">
								Your Rights and Choices
							</h2>
							<p className="mb-4 text-gray-700">
								You have the following rights regarding your
								personal information:
							</p>

							<h3 className="mb-3 text-xl font-medium text-gray-800">
								Account Information
							</h3>
							<ul className="mb-6 list-disc space-y-2 pl-6 text-gray-700">
								<li>
									Access and update your account information
									at any time
								</li>
								<li>Delete your account and associated data</li>
								<li>Export your data in a portable format</li>
							</ul>

							<h3 className="mb-3 text-xl font-medium text-gray-800">
								Communication Preferences
							</h3>
							<ul className="mb-6 list-disc space-y-2 pl-6 text-gray-700">
								<li>
									Opt out of marketing emails by clicking
									"unsubscribe"
								</li>
								<li>
									Control notification settings in your
									account preferences
								</li>
								<li>
									Contact us to update your communication
									preferences
								</li>
							</ul>

							<h3 className="mb-3 text-xl font-medium text-gray-800">
								Data Rights (GDPR/CCPA)
							</h3>
							<p className="mb-4 text-gray-700">
								If you are a resident of the EU or California,
								you may have additional rights:
							</p>
							<ul className="list-disc space-y-2 pl-6 text-gray-700">
								<li>
									Right to access your personal information
								</li>
								<li>Right to rectify inaccurate information</li>
								<li>
									Right to erase your personal information
								</li>
								<li>
									Right to restrict processing of your
									information
								</li>
								<li>Right to data portability</li>
								<li>Right to object to processing</li>
							</ul>
						</section>

						<Separator />

						{/* Cookies and Tracking */}
						<section>
							<h2 className="mb-4 text-2xl font-semibold text-gray-900">
								Cookies and Tracking Technologies
							</h2>
							<p className="mb-4 text-gray-700">
								We use cookies and similar tracking technologies
								to improve your experience:
							</p>
							<ul className="mb-4 list-disc space-y-2 pl-6 text-gray-700">
								<li>
									<strong>Essential Cookies:</strong> Required
									for basic website functionality
								</li>
								<li>
									<strong>Analytics Cookies:</strong> Help us
									understand how users interact with our site
								</li>
								<li>
									<strong>Preference Cookies:</strong>{' '}
									Remember your settings and preferences
								</li>
							</ul>
							<p className="text-gray-700">
								You can control cookies through your browser
								settings, but disabling certain cookies may
								affect website functionality.
							</p>
						</section>

						<Separator />

						{/* Children's Privacy */}
						<section>
							<h2 className="mb-4 text-2xl font-semibold text-gray-900">
								Children's Privacy
							</h2>
							<p className="text-gray-700">
								TenantFlow is not intended for children under 18
								years of age. We do not knowingly collect
								personal information from children under 18. If
								we become aware that we have collected personal
								information from a child under 18, we will take
								steps to delete such information.
							</p>
						</section>

						<Separator />

						{/* International Data Transfers */}
						<section>
							<h2 className="mb-4 text-2xl font-semibold text-gray-900">
								International Data Transfers
							</h2>
							<p className="text-gray-700">
								Your information may be transferred to and
								processed in countries other than your own. We
								ensure appropriate safeguards are in place to
								protect your information in accordance with
								applicable data protection laws.
							</p>
						</section>

						<Separator />

						{/* Changes to Privacy Policy */}
						<section>
							<h2 className="mb-4 text-2xl font-semibold text-gray-900">
								Changes to This Privacy Policy
							</h2>
							<p className="text-gray-700">
								We may update this Privacy Policy from time to
								time. We will notify you of any changes by
								posting the new Privacy Policy on this page and
								updating the "Last updated" date. For
								significant changes, we may also send you an
								email notification.
							</p>
						</section>

						<Separator />

						{/* Contact Information */}
						<section>
							<h2 className="mb-4 text-2xl font-semibold text-gray-900">
								Contact Us
							</h2>
							<p className="mb-4 text-gray-700">
								If you have any questions about this Privacy
								Policy or our privacy practices, please contact
								us:
							</p>
							<div className="rounded-lg bg-gray-50 p-6">
								<ul className="space-y-2 text-gray-700">
									<li>
										<strong>Email:</strong>{' '}
										privacy@tenantflow.app
									</li>
									<li>
										<strong>Website:</strong> tenantflow.app
									</li>
									<li>
										<strong>Mailing Address:</strong>{' '}
										TenantFlow Privacy Officer
									</li>
								</ul>
							</div>
						</section>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
