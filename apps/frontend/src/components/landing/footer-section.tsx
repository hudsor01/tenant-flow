'use client'

import { useState } from 'react'
import { logger } from "@/lib/logger/logger"
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Building2, Mail, Phone, MapPin } from 'lucide-react'

export function FooterSection() {
	const [email, setEmail] = useState('')

	const handleNewsletterSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		// Newsletter signup functionality will be implemented later
		logger.info('Newsletter signup:', {
			component: 'footersection',
			data: email
		})
		setEmail('')
	}

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
							The modern property management platform that helps
							you save time, increase revenue, and delight
							tenants.
						</p>

						<div className="mb-4">
							<h4 className="mb-2 font-semibold text-white">
								Stay Updated
							</h4>
							<form
								onSubmit={handleNewsletterSubmit}
								className="flex gap-2"
							>
								<input
									type="email"
									placeholder="Enter your email"
									value={email}
									onChange={e => setEmail(e.target.value)}
									className="focus:border-primary flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:outline-none"
									required
								/>
								<Button
									type="submit"
									className="bg-primary hover:bg-blue-700"
								>
									<Mail className="h-4 w-4" />
								</Button>
							</form>
						</div>

						<div className="flex space-x-4">
							<Link href="#" className="hover:text-white">
								Twitter
							</Link>
							<Link href="#" className="hover:text-white">
								LinkedIn
							</Link>
							<Link href="#" className="hover:text-white">
								Facebook
							</Link>
						</div>
					</div>

					<div>
						<h4 className="mb-4 font-semibold text-white">
							Product
						</h4>
						<ul className="space-y-2 text-sm">
							<li>
								<Link
									href="/features"
									className="hover:text-white"
								>
									Features
								</Link>
							</li>
							<li>
								<Link
									href="/pricing"
									className="hover:text-white"
								>
									Pricing
								</Link>
							</li>
							<li>
								<Link href="/demo" className="hover:text-white">
									Demo
								</Link>
							</li>
							<li>
								<Link
									href="/integrations"
									className="hover:text-white"
								>
									Integrations
								</Link>
							</li>
							<li>
								<Link href="/api" className="hover:text-white">
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
									href="/about"
									className="hover:text-white"
								>
									About
								</Link>
							</li>
							<li>
								<Link href="/blog" className="hover:text-white">
									Blog
								</Link>
							</li>
							<li>
								<Link
									href="/careers"
									className="hover:text-white"
								>
									Careers
								</Link>
							</li>
							<li>
								<Link
									href="/contact"
									className="hover:text-white"
								>
									Contact
								</Link>
							</li>
							<li>
								<Link
									href="/partners"
									className="hover:text-white"
								>
									Partners
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
								<Link href="/help" className="hover:text-white">
									Help Center
								</Link>
							</li>
							<li>
								<Link href="/docs" className="hover:text-white">
									Documentation
								</Link>
							</li>
							<li>
								<Link
									href="/status"
									className="hover:text-white"
								>
									System Status
								</Link>
							</li>
							<li>
								<Link
									href="/privacy"
									className="hover:text-white"
								>
									Privacy
								</Link>
							</li>
							<li>
								<Link
									href="/terms"
									className="hover:text-white"
								>
									Terms
								</Link>
							</li>
						</ul>
					</div>
				</div>

				<div className="border-t border-gray-800 pt-8">
					<div className="flex flex-col items-center justify-between md:flex-row">
						<p className="mb-4 text-sm md:mb-0">
							&copy; 2024 TenantFlow. All rights reserved.
						</p>
						<div className="flex items-center space-x-4 text-sm">
							<div className="flex items-center">
								<MapPin className="mr-1 h-4 w-4" />
								San Francisco, CA
							</div>
							<div className="flex items-center">
								<Phone className="mr-1 h-4 w-4" />
								1-800-TENANT
							</div>
							<div className="flex items-center">
								<Mail className="mr-1 h-4 w-4" />
								hello@tenantflow.app
							</div>
						</div>
					</div>
				</div>
			</div>
		</footer>
	)
}
