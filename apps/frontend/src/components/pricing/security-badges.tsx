import {
	Shield,
	Lock,
	CheckCircle,
	Award,
	Globe,
	FileCheck
} from 'lucide-react'

interface SecurityBadgesProps {
	className?: string
}

/**
 * Security and trust badges component
 * Displays security certifications and trust indicators
 */
export function SecurityBadges({ className }: SecurityBadgesProps) {
	return (
		<div className={`py-16 text-center ${className || ''}`}>
			<div className="mx-auto max-w-4xl">
				<h2 className="mb-4 text-3xl font-bold text-gray-900">
					Enterprise-Grade Security & Compliance
				</h2>
				<p className="mx-auto mb-12 max-w-2xl text-lg text-gray-600">
					Your data security is our top priority. TenantFlow meets the
					highest standards for data protection and privacy
					compliance.
				</p>

				{/* Security badges grid */}
				<div className="mb-12 grid gap-8 md:grid-cols-3 lg:grid-cols-6">
					<div className="flex flex-col items-center space-y-3">
						<div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
							<Shield className="h-8 w-8 text-green-600" />
						</div>
						<div className="text-center">
							<h3 className="font-semibold text-gray-900">
								SSL Encrypted
							</h3>
							<p className="text-sm text-gray-600">
								256-bit encryption
							</p>
						</div>
					</div>

					<div className="flex flex-col items-center space-y-3">
						<div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
							<Lock className="text-primary h-8 w-8" />
						</div>
						<div className="text-center">
							<h3 className="font-semibold text-gray-900">
								SOC 2 Compliant
							</h3>
							<p className="text-sm text-gray-600">
								Type II certified
							</p>
						</div>
					</div>

					<div className="flex flex-col items-center space-y-3">
						<div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
							<CheckCircle className="h-8 w-8 text-purple-600" />
						</div>
						<div className="text-center">
							<h3 className="font-semibold text-gray-900">
								GDPR Ready
							</h3>
							<p className="text-sm text-gray-600">
								Privacy compliant
							</p>
						</div>
					</div>

					<div className="flex flex-col items-center space-y-3">
						<div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
							<Award className="h-8 w-8 text-yellow-600" />
						</div>
						<div className="text-center">
							<h3 className="font-semibold text-gray-900">
								ISO 27001
							</h3>
							<p className="text-sm text-gray-600">
								Security certified
							</p>
						</div>
					</div>

					<div className="flex flex-col items-center space-y-3">
						<div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
							<Globe className="h-8 w-8 text-red-600" />
						</div>
						<div className="text-center">
							<h3 className="font-semibold text-gray-900">
								Global CDN
							</h3>
							<p className="text-sm text-gray-600">
								99.9% uptime
							</p>
						</div>
					</div>

					<div className="flex flex-col items-center space-y-3">
						<div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
							<FileCheck className="h-8 w-8 text-indigo-600" />
						</div>
						<div className="text-center">
							<h3 className="font-semibold text-gray-900">
								Regular Audits
							</h3>
							<p className="text-sm text-gray-600">
								Third-party verified
							</p>
						</div>
					</div>
				</div>

				{/* Additional security features */}
				<div className="rounded-2xl bg-gray-50 p-8">
					<h3 className="mb-6 text-xl font-semibold text-gray-900">
						What This Means for You
					</h3>
					<div className="grid gap-6 text-left md:grid-cols-3">
						<div className="space-y-2">
							<h4 className="font-medium text-gray-900">
								Data Protection
							</h4>
							<p className="text-sm text-gray-600">
								Your sensitive property and tenant data is
								encrypted both in transit and at rest, following
								banking-industry standards.
							</p>
						</div>
						<div className="space-y-2">
							<h4 className="font-medium text-gray-900">
								Privacy Compliance
							</h4>
							<p className="text-sm text-gray-600">
								Full GDPR and CCPA compliance ensures your
								tenant privacy rights are protected according to
								the strictest global standards.
							</p>
						</div>
						<div className="space-y-2">
							<h4 className="font-medium text-gray-900">
								Business Continuity
							</h4>
							<p className="text-sm text-gray-600">
								Redundant infrastructure and daily backups
								ensure your business operations continue
								uninterrupted, even during outages.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
