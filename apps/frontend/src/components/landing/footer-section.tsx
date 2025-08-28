/**
 * Footer Section - Server Component
 * Using semantic tokens for consistency
 */

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

interface FooterSectionProps {
	locale: string
}

export function FooterSection({
	locale
}: FooterSectionProps) {
	return (
		<footer className="bg-base12 px-4 py-12 text-base4">
			<div className="container mx-auto">
				<div className="mb-8 grid gap-8 md:grid-cols-5">
					<div className="md:col-span-2">
						<div className="mb-4 flex items-center space-x-2">
							<i className="i-lucide-building-2 h-6 w-6 text-primary" />
							<span className="font-bold text-white">
								TenantFlow
							</span>
						</div>
						<p className="mb-4 text-sm">
							The modern property management platform that saves
							you time and makes you money.
						</p>
						<div className="flex items-center gap-4">
							<Badge className="bg-success text-white">
								SOC 2 Certified
							</Badge>
							<Badge className="bg-primary text-white">
								GDPR Compliant
							</Badge>
						</div>
					</div>

					<div>
						<h4 className="mb-4 font-semibold text-white">
							Product
						</h4>
						<ul className="space-y-2 text-sm">
							<li>
								<Link
									href={`/${locale}/features`}
									className="transition-colors hover:text-white"
								>
									Features
								</Link>
							</li>
							<li>
								<Link
									href={`/${locale}/pricing`}
									className="transition-colors hover:text-white"
								>
									Pricing
								</Link>
							</li>
							<li>
								<Link
									href={`/${locale}/demo`}
									className="transition-colors hover:text-white"
								>
									Demo
								</Link>
							</li>
							<li>
								<Link
									href={`/${locale}/api`}
									className="transition-colors hover:text-white"
								>
									API
								</Link>
							</li>
						</ul>
					</div>

					<div>
						<h4 className="mb-4 font-semibold text-white">
							Company
						</h4>
						<ul className="space-y-2 text-sm">
							<li>
								<Link
									href={`/${locale}/about`}
									className="transition-colors hover:text-white"
								>
									About
								</Link>
							</li>
							<li>
								<Link
									href={`/${locale}/blog`}
									className="transition-colors hover:text-white"
								>
									Blog
								</Link>
							</li>
							<li>
								<Link
									href={`/${locale}/careers`}
									className="transition-colors hover:text-white"
								>
									Careers
								</Link>
							</li>
							<li>
								<Link
									href={`/${locale}/contact`}
									className="transition-colors hover:text-white"
								>
									Contact
								</Link>
							</li>
						</ul>
					</div>

					<div>
						<h4 className="mb-4 font-semibold text-white">
							Legal
						</h4>
						<ul className="space-y-2 text-sm">
							<li>
								<Link
									href={`/${locale}/terms-of-service`}
									className="transition-colors hover:text-white"
								>
									Terms of Service
								</Link>
							</li>
							<li>
								<Link
									href={`/${locale}/privacy`}
									className="transition-colors hover:text-white"
								>
									Privacy Policy
								</Link>
							</li>
							<li>
								<Link
									href={`/${locale}/security`}
									className="transition-colors hover:text-white"
								>
									Security
								</Link>
							</li>
						</ul>
					</div>
				</div>

				<div className="border-t border-base6 pt-8">
					<div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
						<p className="text-sm text-base6">
							© 2024 TenantFlow. All rights reserved.
						</p>
						<div className="flex items-center space-x-6">
							<Link
								href="https://twitter.com/tenantflow"
								className="text-base6 transition-colors hover:text-primary"
								aria-label="Follow us on Twitter"
							>
								<i className="i-lucide-twitter h-5 w-5" />
							</Link>
							<Link
								href="https://linkedin.com/company/tenantflow"
								className="text-base6 transition-colors hover:text-primary"
								aria-label="Connect with us on LinkedIn"
							>
								<i className="i-lucide-linkedin h-5 w-5" />
							</Link>
							<Link
								href="https://github.com/tenantflow"
								className="text-base6 transition-colors hover:text-primary"
								aria-label="View our code on GitHub"
							>
								<i className="i-lucide-github h-5 w-5" />
							</Link>
						</div>
					</div>
				</div>
			</div>
		</footer>
	)
}