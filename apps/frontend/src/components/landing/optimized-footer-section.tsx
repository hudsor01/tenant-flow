/**
 * Optimized Footer Section - Server Component
 * Static footer with navigation links and company information
 */

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Building2 } from 'lucide-react'

interface OptimizedFooterSectionProps {
	locale: string
}

export function OptimizedFooterSection({
	locale
}: OptimizedFooterSectionProps) {
	return (
		<footer className="bg-gray-900 px-4 py-12 text-gray-400">
			<div className="container mx-auto">
				<div className="mb-8 grid gap-8 md:grid-cols-5">
					<div className="md:col-span-2">
						<div className="mb-4 flex items-center space-x-2">
							<Building2 className="text-primary h-6 w-6" />
							<span className="font-bold text-white">
								TenantFlow
							</span>
						</div>
						<p className="mb-4 text-sm">
							The modern property management platform that saves
							you time and makes you money.
						</p>
						<div className="flex items-center gap-4">
							<Badge className="bg-green-900 text-green-300">
								SOC 2 Certified
							</Badge>
							<Badge className="bg-blue-900 text-blue-300">
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
							Support
						</h4>
						<ul className="space-y-2 text-sm">
							<li>
								<Link
									href={`/${locale}/help`}
									className="transition-colors hover:text-white"
								>
									Help Center
								</Link>
							</li>
							<li>
								<Link
									href={`/${locale}/status`}
									className="transition-colors hover:text-white"
								>
									System Status
								</Link>
							</li>
							<li>
								<Link
									href={`/${locale}/privacy`}
									className="transition-colors hover:text-white"
								>
									Privacy
								</Link>
							</li>
							<li>
								<Link
									href={`/${locale}/terms`}
									className="transition-colors hover:text-white"
								>
									Terms
								</Link>
							</li>
						</ul>
					</div>
				</div>

				<div className="border-t border-gray-800 pt-8 text-center">
					<p className="text-sm">
						© 2024 TenantFlow. All rights reserved. • Trusted by
						10,000+ property managers
					</p>
				</div>
			</div>
		</footer>
	)
}
