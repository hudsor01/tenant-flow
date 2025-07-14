import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
	ArrowRight,
	Building,
	Users,
	FileText,
	BarChart3,
	Shield,
	Star,
	CheckCircle,
	Home,
	DollarSign,
	Clock,
	Zap
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Navigation } from '@/components/layout/Navigation'

export default function LandingPage() {
	const fadeInUp = {
		initial: { opacity: 0, y: 20 },
		animate: { opacity: 1, y: 0 },
		transition: { duration: 0.6 }
	}

	const staggerChildren = {
		animate: {
			transition: {
				staggerChildren: 0.1
			}
		}
	}

	const features = [
		{
			icon: Building,
			title: 'Property Management',
			description: 'Manage all your properties in one place with powerful organization tools'
		},
		{
			icon: Users,
			title: 'Tenant Portal',
			description: 'Give tenants secure access to their lease information and documents'
		},
		{
			icon: FileText,
			title: 'Lease Generator',
			description: 'Create professional, state-compliant leases in minutes'
		},
		{
			icon: DollarSign,
			title: 'Payment Tracking',
			description: 'Track rent payments and generate financial reports effortlessly'
		},
		{
			icon: BarChart3,
			title: 'Analytics & Reports',
			description: 'Get insights into your property portfolio performance'
		},
		{
			icon: Shield,
			title: 'Secure & Compliant',
			description: 'Bank-level security with full data encryption and compliance'
		}
	]

	const testimonials = [
		{
			name: 'Sarah Johnson',
			role: 'Property Owner',
			content: 'TenantFlow has transformed how I manage my rental properties. The automation saves me hours every week.',
			rating: 5
		},
		{
			name: 'Michael Chen',
			role: 'Real Estate Investor',
			content: 'The best property management software I\'ve used. The tenant portal alone is worth it.',
			rating: 5
		},
		{
			name: 'Emily Rodriguez',
			role: 'Property Manager',
			content: 'Finally, a solution that\'s both powerful and easy to use. My tenants love the portal access.',
			rating: 5
		}
	]

	return (
		<div className="min-h-screen">
			{/* Navigation */}
			<Navigation variant="public" />

			{/* Hero Section - Modern Full Width */}
			<section className="relative overflow-hidden bg-white pt-24 pb-40">
				<div className="mx-auto px-8 lg:px-12">
					<div className="mx-auto text-center">
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.8 }}
						>
							<motion.div
								className="inline-flex items-center rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 mb-8"
								initial={{ opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ delay: 0.2, duration: 0.5 }}
							>
								<Zap className="w-4 h-4 mr-2" />
								Trusted by 10,000+ Property Owners
							</motion.div>
							
							<motion.h1 
								className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl mb-10"
								initial={{ opacity: 0, y: 30 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.4, duration: 0.8 }}
							>
								Property Management{' '}
								<span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
									Simplified
								</span>
							</motion.h1>
							
							<motion.p 
								className="text-lg leading-relaxed text-gray-600 mb-16 mx-auto text-center"
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.6, duration: 0.8 }}
							>
								The complete platform for property owners to manage properties, track tenants, generate leases, and streamline operations. Join thousands of landlords who trust TenantFlow.
							</motion.p>
							
							<motion.div 
								className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20"
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.8, duration: 0.8 }}
							>
								<Link to="/auth/signup">
									<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
										<Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg">
											<Zap className="mr-2 h-5 w-5" />
											Start Free Trial
											<ArrowRight className="ml-2 h-5 w-5" />
										</Button>
									</motion.div>
								</Link>
								<Link to="/pricing">
									<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
										<Button size="lg" variant="outline" className="px-8 py-4 text-lg border-gray-300 hover:border-gray-400">
											<BarChart3 className="mr-2 h-5 w-5" />
											View Pricing
										</Button>
									</motion.div>
								</Link>
							</motion.div>
						</motion.div>
					</div>
					
					{/* Product Preview/Hero Image Section */}
					<motion.div 
						className="mt-20 flow-root sm:mt-28"
						initial={{ opacity: 0, y: 40 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 1, duration: 1 }}
					>
						<div className="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
							<div className="aspect-video rounded-md bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
								<div className="text-center">
									<Building className="h-24 w-24 text-blue-600 mx-auto mb-4" />
									<p className="text-lg font-semibold text-gray-900">Dashboard Preview</p>
									<p className="text-gray-600">Complete property management at your fingertips</p>
								</div>
							</div>
						</div>
					</motion.div>
				</div>
				
				{/* Background decoration */}
				<div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
					<div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-blue-600 to-purple-600 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)'}} />
				</div>
			</section>

			{/* Stats Section */}
			<section className="py-32 px-8 sm:px-12 lg:px-16 bg-white">
				<div className="container mx-auto max-w-6xl">
					{/* Stats */}
					<motion.div
						className="grid grid-cols-2 md:grid-cols-4 gap-12"
						variants={staggerChildren}
						initial="initial"
						animate="animate"
					>
						{[
							{ label: 'Properties Managed', value: '50,000+', icon: Building },
							{ label: 'Active Users', value: '10,000+', icon: Users },
							{ label: 'Leases Generated', value: '100,000+', icon: FileText },
							{ label: 'Uptime', value: '99.9%', icon: Shield }
						].map((stat, index) => (
							<motion.div
								key={index}
								className="text-center group"
								variants={fadeInUp}
								whileHover={{ 
									scale: 1.05,
									transition: { duration: 0.2 }
								}}
							>
								<motion.div
									className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors"
									whileHover={{ rotate: 5 }}
								>
									<stat.icon className="w-8 h-8 text-primary" />
								</motion.div>
								<motion.div 
									className="text-3xl font-bold text-primary mb-1"
									initial={{ scale: 0 }}
									whileInView={{ scale: 1 }}
									transition={{ delay: index * 0.1, duration: 0.5 }}
									viewport={{ once: true }}
								>
									{stat.value}
								</motion.div>
								<div className="text-sm text-muted-foreground">{stat.label}</div>
							</motion.div>
						))}
					</motion.div>
				</div>
			</section>

			{/* Features Section */}
			<section className="py-32 px-8 sm:px-12 lg:px-16 bg-muted/30">
				<div className="container mx-auto">
					<motion.div
						className="text-center mb-20"
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						viewport={{ once: true }}
					>
						<h2 className="text-4xl font-bold mb-6">Everything You Need</h2>
						<p className="text-lg text-muted-foreground mx-auto">
							Powerful features designed to make property management effortless
						</p>
					</motion.div>

					<motion.div
						className="grid md:grid-cols-2 lg:grid-cols-3 gap-10"
						variants={staggerChildren}
						initial="initial"
						whileInView="animate"
						viewport={{ once: true }}
					>
						{features.map((feature, index) => (
							<motion.div 
								key={index} 
								variants={fadeInUp}
								whileHover={{ 
									y: -8,
									transition: { duration: 0.2 }
								}}
								className="group"
							>
								<Card className="h-full hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20 bg-card/50 backdrop-blur-sm">
									<CardHeader>
										<motion.div
											whileHover={{ 
												scale: 1.1,
												rotate: 5,
												transition: { duration: 0.2 }
											}}
											className="w-fit"
										>
											<feature.icon className="w-10 h-10 text-primary mb-4 group-hover:text-primary/80 transition-colors" />
										</motion.div>
										<CardTitle className="group-hover:text-primary transition-colors">{feature.title}</CardTitle>
									</CardHeader>
									<CardContent>
										<CardDescription>{feature.description}</CardDescription>
									</CardContent>
								</Card>
							</motion.div>
						))}
					</motion.div>
				</div>
			</section>

			{/* Testimonials Section */}
			<section className="py-32 px-8 sm:px-12 lg:px-16">
				<div className="container mx-auto max-w-6xl">
					<motion.div
						className="text-center mb-20"
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						viewport={{ once: true }}
					>
						<h2 className="text-4xl font-bold mb-6">Loved by Property Owners</h2>
						<p className="text-lg text-muted-foreground">
							See what our customers have to say
						</p>
					</motion.div>

					<motion.div
						className="grid md:grid-cols-3 gap-10"
						variants={staggerChildren}
						initial="initial"
						whileInView="animate"
						viewport={{ once: true }}
					>
						{testimonials.map((testimonial, index) => (
							<motion.div 
								key={index} 
								variants={fadeInUp}
								whileHover={{ 
									y: -5,
									transition: { duration: 0.2 }
								}}
							>
								<Card className="h-full bg-card/50 backdrop-blur-sm border-2 hover:border-primary/20 hover:shadow-lg transition-all duration-300">
									<CardHeader>
										<div className="flex mb-3">
											{[...Array(testimonial.rating)].map((_, i) => (
												<motion.div
													key={i}
													initial={{ scale: 0 }}
													animate={{ scale: 1 }}
													transition={{ delay: i * 0.1 }}
												>
													<Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
												</motion.div>
											))}
										</div>
										<CardDescription className="text-base italic text-foreground">
											"{testimonial.content}"
										</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="flex items-center space-x-3">
											<div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
												<span className="font-semibold text-primary text-sm">
													{testimonial.name.split(' ').map(n => n[0]).join('')}
												</span>
											</div>
											<div>
												<div className="font-semibold text-foreground">{testimonial.name}</div>
												<div className="text-sm text-muted-foreground">{testimonial.role}</div>
											</div>
										</div>
									</CardContent>
								</Card>
							</motion.div>
						))}
					</motion.div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="py-32 px-8 sm:px-12 lg:px-16 bg-primary/5">
				<div className="container mx-auto max-w-4xl text-center">
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						whileInView={{ opacity: 1, scale: 1 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5 }}
					>
						<h2 className="text-4xl font-bold mb-6">
							Ready to Streamline Your Property Management?
						</h2>
						<p className="text-lg text-muted-foreground mb-10">
							Join thousands of property owners who trust TenantFlow
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Link to="/auth/signup">
								<Button size="lg" className="w-full sm:w-auto">
									Start Your Free Trial
									<ArrowRight className="ml-2 h-4 w-4" />
								</Button>
							</Link>
							<Link to="/tools/lease-generator">
								<Button size="lg" variant="outline" className="w-full sm:w-auto">
									Try Lease Generator
									<FileText className="ml-2 h-4 w-4" />
								</Button>
							</Link>
						</div>
						<p className="text-sm text-muted-foreground mt-4">
							No credit card required • 14-day free trial
						</p>
					</motion.div>
				</div>
			</section>

			{/* Footer */}
			<footer className="border-t py-16 px-8 sm:px-12 lg:px-16">
				<div className="container mx-auto max-w-6xl">
					<div className="grid md:grid-cols-4 gap-8">
						<div>
							<Link to="/" className="flex items-center space-x-2 mb-4">
								<Building className="h-6 w-6 text-primary" />
								<span className="font-bold">TenantFlow</span>
							</Link>
							<p className="text-sm text-muted-foreground">
								The modern way to manage your rental properties.
							</p>
						</div>
						<div>
							<h4 className="font-semibold mb-4">Product</h4>
							<ul className="space-y-2 text-sm text-muted-foreground">
								<li>
									<Link to="/pricing" className="hover:text-foreground transition-colors">
										Pricing
									</Link>
								</li>
								<li>
									<Link to="/tools/lease-generator" className="hover:text-foreground transition-colors">
										Lease Generator
									</Link>
								</li>
							</ul>
						</div>
						<div>
							<h4 className="font-semibold mb-4">Resources</h4>
							<ul className="space-y-2 text-sm text-muted-foreground">
								<li>
									<Link to="/blog" className="hover:text-foreground transition-colors">
										Blog
									</Link>
								</li>
							</ul>
						</div>
						<div>
							<h4 className="font-semibold mb-4">Legal</h4>
							<ul className="space-y-2 text-sm text-muted-foreground">
								<li>
									<Link to="/privacy" className="hover:text-foreground transition-colors">
										Privacy Policy
									</Link>
								</li>
								<li>
									<Link to="/terms" className="hover:text-foreground transition-colors">
										Terms of Service
									</Link>
								</li>
							</ul>
						</div>
					</div>
					<div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
						© {new Date().getFullYear()} TenantFlow. All rights reserved.
					</div>
				</div>
			</footer>
		</div>
	)
}