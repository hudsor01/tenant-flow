import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
	CardContent
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
	Calculator,
	CheckCircle,
	Clock,
	Shield,
	ArrowRight,
	DollarSign,
	FileText,
	Mail,
	Star,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Navigation } from '@/components/layout/Navigation'
import { SEO } from '@/components/seo/SEO'

export default function InvoiceGeneratorLanding() {

	const features = [
		{
			icon: Calculator,
			title: 'Professional Templates',
			description: 'Clean, professional invoice designs that make you look established'
		},
		{
			icon: DollarSign,
			title: 'Auto Tax Calculation',
			description: 'Automatic state-specific sales tax calculation for all 50 US states'
		},
		{
			icon: FileText,
			title: 'PDF Generation',
			description: 'Download professional PDFs ready to send to clients instantly'
		},
		{
			icon: Mail,
			title: 'Email Integration',
			description: 'Generate and email invoices directly to your clients'
		},
		{
			icon: Clock,
			title: 'Save Time',
			description: 'Create professional invoices in minutes, not hours'
		},
		{
			icon: Shield,
			title: 'Data Security',
			description: 'Your business and client data is processed securely'
		}
	]

	const benefits = [
		'Professional invoice templates',
		'Automatic tax calculations',
		'Instant PDF downloads',
		'Email integration',
		'Mobile-friendly design',
		'No registration required'
	]

	return (
		<>
			<SEO
				title="Free Professional Invoice Generator - TenantFlow"
				description="Create beautiful, professional invoices with automatic tax calculations for all 50 US states. Download PDFs instantly or email directly to clients."
				keywords="invoice generator, professional invoices, tax calculation, PDF generator, business invoicing"
				type="website"
				canonical={`${window.location.origin}/tools/invoice-generator`}
			/>
			
			<div className="min-h-screen bg-white">
				{/* Navigation */}
				<Navigation context="public" />

				{/* Hero Section */}
				<section className="relative bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 text-white overflow-hidden">
					{/* Background Pattern */}
					<div className="absolute inset-0">
						<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>
						<div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.05%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%221%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
					</div>
					
					<div className="relative">
						<div className="container mx-auto px-6 py-20 lg:py-32">
							<motion.div 
								className="max-w-5xl mx-auto text-center"
								initial={{ opacity: 0, y: 30 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
							>
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.6, delay: 0.2 }}
								>
									<Badge 
										variant="secondary" 
										className="mb-8 bg-blue-500/10 text-blue-200 border-blue-500/20 px-6 py-2 text-sm font-medium backdrop-blur-sm"
									>
										<Calculator className="w-4 h-4 mr-2" />
										Free Professional Invoice Generator
									</Badge>
								</motion.div>
								
								<motion.h1 
									className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-8 leading-[1.1] tracking-tight"
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.8, delay: 0.3 }}
								>
									Create Professional{' '}
									<span className="bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent">
										Invoices
									</span>{' '}
									in Minutes
								</motion.h1>
								
								<motion.p 
									className="text-xl lg:text-2xl text-blue-100/90 mb-12 max-w-4xl mx-auto leading-relaxed font-light"
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.8, delay: 0.4 }}
								>
									Generate beautiful, professional invoices with automatic tax calculations for all 50 US states. Download PDFs instantly or email directly to clients.
								</motion.p>
								
								<motion.div 
									className="flex flex-col sm:flex-row gap-4 justify-center items-center"
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.8, delay: 0.5 }}
								>
									<Link to="/tools/invoice-generator">
										<Button 
											size="lg" 
											className="group px-8 py-4 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
										>
											Start Creating Invoices
											<ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
										</Button>
									</Link>
									<Button
										variant="outline"
										size="lg"
										className="px-8 py-4 text-lg border-white/20 text-white hover:bg-white/10 backdrop-blur-sm"
										onClick={() => {
											document.getElementById('features')?.scrollIntoView({
												behavior: 'smooth'
											})
										}}
									>
										Learn More
									</Button>
								</motion.div>
							</motion.div>
						</div>
						
						{/* Enhanced Bottom Gradient */}
						<div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-50 via-gray-50/80 to-transparent"></div>
					</div>
				</section>

			{/* Features Section */}
			<section id="features" className="py-24 bg-gradient-to-b from-gray-50 to-white">
				<div className="container mx-auto px-6">
					<motion.div 
						className="text-center mb-20"
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: "-100px" }}
						transition={{ duration: 0.8 }}
					>
						<h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
							Everything You Need for{' '}
							<span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
								Professional Invoicing
							</span>
						</h2>
						<p className="text-xl text-gray-600 mx-auto max-w-3xl font-light leading-relaxed">
							Create, customize, and send professional invoices that get you paid faster.
						</p>
					</motion.div>

					<motion.div
						className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto"
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						viewport={{ once: true }}
						transition={{ duration: 0.8, staggerChildren: 0.1 }}
					>
						{features.map((feature, index) => (
							<motion.div 
								key={index}
								initial={{ opacity: 0, y: 30 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.8, delay: index * 0.1 }}
							>
								<Card className="border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white/80 backdrop-blur-sm hover:bg-white hover:-translate-y-2 overflow-hidden h-full">
									<CardHeader className="text-center p-8">
										<div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg mx-auto">
											<feature.icon className="h-8 w-8" />
										</div>
										<CardTitle className="text-gray-900 text-xl mb-4 font-bold">
											{feature.title}
										</CardTitle>
										<CardDescription className="text-gray-600 text-base leading-relaxed">
											{feature.description}
										</CardDescription>
									</CardHeader>
								</Card>
							</motion.div>
						))}
					</motion.div>
				</div>
			</section>

			{/* Benefits Section */}
			<section className="py-24 bg-white">
				<div className="container mx-auto px-6">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
						<motion.div 
							initial={{ opacity: 0, x: -30 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.8 }}
						>
							<h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
								Why Choose Our{' '}
								<span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
									Invoice Generator?
								</span>
							</h2>
							<p className="text-xl text-gray-600 mb-8 leading-relaxed font-light">
								Save time and look professional with our comprehensive invoice solution. Built specifically for property managers, freelancers, and small businesses.
							</p>

							<motion.div
								className="space-y-4"
								initial={{ opacity: 0 }}
								whileInView={{ opacity: 1 }}
								viewport={{ once: true }}
								transition={{ duration: 0.8, staggerChildren: 0.1 }}
							>
								{benefits.map((benefit, index) => (
									<motion.div
										key={index}
										initial={{ opacity: 0, x: -20 }}
										whileInView={{ opacity: 1, x: 0 }}
										viewport={{ once: true }}
										transition={{ duration: 0.6, delay: index * 0.1 }}
										className="flex items-center gap-4"
									>
										<div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
											<CheckCircle className="text-white h-4 w-4" />
										</div>
										<span className="text-gray-700 text-lg">{benefit}</span>
									</motion.div>
								))}
							</motion.div>
						</motion.div>

						<motion.div 
							initial={{ opacity: 0, x: 30 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.8, delay: 0.2 }}
						>
							<Card className="border-0 shadow-2xl bg-gradient-to-br from-white to-blue-50/50 backdrop-blur-sm overflow-hidden">
								<CardHeader className="text-center p-8 bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
									<div className="mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm shadow-lg">
										<Calculator className="h-10 w-10" />
									</div>
									<CardTitle className="text-white text-3xl mb-4 font-bold">
										Start Creating Invoices
									</CardTitle>
									<CardDescription className="text-blue-100 text-lg leading-relaxed">
										Professional invoices with automatic tax calculation, instant PDF downloads, and email integration.
									</CardDescription>
								</CardHeader>
								<CardContent className="p-8">
									<Link to="/tools/invoice-generator">
										<Button 
											size="lg" 
											className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 py-4 text-lg font-semibold"
										>
											Create Your First Invoice
											<ArrowRight className="ml-2 h-5 w-5" />
										</Button>
									</Link>
								</CardContent>
							</Card>
						</motion.div>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="py-24 bg-gradient-to-br from-blue-50 to-indigo-50">
				<div className="container mx-auto px-6">
					<motion.div 
						className="text-center max-w-4xl mx-auto"
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.8 }}
					>
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.6, delay: 0.2 }}
						>
							<Badge 
								variant="secondary" 
								className="mb-8 bg-blue-100 text-blue-700 border-blue-200 px-6 py-2 text-sm font-medium"
							>
								<Star className="w-4 h-4 mr-2" />
								Trusted by 10,000+ Users
							</Badge>
						</motion.div>
						
						<motion.h2 
							className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight"
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.8, delay: 0.3 }}
						>
							Ready to Create{' '}
							<span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
								Professional Invoices?
							</span>
						</motion.h2>
						
						<motion.p 
							className="text-xl text-gray-600 mx-auto mb-12 max-w-3xl leading-relaxed font-light"
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.8, delay: 0.4 }}
						>
							Join thousands of property managers and business owners who trust TenantFlow for their invoicing needs.
						</motion.p>
						
						<motion.div 
							className="flex flex-col sm:flex-row gap-4 justify-center items-center"
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.8, delay: 0.5 }}
						>
							<Link to="/tools/invoice-generator">
								<Button 
									size="lg" 
									className="px-8 py-4 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 font-semibold"
								>
									Get Started Now
									<ArrowRight className="ml-2 h-5 w-5" />
								</Button>
							</Link>
							<Link to="/auth/Signup">
								<Button 
									variant="outline" 
									size="lg" 
									className="px-8 py-4 text-lg border-gray-300 text-gray-700 hover:bg-gray-50"
								>
									Sign Up Free
								</Button>
							</Link>
						</motion.div>
					</motion.div>
				</div>
			</section>
		</div>
		</>
	)
}