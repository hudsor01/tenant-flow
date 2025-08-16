'use client'

import React, { Suspense } from 'react'
import { motion } from '@/lib/framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
	Shield,
	Lock,
	Eye,
	Server,
	FileCheck,
	Globe,
	CheckCircle,
	Download,
	ExternalLink,
	Clock,
	AlertTriangle,
	Database,
	Key,
	Fingerprint,
	Cloud
} from 'lucide-react'
import Link from 'next/link'

// Server Component for certifications
function ComplianceCertifications() {
	const certifications = [
		{
			title: 'SOC 2 Type II',
			description: 'Security, availability, and confidentiality controls',
			status: 'Certified',
			icon: Shield,
			validUntil: '2025'
		},
		{
			title: 'GDPR Compliant',
			description: 'European data protection regulation compliance',
			status: 'Compliant',
			icon: Globe,
			validUntil: 'Ongoing'
		},
		{
			title: 'CCPA Compliant',
			description: 'California consumer privacy act compliance',
			status: 'Compliant',
			icon: FileCheck,
			validUntil: 'Ongoing'
		},
		{
			title: 'ISO 27001',
			description: 'Information security management system',
			status: 'In Progress',
			icon: Lock,
			validUntil: '2025'
		}
	]

	return (
		<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
			{certifications.map(cert => {
				const IconComponent = cert.icon
				return (
					<Card
						key={cert.title}
						className="to-success/5 border-0 bg-gradient-to-br from-white transition-all duration-300 hover:shadow-lg"
					>
						<CardContent className="p-6 text-center">
							<div className="bg-success/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
								<IconComponent className="text-success h-6 w-6" />
							</div>
							<h3 className="text-foreground mb-2 font-semibold">
								{cert.title}
							</h3>
							<p className="text-muted-foreground mb-3 text-sm">
								{cert.description}
							</p>
							<div className="flex items-center justify-center space-x-2">
								<CheckCircle className="text-success h-4 w-4" />
								<span className="text-success text-xs font-medium">
									{cert.status}
								</span>
							</div>
							<p className="text-muted-foreground mt-2 text-xs">
								Valid: {cert.validUntil}
							</p>
						</CardContent>
					</Card>
				)
			})}
		</div>
	)
}

// Client Component for interactive security features
function SecurityFeatures() {
	const features = [
		{
			category: 'Data Protection',
			icon: Database,
			items: [
				'AES-256 encryption at rest',
				'TLS 1.3 encryption in transit',
				'End-to-end encrypted backups',
				'Zero-knowledge architecture'
			]
		},
		{
			category: 'Access Control',
			icon: Key,
			items: [
				'Multi-factor authentication (MFA)',
				'Role-based access control (RBAC)',
				'Single sign-on (SSO) integration',
				'Session timeout controls'
			]
		},
		{
			category: 'Infrastructure',
			icon: Server,
			items: [
				'AWS security best practices',
				'Network isolation & VPCs',
				'DDoS protection',
				'Regular security patching'
			]
		},
		{
			category: 'Monitoring',
			icon: Eye,
			items: [
				'24/7 security monitoring',
				'Intrusion detection systems',
				'Audit logs & activity tracking',
				'Real-time threat detection'
			]
		}
	]

	return (
		<div className="grid grid-cols-1 gap-8 md:grid-cols-2">
			{features.map((feature, index) => {
				const IconComponent = feature.icon
				return (
					<motion.div
						key={feature.category}
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: index * 0.1 }}
						viewport={{ once: true }}
					>
						<Card className="to-primary/5 h-full border-0 bg-gradient-to-br from-white transition-all duration-300 hover:shadow-lg">
							<CardHeader className="pb-4">
								<div className="flex items-center space-x-3">
									<div className="from-primary to-accent flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br">
										<IconComponent className="h-5 w-5 text-white" />
									</div>
									<CardTitle className="text-foreground text-xl">
										{feature.category}
									</CardTitle>
								</div>
							</CardHeader>
							<CardContent>
								<ul className="space-y-3">
									{feature.items.map((item, itemIndex) => (
										<li
											key={itemIndex}
											className="flex items-center space-x-3"
										>
											<CheckCircle className="text-success h-4 w-4 flex-shrink-0" />
											<span className="text-muted-foreground">
												{item}
											</span>
										</li>
									))}
								</ul>
							</CardContent>
						</Card>
					</motion.div>
				)
			})}
		</div>
	)
}

export function SecurityContent() {
	const trustSignals = [
		{
			metric: '99.9%',
			label: 'Uptime SLA',
			description: 'Guaranteed availability'
		},
		{
			metric: '< 5min',
			label: 'Response Time',
			description: 'Security incident response'
		},
		{
			metric: '0',
			label: 'Data Breaches',
			description: 'Since inception'
		},
		{
			metric: '24/7',
			label: 'Monitoring',
			description: 'Continuous security watch'
		}
	]

	const securityPolicies = [
		{
			title: 'Privacy Policy',
			description: 'How we collect, use, and protect your data',
			lastUpdated: 'Updated Jan 2025',
			href: '/privacy-policy'
		},
		{
			title: 'Terms of Service',
			description: 'Legal terms governing our service usage',
			lastUpdated: 'Updated Jan 2025',
			href: '/terms-of-service'
		},
		{
			title: 'Data Processing Agreement',
			description: 'GDPR-compliant data processing terms',
			lastUpdated: 'Updated Dec 2024',
			href: '/dpa'
		},
		{
			title: 'Security Whitepaper',
			description: 'Detailed technical security documentation',
			lastUpdated: 'Updated Nov 2024',
			href: '/security-whitepaper.pdf'
		}
	]

	return (
		<div className="from-background to-muted/20 min-h-screen bg-gradient-to-b">
			{/* Hero Section */}
			<section className="px-4 pt-24 pb-16">
				<div className="mx-auto max-w-7xl">
					<div className="mb-16 text-center">
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6 }}
							className="mb-6"
						>
							<Badge className="from-success via-primary to-accent border-0 bg-gradient-to-r px-6 py-2 text-sm font-semibold text-white shadow-lg">
								<Shield className="mr-2 h-4 w-4" />
								Enterprise Security
							</Badge>
						</motion.div>

						<motion.h1
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.1 }}
							className="text-foreground mb-6 text-5xl leading-tight font-bold lg:text-6xl"
						>
							Security &{' '}
							<span className="from-success via-primary to-accent bg-gradient-to-r bg-clip-text text-transparent">
								Compliance
							</span>
						</motion.h1>

						<motion.p
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.2 }}
							className="text-muted-foreground mx-auto max-w-3xl text-xl leading-relaxed"
						>
							Your data deserves the highest level of protection.
							We implement enterprise-grade security measures and
							maintain strict compliance standards to keep your
							information safe.
						</motion.p>
					</div>

					{/* Trust Signals */}
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8, delay: 0.3 }}
						className="mb-16 grid grid-cols-2 gap-6 lg:grid-cols-4"
					>
						{trustSignals.map(signal => (
							<Card
								key={signal.label}
								className="to-success/5 border-0 bg-gradient-to-br from-white text-center"
							>
								<CardContent className="p-6">
									<div className="text-success mb-2 text-3xl font-bold">
										{signal.metric}
									</div>
									<div className="text-foreground mb-1 text-sm font-semibold">
										{signal.label}
									</div>
									<div className="text-muted-foreground text-xs">
										{signal.description}
									</div>
								</CardContent>
							</Card>
						))}
					</motion.div>

					{/* Compliance Certifications */}
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8, delay: 0.4 }}
					>
						<div className="mb-12 text-center">
							<h2 className="text-foreground mb-4 text-3xl font-bold">
								Compliance Certifications
							</h2>
							<p className="text-muted-foreground mx-auto max-w-2xl">
								We maintain the highest standards of compliance
								with industry regulations and best practices.
							</p>
						</div>
						<Suspense
							fallback={
								<div className="bg-muted h-48 animate-pulse rounded-lg" />
							}
						>
							<ComplianceCertifications />
						</Suspense>
					</motion.div>
				</div>
			</section>

			{/* Security Features */}
			<section className="from-muted/20 to-muted/10 bg-gradient-to-r px-4 py-16">
				<div className="mx-auto max-w-7xl">
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						viewport={{ once: true }}
						className="mb-16 text-center"
					>
						<h2 className="text-foreground mb-6 text-4xl font-bold">
							Security Architecture
						</h2>
						<p className="text-muted-foreground mx-auto max-w-3xl text-xl">
							Our multi-layered security approach protects your
							data at every level, from infrastructure to
							application and user access.
						</p>
					</motion.div>

					<SecurityFeatures />
				</div>
			</section>

			{/* Data Protection Section */}
			<section className="px-4 py-16">
				<div className="mx-auto max-w-4xl">
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						viewport={{ once: true }}
						className="mb-12 text-center"
					>
						<h2 className="text-foreground mb-6 text-4xl font-bold">
							Data Protection Promise
						</h2>
						<p className="text-muted-foreground text-xl">
							We're committed to protecting your privacy and
							maintaining the confidentiality of your data.
						</p>
					</motion.div>

					<div className="grid grid-cols-1 gap-8 md:grid-cols-2">
						<motion.div
							initial={{ opacity: 0, x: -20 }}
							whileInView={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.6 }}
							viewport={{ once: true }}
						>
							<Card className="to-primary/5 h-full border-0 bg-gradient-to-br from-white">
								<CardContent className="p-8">
									<div className="mb-6 flex items-center space-x-3">
										<div className="from-primary to-accent flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br">
											<Fingerprint className="h-6 w-6 text-white" />
										</div>
										<h3 className="text-foreground text-2xl font-bold">
											Your Data, Your Control
										</h3>
									</div>
									<ul className="text-muted-foreground space-y-4">
										<li className="flex items-start space-x-3">
											<CheckCircle className="text-success mt-0.5 h-5 w-5 flex-shrink-0" />
											<span>
												You own your data - we're just
												the custodians
											</span>
										</li>
										<li className="flex items-start space-x-3">
											<CheckCircle className="text-success mt-0.5 h-5 w-5 flex-shrink-0" />
											<span>
												Export your data anytime in
												standard formats
											</span>
										</li>
										<li className="flex items-start space-x-3">
											<CheckCircle className="text-success mt-0.5 h-5 w-5 flex-shrink-0" />
											<span>
												Request deletion and we'll
												comply within 30 days
											</span>
										</li>
										<li className="flex items-start space-x-3">
											<CheckCircle className="text-success mt-0.5 h-5 w-5 flex-shrink-0" />
											<span>
												Transparent data usage with
												clear consent
											</span>
										</li>
									</ul>
								</CardContent>
							</Card>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, x: 20 }}
							whileInView={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.6, delay: 0.1 }}
							viewport={{ once: true }}
						>
							<Card className="to-accent/5 h-full border-0 bg-gradient-to-br from-white">
								<CardContent className="p-8">
									<div className="mb-6 flex items-center space-x-3">
										<div className="from-accent to-success flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br">
											<Cloud className="h-6 w-6 text-white" />
										</div>
										<h3 className="text-foreground text-2xl font-bold">
											Secure Infrastructure
										</h3>
									</div>
									<ul className="text-muted-foreground space-y-4">
										<li className="flex items-start space-x-3">
											<CheckCircle className="text-success mt-0.5 h-5 w-5 flex-shrink-0" />
											<span>
												AWS infrastructure with SOC 2
												compliance
											</span>
										</li>
										<li className="flex items-start space-x-3">
											<CheckCircle className="text-success mt-0.5 h-5 w-5 flex-shrink-0" />
											<span>
												Automated daily backups with
												encryption
											</span>
										</li>
										<li className="flex items-start space-x-3">
											<CheckCircle className="text-success mt-0.5 h-5 w-5 flex-shrink-0" />
											<span>
												Disaster recovery with 4-hour
												RTO
											</span>
										</li>
										<li className="flex items-start space-x-3">
											<CheckCircle className="text-success mt-0.5 h-5 w-5 flex-shrink-0" />
											<span>
												Regular penetration testing &
												vulnerability scans
											</span>
										</li>
									</ul>
								</CardContent>
							</Card>
						</motion.div>
					</div>
				</div>
			</section>

			{/* Security Policies */}
			<section className="from-muted/20 to-muted/10 bg-gradient-to-r px-4 py-16">
				<div className="mx-auto max-w-4xl">
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						viewport={{ once: true }}
						className="mb-12 text-center"
					>
						<h2 className="text-foreground mb-6 text-4xl font-bold">
							Legal & Compliance Documents
						</h2>
						<p className="text-muted-foreground text-xl">
							Access our comprehensive legal documentation and
							security policies.
						</p>
					</motion.div>

					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						{securityPolicies.map((policy, policyIndex) => (
							<motion.div
								key={policy.title}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{
									duration: 0.5,
									delay: policyIndex * 0.1
								}}
								viewport={{ once: true }}
							>
								<Link
									href={policy.href}
									target={
										policy.href.endsWith('.pdf')
											? '_blank'
											: undefined
									}
									rel={
										policy.href.endsWith('.pdf')
											? 'noopener noreferrer'
											: undefined
									}
								>
									<Card className="group cursor-pointer border-0 bg-white/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg">
										<CardContent className="p-6">
											<div className="flex items-start justify-between">
												<div className="flex-1">
													<h3 className="text-foreground group-hover:text-primary mb-2 font-semibold transition-colors">
														{policy.title}
													</h3>
													<p className="text-muted-foreground mb-3 text-sm">
														{policy.description}
													</p>
													<div className="text-muted-foreground flex items-center space-x-2 text-xs">
														<Clock className="h-3 w-3" />
														<span>
															{policy.lastUpdated}
														</span>
													</div>
												</div>
												<div className="ml-4">
													{policy.href.endsWith(
														'.pdf'
													) ? (
														<Download className="text-muted-foreground group-hover:text-primary h-5 w-5 transition-colors" />
													) : (
														<ExternalLink className="text-muted-foreground group-hover:text-primary h-5 w-5 transition-colors" />
													)}
												</div>
											</div>
										</CardContent>
									</Card>
								</Link>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* Security Contact */}
			<section className="px-4 py-16">
				<div className="mx-auto max-w-4xl text-center">
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						viewport={{ once: true }}
					>
						<Card className="from-warning/5 to-destructive/5 border-warning/20 border-0 bg-gradient-to-br">
							<CardContent className="p-8">
								<div className="mb-6 flex items-center justify-center space-x-3">
									<div className="bg-warning/10 flex h-12 w-12 items-center justify-center rounded-full">
										<AlertTriangle className="text-warning h-6 w-6" />
									</div>
									<h2 className="text-foreground text-2xl font-bold">
										Security Concerns?
									</h2>
								</div>

								<p className="text-muted-foreground mx-auto mb-6 max-w-2xl">
									If you discover a security vulnerability or
									have concerns about our security practices,
									please contact our security team
									immediately.
								</p>

								<div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
									<div className="text-muted-foreground text-sm">
										<strong>Security Email:</strong>{' '}
										security@tenantflow.app
									</div>
									<div className="text-muted-foreground text-sm">
										<strong>Response Time:</strong> Within 4
										hours
									</div>
								</div>

								<div className="mt-6">
									<Button
										asChild
										variant="outline"
										className="hover:bg-warning/5 hover:border-warning/50"
									>
										<Link href="mailto:security@tenantflow.app">
											Report Security Issue
										</Link>
									</Button>
								</div>
							</CardContent>
						</Card>
					</motion.div>
				</div>
			</section>
		</div>
	)
}
