import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
	CardContent
} from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
	FileText,
	CheckCircle,
	Star,
	Users,
	Clock,
	ArrowRight,
	Building,
	DollarSign,
	TrendingUp,
	BarChart3,
	MessageSquare,
	Smartphone,
	Quote,
	ChevronLeft,
	ChevronRight,
	BookOpen,
	ChevronDown,
	Calculator,
	Menu,
	X,
	Facebook,
	Shield
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { SEO } from '@/components/seo/SEO'
import { LocalBusinessSchema } from '@/components/seo/LocalBusinessSchema'
import { generateOrganizationStructuredData } from '@/lib/seo-utils'

export default function LandingPage() {
	const [currentTestimonial, setCurrentTestimonial] = useState(0)
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
	const [scrolled, setScrolled] = useState(false)

	useEffect(() => {
		const handleScroll = () => {
			setScrolled(window.scrollY > 20)
		}
		window.addEventListener('scroll', handleScroll)
		return () => window.removeEventListener('scroll', handleScroll)
	}, [])

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

	// Sample testimonials - replace with real customer testimonials
	const testimonials = [
		{
			name: 'Sarah Johnson',
			role: 'Property Owner',
			properties: '12 units',
			image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&crop=face&auto=format',
			quote: 'TenantFlow saved me 15+ hours per week. The automated rent tracking and maintenance requests have completely transformed how I manage my properties.',
			rating: 5
		},
		{
			name: 'Michael Chen',
			role: 'Real Estate Investor',
			properties: '8 properties',
			image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&crop=face&auto=format',
			quote: 'The lease generator alone paid for itself in the first month. Professional templates that keep me compliant while saving legal fees.',
			rating: 5
		},
		{
			name: 'Emily Rodriguez',
			role: 'Property Manager',
			properties: '25+ units',
			image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&crop=face&auto=format',
			quote: 'Switched from spreadsheets to TenantFlow and never looked back. My tenants love the transparency and I love the efficiency.',
			rating: 5
		}
	]

	const stats = [
		{ label: 'Properties Managed', value: '10,000+', icon: Building },
		{ label: 'Hours Saved Monthly', value: '50,000+', icon: Clock },
		{ label: 'Customer Satisfaction', value: '98%', icon: Star },
		{ label: 'Average ROI Increase', value: '23%', icon: TrendingUp }
	]

	const organizationStructuredData = generateOrganizationStructuredData()

	return (
		<>
			<SEO
				title="TenantFlow - Modern Property Management Software"
				description="Streamline your property management with TenantFlow. Manage tenants, properties, maintenance requests, and finances all in one powerful platform. Start your free trial today."
				keywords="property management software, tenant management, rental properties, landlord tools, property manager, lease management, maintenance tracking"
				type="website"
				canonical="https://tenantflow.app"
				structuredData={organizationStructuredData}
			/>

			<LocalBusinessSchema
				serviceArea={[
					'United States',
					'Canada',
					'United Kingdom',
					'Australia'
				]}
				priceRange="$49-$399"
			/>

			<div className="bg-background relative min-h-screen overflow-x-hidden">
				{/* Global Background Elements */}
				<div className="from-primary/3 via-background to-secondary/3 fixed inset-0 -z-10 bg-gradient-to-br"></div>
				<div className="fixed inset-0 -z-10 bg-[linear-gradient(45deg,transparent_48%,rgb(142,76,36,0.03)_49%,rgb(142,76,36,0.03)_51%,transparent_52%)] bg-[length:20px_20px]"></div>
				<div className="fixed top-0 left-0 -z-10 h-full w-full bg-[radial-gradient(circle_at_25%_25%,rgb(142,76,36,0.05)_0%,transparent_25%),radial-gradient(circle_at_75%_75%,rgb(142,76,36,0.03)_0%,transparent_25%)]"></div>

				{/* Geometric Accent Elements */}
				<div className="from-primary/5 fixed top-20 left-8 -z-10 h-64 w-64 rounded-full bg-gradient-to-r to-transparent blur-3xl"></div>
				<div className="from-secondary/5 fixed right-8 bottom-20 -z-10 h-96 w-96 rounded-full bg-gradient-to-l to-transparent blur-3xl"></div>
				<div className="via-primary/2 fixed top-1/2 left-1/2 -z-10 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 transform rounded-full bg-gradient-to-r from-transparent to-transparent blur-3xl"></div>
				{/* Enhanced Navigation */}
				<nav
					className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${
						scrolled
							? 'bg-background/80 border-border/40 border-b shadow-sm backdrop-blur-md'
							: 'bg-transparent'
					}`}
				>
					<div className="container mx-auto px-4 sm:px-6 lg:px-8">
						<div className="flex h-20 items-center justify-between">
							<div className="group flex cursor-pointer items-center space-x-3">
								<span className="from-foreground to-foreground/60 bg-gradient-to-r bg-clip-text text-2xl font-bold text-transparent">
									TenantFlow
								</span>
							</div>

							{/* Desktop Menu - Centered */}
							<div className="absolute left-1/2 hidden -translate-x-1/2 transform items-center space-x-8 lg:flex">
								{/* Tools Dropdown */}
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="ghost"
											className="flex items-center gap-2 px-4 py-2 text-lg font-medium transition-all duration-200 hover:bg-blue-50 hover:text-blue-600"
										>
											Tools
											<ChevronDown className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent
										align="start"
										className="w-72 border bg-white/95 shadow-xl backdrop-blur-xl"
									>
										<DropdownMenuItem
											asChild
											className="cursor-pointer"
										>
											<Link
												to="/lease-generator"
												className="flex items-center gap-3 px-4 py-3"
											>
												<div className="rounded-lg bg-blue-500/10 p-2">
													<FileText className="h-5 w-5 text-blue-600" />
												</div>
												<div className="flex flex-col">
													<span className="text-lg font-semibold">
														Lease Generator
													</span>
													<span className="text-muted-foreground text-base">
														Create legal lease
														agreements
													</span>
												</div>
											</Link>
										</DropdownMenuItem>
										<DropdownMenuItem
											asChild
											className="cursor-pointer"
										>
											<Link
												to="/invoice-generator"
												className="flex items-center gap-3 px-4 py-3"
											>
												<div className="rounded-lg bg-green-500/10 p-2">
													<Calculator className="h-5 w-5 text-green-600" />
												</div>
												<div className="flex flex-col">
													<span className="text-lg font-semibold">
														Invoice Generator
													</span>
													<span className="text-muted-foreground text-base">
														Professional invoice
														templates
													</span>
												</div>
											</Link>
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>

								<Link
									to="/blog"
									className="text-muted-foreground hover:text-foreground group relative px-3 py-2 text-lg font-medium transition-all duration-200"
								>
									Blog
									<span className="bg-primary absolute -bottom-1 left-0 h-0.5 w-0 transition-all duration-200 group-hover:w-full"></span>
								</Link>
								<Link
									to="/pricing"
									className="text-muted-foreground hover:text-foreground group relative px-3 py-2 text-lg font-medium transition-all duration-200"
								>
									Pricing
									<span className="bg-primary absolute -bottom-1 left-0 h-0.5 w-0 transition-all duration-200 group-hover:w-full"></span>
								</Link>
							</div>

							{/* Auth Buttons - Right Side */}
							<div className="hidden items-center space-x-4 lg:flex">
								<Button
									variant="ghost"
									className="hover:bg-primary/10 px-6 py-3 text-lg font-medium"
									asChild
								>
									<Link to="/auth/login">Sign In</Link>
								</Button>
								<Button
									className="bg-primary hover:bg-primary/90 flex transform items-center justify-center px-8 py-3 text-lg font-semibold shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
									asChild
								>
									<Link to="/auth/signup">
										Start Free Trial
									</Link>
								</Button>
							</div>

							{/* Mobile Menu Button */}
							<button
								className="hover:bg-primary/10 rounded-lg p-3 transition-colors duration-200 lg:hidden"
								onClick={() =>
									setIsMobileMenuOpen(!isMobileMenuOpen)
								}
							>
								{isMobileMenuOpen ? (
									<X className="h-8 w-8" />
								) : (
									<Menu className="h-8 w-8" />
								)}
							</button>
						</div>
					</div>

					{/* Mobile Menu */}
					<div
						className={`transition-all duration-300 ease-in-out lg:hidden ${
							isMobileMenuOpen
								? 'max-h-96 pb-6 opacity-100'
								: 'max-h-0 overflow-hidden opacity-0'
						}`}
					>
						<div className="border-border/40 space-y-4 border-t pt-4">
							<a
								href="#features"
								className="text-muted-foreground hover:text-foreground block py-2 text-lg font-medium transition-colors"
								onClick={() => setIsMobileMenuOpen(false)}
							>
								Features
							</a>
							<a
								href="#pricing"
								className="text-muted-foreground hover:text-foreground block py-2 text-lg font-medium transition-colors"
								onClick={() => setIsMobileMenuOpen(false)}
							>
								Pricing
							</a>
							<div className="space-y-3 pt-4">
								<Button
									variant="outline"
									className="w-full"
									asChild
								>
									<Link to="/auth/login">Sign In</Link>
								</Button>
								<Button
									className="bg-primary hover:bg-primary/90 w-full"
									asChild
								>
									<Link to="/auth/signup">
										Start Free Trial
									</Link>
								</Button>
							</div>
						</div>
					</div>
				</nav>

				{/* Enhanced Hero Section */}
				<section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-32">
					<div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
						<div className="mx-auto max-w-6xl text-center">
							{/* Enhanced Headline */}
							<h1 className="text-display mb-10">
								<span className="from-foreground via-primary to-foreground bg-gradient-to-r bg-clip-text text-transparent">
									Transform Your Property
								</span>
								<br />
								<span className="text-[#1e293b]">
									Management Today
								</span>
							</h1>

							{/* Enhanced Subtitle */}
							<p className="text-muted-foreground mx-auto mb-12 max-w-4xl text-xl leading-relaxed">
								Join 10,000+ landlords who increased their
								rental income by 23% with TenantFlow's
								all-in-one property management platform.{' '}
								<span className="text-primary font-semibold">
									Transform your property business with modern
									insights.
								</span>
							</p>
							{/* Enhanced CTA Buttons */}
							<div className="mb-16 flex flex-col justify-center gap-6 sm:flex-row">
								<Button
									size="lg"
									className="bg-primary hover:bg-primary/90 group flex transform items-center justify-center px-10 py-6 text-lg font-semibold shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl"
									asChild
								>
									<Link to="/pricing">Start Free Trial</Link>
								</Button>
								<Button
									variant="outline"
									size="lg"
									className="hover:bg-primary/5 flex transform items-center justify-center border-2 px-10 py-6 text-lg font-semibold shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
									asChild
								>
									<Link to="/lease-generator">
										Generate a Lease!
									</Link>
								</Button>
							</div>

							{/* Enhanced Trust Indicators */}
							<div className="text-muted-foreground mb-16 flex flex-wrap items-center justify-center gap-8 text-lg">
								<div className="hover:text-foreground flex cursor-pointer items-center transition-colors">
									<CheckCircle className="text-primary mr-3 h-6 w-6" />
									<span className="font-medium">
										No setup fees
									</span>
								</div>
								<div className="hover:text-foreground flex cursor-pointer items-center transition-colors">
									<CheckCircle className="text-primary mr-3 h-6 w-6" />
									<span className="font-medium">
										14-day free trial
									</span>
								</div>
								<div className="hover:text-foreground flex cursor-pointer items-center transition-colors">
									<CheckCircle className="text-primary mr-3 h-6 w-6" />
									<span className="font-medium">
										Cancel anytime
									</span>
								</div>
								<div className="hover:text-foreground flex cursor-pointer items-center transition-colors">
									<Shield className="text-primary mr-3 h-6 w-6" />
									<span className="font-medium">
										Enterprise security
									</span>
								</div>
							</div>

							{/* Social Proof Stats */}
							<div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 md:grid-cols-4">
								{stats.map((stat, index) => (
									<motion.div
										key={stat.label}
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{
											duration: 0.6,
											delay: 0.8 + index * 0.1
										}}
										className="text-center"
									>
										<div className="mb-2 flex items-center justify-center">
											<stat.icon className="text-primary mr-2 h-6 w-6" />
											<span className="text-foreground text-2xl font-bold md:text-3xl">
												{stat.value}
											</span>
										</div>
										<p className="text-muted-foreground text-sm">
											{stat.label}
										</p>
									</motion.div>
								))}
							</div>
						</div>
					</div>
				</section>

				{/* Enhanced Problem/Solution Section */}
				<section className="bg-secondary/20 relative overflow-hidden py-24">
					<div className="from-primary/3 to-secondary/3 absolute inset-0 bg-gradient-to-br via-transparent"></div>
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgb(142,76,36,0.08)_0%,transparent_40%)]"></div>
					<div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
						<div className="mb-20 text-center">
							<h2 className="text-heading mb-8">
								<span className="from-foreground via-primary to-foreground bg-gradient-to-r bg-clip-text text-transparent">
									Stop Losing Money on Manual Property
									Management
								</span>
							</h2>
							<p className="text-muted-foreground mx-auto max-w-4xl text-xl leading-relaxed">
								Most landlords waste 15+ hours weekly on
								spreadsheets, phone calls, and paperwork.
								TenantFlow automates everything, so you can
								focus on growing your portfolio.
							</p>
						</div>

						<div className="mb-16 grid items-center gap-12 lg:grid-cols-2">
							{/* Before: Manual Process */}
							<motion.div
								initial={{ opacity: 0, x: -50 }}
								whileInView={{ opacity: 1, x: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.6 }}
							>
								<div className="relative">
									<h3 className="text-destructive mb-6 text-2xl font-bold">
										❌ Before TenantFlow
									</h3>
									<div className="space-y-4">
										<div className="bg-error border-destructive/20 flex items-start gap-3 rounded-lg border p-4">
											<div className="bg-destructive mt-2 h-2 w-2 rounded-full"></div>
											<div>
												<p className="text-destructive-foreground font-semibold">
													Hours lost on spreadsheets
												</p>
												<p className="text-destructive text-sm">
													Tracking rent payments,
													expenses, and tenant data
													manually
												</p>
											</div>
										</div>
										<div className="bg-error border-destructive/20 flex items-start gap-3 rounded-lg border p-4">
											<div className="bg-destructive mt-2 h-2 w-2 rounded-full"></div>
											<div>
												<p className="text-destructive-foreground font-semibold">
													Missed rent payments
												</p>
												<p className="text-destructive text-sm">
													No automated reminders or
													tracking systems
												</p>
											</div>
										</div>
										<div className="bg-error border-destructive/20 flex items-start gap-3 rounded-lg border p-4">
											<div className="bg-destructive mt-2 h-2 w-2 rounded-full"></div>
											<div>
												<p className="text-destructive-foreground font-semibold">
													Legal compliance risks
												</p>
												<p className="text-destructive text-sm">
													Using generic lease
													templates and missing
													disclosures
												</p>
											</div>
										</div>
									</div>
								</div>
							</motion.div>

							{/* After: TenantFlow */}
							<motion.div
								initial={{ opacity: 0, x: 50 }}
								whileInView={{ opacity: 1, x: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.6, delay: 0.2 }}
							>
								<div className="relative">
									<h3 className="text-success mb-6 text-2xl font-bold">
										✅ After TenantFlow
									</h3>
									<div className="space-y-4">
										<div className="bg-success border-success flex items-start gap-3 rounded-lg border p-4">
											<CheckCircle className="text-success mt-1 h-5 w-5" />
											<div>
												<p className="text-success-foreground font-semibold">
													Automated everything
												</p>
												<p className="text-success text-sm">
													Rent tracking, late fees,
													and financial reports
													generated automatically
												</p>
											</div>
										</div>
										<div className="bg-success border-success flex items-start gap-3 rounded-lg border p-4">
											<CheckCircle className="text-success mt-1 h-5 w-5" />
											<div>
												<p className="text-success-foreground font-semibold">
													Never miss payments
												</p>
												<p className="text-success text-sm">
													Automatic reminders and
													real-time payment
													notifications
												</p>
											</div>
										</div>
										<div className="bg-success border-success flex items-start gap-3 rounded-lg border p-4">
											<CheckCircle className="text-success mt-1 h-5 w-5" />
											<div>
												<p className="text-success-foreground font-semibold">
													Legal protection included
												</p>
												<p className="text-success text-sm">
													State-specific lease
													templates with all required
													disclosures
												</p>
											</div>
										</div>
									</div>
								</div>
							</motion.div>
						</div>

						<motion.div {...fadeInUp} className="text-center">
							<Link to="/pricing">
								<Button
									size="lg"
									className="from-primary to-primary/90 hover:from-primary/90 hover:to-primary bg-gradient-to-r px-12 py-6 text-lg shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
								>
									<div className="flex items-center gap-2">
										<span>
											Transform Your Business Today
										</span>
										<ArrowRight className="h-5 w-5" />
									</div>
								</Button>
							</Link>
							<p className="text-muted-foreground mt-4 text-sm">
								Join thousands of landlords saving 15+ hours per
								week
							</p>
						</motion.div>
					</div>
				</section>

				{/* Enhanced Testimonials Section */}
				<section className="px-4 py-24">
					<div className="container mx-auto px-4 sm:px-6 lg:px-8">
						<div className="mb-20 text-center">
							<h2 className="text-heading mb-8">
								<span className="from-foreground via-primary to-foreground bg-gradient-to-r bg-clip-text text-transparent">
									Loved by 10,000+ Landlords
								</span>
							</h2>
							<p className="text-muted-foreground mx-auto max-w-3xl text-xl leading-relaxed">
								See why property owners trust TenantFlow to
								manage their investments
							</p>
						</div>

						<div className="relative mx-auto max-w-4xl">
							<motion.div
								key={currentTestimonial}
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -20 }}
								transition={{ duration: 0.5 }}
								className="text-center"
							>
								<Card className="border-2 p-8 shadow-lg">
									<CardContent>
										<Quote className="text-primary mx-auto mb-6 h-12 w-12" />
										<blockquote className="text-foreground mb-8 text-xl leading-relaxed font-medium md:text-2xl">
											"
											{
												testimonials[currentTestimonial]
													.quote
											}
											"
										</blockquote>

										<div className="flex items-center justify-center gap-4">
											<Avatar className="h-16 w-16">
												<AvatarImage
													src={
														testimonials[
															currentTestimonial
														].image
													}
													alt={
														testimonials[
															currentTestimonial
														].name
													}
												/>
												<AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
													{testimonials[
														currentTestimonial
													].name
														.split(' ')
														.map(n => n[0])
														.join('')}
												</AvatarFallback>
											</Avatar>
											<div className="text-left">
												<div className="text-lg font-bold">
													{
														testimonials[
															currentTestimonial
														].name
													}
												</div>
												<div className="text-muted-foreground">
													{
														testimonials[
															currentTestimonial
														].role
													}
												</div>
												<div className="text-primary text-sm font-medium">
													{
														testimonials[
															currentTestimonial
														].properties
													}
												</div>
											</div>
										</div>

										<div className="mt-4 flex justify-center">
											{[
												...Array(
													testimonials[
														currentTestimonial
													].rating
												)
											].map((_, i) => (
												<Star
													key={i}
													className="h-5 w-5 fill-yellow-400 text-yellow-400"
												/>
											))}
										</div>
									</CardContent>
								</Card>
							</motion.div>

							{/* Navigation */}
							<div className="mt-8 flex items-center justify-center gap-4">
								<Button
									variant="outline"
									size="sm"
									onClick={() =>
										setCurrentTestimonial(prev =>
											prev === 0
												? testimonials.length - 1
												: prev - 1
										)
									}
									className="rounded-full"
								>
									<ChevronLeft className="h-4 w-4" />
								</Button>

								<div className="flex gap-2">
									{testimonials.map((_, index) => (
										<button
											key={index}
											onClick={() =>
												setCurrentTestimonial(index)
											}
											className={`h-3 w-3 rounded-full transition-colors ${
												index === currentTestimonial
													? 'bg-primary'
													: 'bg-primary/20'
											}`}
										/>
									))}
								</div>

								<Button
									variant="outline"
									size="sm"
									onClick={() =>
										setCurrentTestimonial(prev =>
											prev === testimonials.length - 1
												? 0
												: prev + 1
										)
									}
									className="rounded-full"
								>
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
						</div>
					</div>
				</section>

				{/* Enhanced Features Section */}
				<section
					id="features"
					className="relative overflow-hidden py-24"
				>
					<div className="from-background via-secondary/5 to-background absolute inset-0 bg-gradient-to-b"></div>
					<div className="from-primary/5 absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l to-transparent"></div>
					<div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
						<div className="mb-20 text-center">
							<h2 className="text-heading mb-8">
								<span className="from-foreground via-primary to-foreground bg-gradient-to-r bg-clip-text text-transparent">
									Complete Property Management In One Platform
								</span>
							</h2>
							<p className="text-muted-foreground mx-auto max-w-4xl text-xl leading-relaxed">
								Everything you need to manage properties
								efficiently, increase revenue, and provide
								exceptional tenant experiences—all in one
								intuitive platform.
							</p>
						</div>

						<motion.div
							variants={staggerChildren}
							initial="initial"
							whileInView="animate"
							viewport={{ once: true }}
							className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
						>
							<motion.div variants={fadeInUp}>
								<Card className="hover:border-primary/50 group h-full border-2 transition-colors">
									<CardHeader>
										<div className="mb-4 flex items-center gap-3">
											<div className="bg-primary/10 group-hover:bg-primary/20 rounded-lg p-3 transition-colors">
												<Users className="text-primary h-6 w-6" />
											</div>
										</div>
										<CardTitle className="text-xl">
											Smart Tenant Management
										</CardTitle>
										<CardDescription>
											Comprehensive tenant profiles with
											lease tracking, communication
											history, and automated reminders for
											renewals and important dates.
										</CardDescription>
									</CardHeader>
								</Card>
							</motion.div>

							<motion.div variants={fadeInUp}>
								<Card className="hover:border-primary/50 group h-full border-2 transition-colors">
									<CardHeader>
										<div className="mb-4 flex items-center gap-3">
											<div className="bg-primary/10 group-hover:bg-primary/20 rounded-lg p-3 transition-colors">
												<DollarSign className="text-primary h-6 w-6" />
											</div>
										</div>
										<CardTitle className="text-xl">
											Automated Rent Collection
										</CardTitle>
										<CardDescription>
											Track payments in real-time,
											automate late fee calculations, and
											generate detailed financial reports
											for tax season.
										</CardDescription>
									</CardHeader>
								</Card>
							</motion.div>

							<motion.div variants={fadeInUp}>
								<Card className="hover:border-primary/50 group h-full border-2 transition-colors">
									<CardHeader>
										<div className="mb-4 flex items-center gap-3">
											<div className="bg-primary/10 group-hover:bg-primary/20 rounded-lg p-3 transition-colors">
												<FileText className="text-primary h-6 w-6" />
											</div>
										</div>
										<CardTitle className="text-xl">
											Smart Document Center
										</CardTitle>
										<CardDescription>
											State-specific lease templates,
											automatic compliance tracking, and
											secure cloud storage for all
											property documents.
										</CardDescription>
									</CardHeader>
								</Card>
							</motion.div>

							<motion.div variants={fadeInUp}>
								<Card className="hover:border-primary/50 group h-full border-2 transition-colors">
									<CardHeader>
										<div className="mb-4 flex items-center gap-3">
											<div className="bg-primary/10 group-hover:bg-primary/20 rounded-lg p-3 transition-colors">
												<BarChart3 className="text-primary h-6 w-6" />
											</div>
										</div>
										<CardTitle className="text-xl">
											Advanced Analytics
										</CardTitle>
										<CardDescription>
											Performance dashboards, cash flow
											forecasting, and ROI tracking to
											make data-driven decisions about
											your portfolio.
										</CardDescription>
									</CardHeader>
								</Card>
							</motion.div>

							<motion.div variants={fadeInUp}>
								<Card className="hover:border-primary/50 group h-full border-2 transition-colors">
									<CardHeader>
										<div className="mb-4 flex items-center gap-3">
											<div className="bg-primary/10 group-hover:bg-primary/20 rounded-lg p-3 transition-colors">
												<MessageSquare className="text-primary h-6 w-6" />
											</div>
										</div>
										<CardTitle className="text-xl">
											Maintenance Hub
										</CardTitle>
										<CardDescription>
											Streamlined maintenance requests,
											vendor management, and automated
											notifications to keep properties in
											top condition.
										</CardDescription>
									</CardHeader>
								</Card>
							</motion.div>

							<motion.div variants={fadeInUp}>
								<Card className="hover:border-primary/50 group h-full border-2 transition-colors">
									<CardHeader>
										<div className="mb-4 flex items-center gap-3">
											<div className="bg-primary/10 group-hover:bg-primary/20 rounded-lg p-3 transition-colors">
												<Smartphone className="text-primary h-6 w-6" />
											</div>
										</div>
										<CardTitle className="text-xl">
											Mobile-First Design
										</CardTitle>
										<CardDescription>
											Manage properties on-the-go with our
											responsive design. Access everything
											from your phone or tablet, anywhere,
											anytime.
										</CardDescription>
									</CardHeader>
								</Card>
							</motion.div>
						</motion.div>

						<motion.div {...fadeInUp} className="mt-16 text-center">
							<Link to="/lease-generator">
								<Button
									variant="outline"
									size="lg"
									className="hover:bg-primary/10 hover:text-primary hover:border-primary mr-4 px-8 py-6 text-lg transition-all duration-300 hover:scale-105"
								>
									<div className="flex items-center gap-2">
										<FileText className="h-5 w-5" />
										<span>Try Free Lease Generator</span>
									</div>
								</Button>
							</Link>
							<Link to="/pricing">
								<Button
									size="lg"
									className="from-primary to-primary/90 hover:from-primary/90 hover:to-primary bg-gradient-to-r px-8 py-6 text-lg shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
								>
									<div className="flex items-center gap-2">
										<Building className="h-5 w-5" />
										<span>Start Free Trial</span>
									</div>
								</Button>
							</Link>
						</motion.div>
					</div>
				</section>

				{/* Enhanced ROI Calculator Section */}
				<section className="relative overflow-hidden py-24">
					<div className="from-secondary/10 via-background to-secondary/10 absolute inset-0 bg-gradient-to-t"></div>
					<div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
						<div className="mb-20 text-center">
							<h2 className="text-heading mb-8">
								<span className="from-foreground via-primary to-foreground bg-gradient-to-r bg-clip-text text-transparent">
									Calculate Your Time & Money Savings
								</span>
							</h2>
							<p className="text-muted-foreground mx-auto max-w-4xl text-xl leading-relaxed">
								See how much TenantFlow can save you compared to
								manual property management
							</p>
						</div>

						{/* ROI Visual */}
						<div className="mx-auto mb-16 max-w-4xl">
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.6 }}
								className="relative overflow-hidden rounded-2xl shadow-2xl"
							>
								<img
									src="https://images.unsplash.com/photo-1617118602031-1edde7582212?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
									alt="ROI measurement and financial analytics"
									className="h-64 w-full object-cover md:h-80"
								/>
								<div className="from-primary/20 to-primary/10 absolute inset-0 bg-gradient-to-r"></div>
								<div className="absolute inset-0 flex items-center justify-center">
									<div className="text-center text-white">
										<h3 className="mb-2 text-2xl font-bold md:text-3xl">
											Measure Your Success
										</h3>
										<p className="text-lg opacity-90">
											Track ROI and maximize your property
											investments
										</p>
									</div>
								</div>
							</motion.div>
						</div>

						<div className="mx-auto max-w-6xl">
							<div className="grid items-center gap-12 lg:grid-cols-2">
								{/* Calculator Input Side */}
								<motion.div
									initial={{ opacity: 0, x: -50 }}
									whileInView={{ opacity: 1, x: 0 }}
									viewport={{ once: true }}
									transition={{ duration: 0.6 }}
								>
									<Card className="border-2 p-8">
										<CardHeader>
											<CardTitle className="text-2xl">
												Your Current Situation
											</CardTitle>
											<CardDescription>
												Tell us about your property
												portfolio
											</CardDescription>
										</CardHeader>
										<CardContent className="space-y-6">
											<div className="space-y-4">
												<div className="grid grid-cols-2 gap-4">
													<div>
														<label className="mb-2 block text-sm font-medium">
															Number of Properties
														</label>
														<div className="text-primary text-3xl font-bold">
															5
														</div>
													</div>
													<div>
														<label className="mb-2 block text-sm font-medium">
															Hours Spent Weekly
														</label>
														<div className="text-primary text-3xl font-bold">
															12
														</div>
													</div>
												</div>

												<div className="border-t pt-4">
													<div className="grid grid-cols-2 gap-4 text-center">
														<div className="bg-error rounded-lg p-4">
															<div className="text-destructive text-2xl font-bold">
																$2,400
															</div>
															<div className="text-destructive text-sm">
																Monthly time
																cost
															</div>
															<div className="text-muted-foreground text-xs">
																at $50/hour
															</div>
														</div>
														<div className="bg-error rounded-lg p-4">
															<div className="text-destructive text-2xl font-bold">
																$28,800
															</div>
															<div className="text-destructive text-sm">
																Annual time cost
															</div>
															<div className="text-muted-foreground text-xs">
																not including
																stress
															</div>
														</div>
													</div>
												</div>
											</div>
										</CardContent>
									</Card>
								</motion.div>

								{/* Results Side */}
								<motion.div
									initial={{ opacity: 0, x: 50 }}
									whileInView={{ opacity: 1, x: 0 }}
									viewport={{ once: true }}
									transition={{ duration: 0.6, delay: 0.2 }}
								>
									<Card className="border-success bg-success/50 border-2 p-8">
										<CardHeader>
											<CardTitle className="text-success-foreground text-2xl">
												With TenantFlow
											</CardTitle>
											<CardDescription className="text-success">
												Your projected savings
											</CardDescription>
										</CardHeader>
										<CardContent className="space-y-6">
											<div className="space-y-4">
												<div className="grid grid-cols-2 gap-4">
													<div className="text-center">
														<div className="text-success mb-2 text-4xl font-bold">
															85%
														</div>
														<div className="text-success-foreground text-sm">
															Time Savings
														</div>
														<div className="text-muted-foreground text-xs">
															10+ hours saved
															weekly
														</div>
													</div>
													<div className="text-center">
														<div className="text-success mb-2 text-4xl font-bold">
															$199
														</div>
														<div className="text-success-foreground text-sm">
															TenantFlow Cost
														</div>
														<div className="text-muted-foreground text-xs">
															per month
														</div>
													</div>
												</div>

												<div className="border-success border-t pt-4">
													<div className="bg-success/80 rounded-lg p-6 text-center">
														<div className="text-success-foreground mb-2 text-4xl font-bold">
															$2,201
														</div>
														<div className="text-success-foreground text-lg font-semibold">
															Net Monthly Savings
														</div>
														<div className="text-success text-sm">
															$26,412 saved
															annually
														</div>
													</div>

													<div className="mt-4 text-center">
														<div className="text-success-foreground text-2xl font-bold">
															ROI: 1,106%
														</div>
														<div className="text-muted-foreground text-sm">
															TenantFlow pays for
															itself in 4 days
														</div>
													</div>
												</div>
											</div>
										</CardContent>
									</Card>
								</motion.div>
							</div>

							<motion.div
								{...fadeInUp}
								className="mt-12 text-center"
							>
								<Link to="/pricing">
									<Button
										size="lg"
										className="from-primary to-primary/90 hover:from-primary/90 hover:to-primary bg-gradient-to-r px-12 py-6 text-lg shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
									>
										<div className="flex items-center gap-2">
											<span>
												Start Saving Today - 14 Day Free
												Trial
											</span>
											<ArrowRight className="h-5 w-5" />
										</div>
									</Button>
								</Link>
								<p className="text-muted-foreground mt-4 text-sm">
									* Calculations based on average customer
									data. Individual results may vary.
								</p>
							</motion.div>
						</div>
					</div>
				</section>

				{/* Enhanced Final CTA Section */}
				<section className="from-primary/10 via-primary/5 to-background relative overflow-hidden bg-gradient-to-br py-24">
					<div className="bg-grid-pattern absolute inset-0 opacity-5"></div>
					<div className="relative container mx-auto px-4 text-center sm:px-6 lg:px-8">
						<div className="mx-auto max-w-6xl">
							<h2 className="text-heading mb-8">
								<span className="from-foreground via-primary to-foreground bg-gradient-to-r bg-clip-text text-transparent">
									Ready to 10x Your Efficiency?
								</span>
							</h2>

							<p className="text-muted-foreground mx-auto mb-12 max-w-4xl text-xl leading-relaxed">
								Join 10,000+ successful landlords who've
								transformed their property management. Start
								your free trial today and see results in your
								first week.
							</p>

							{/* Trust Signals */}
							<div className="text-muted-foreground mb-12 flex flex-wrap items-center justify-center gap-8 text-sm">
								<div className="flex items-center gap-2">
									<CheckCircle className="text-success h-5 w-5" />
									<span>No credit card required</span>
								</div>
								<div className="flex items-center gap-2">
									<CheckCircle className="text-success h-5 w-5" />
									<span>14-day free trial</span>
								</div>
								<div className="flex items-center gap-2">
									<CheckCircle className="text-success h-5 w-5" />
									<span>Cancel anytime</span>
								</div>
								<div className="flex items-center gap-2">
									<CheckCircle className="text-success h-5 w-5" />
									<span>30-day money-back guarantee</span>
								</div>
							</div>

							<div className="mb-12 flex flex-col justify-center gap-6 sm:flex-row">
								<Link to="/pricing">
									<Button
										size="lg"
										className="hover:shadow-3xl from-primary to-primary/90 hover:from-primary/90 hover:to-primary transform bg-gradient-to-r px-16 py-8 text-xl shadow-2xl transition-all duration-300 hover:scale-105"
									>
										<div className="flex items-center gap-3">
											<Building className="h-6 w-6" />
											<span>
												Start Your Transformation
											</span>
											<ArrowRight className="h-6 w-6" />
										</div>
									</Button>
								</Link>
								<Button
									variant="outline"
									size="lg"
									className="hover:bg-primary/10 hover:text-primary hover:border-primary border-2 px-12 py-8 text-xl transition-all duration-300 hover:scale-105"
									onClick={() => {
										// Scroll to features section
										const featuresSection =
											document.getElementById('features')
										if (featuresSection) {
											featuresSection.scrollIntoView({
												behavior: 'smooth'
											})
										}
									}}
								>
									<div className="flex items-center gap-3">
										<Building className="h-6 w-6" />
										<span>Explore Platform</span>
									</div>
								</Button>
							</div>

							{/* Final Stats */}
							<div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
								<div className="text-center">
									<div className="text-primary mb-2 text-3xl font-bold">
										15+
									</div>
									<div className="text-muted-foreground text-sm">
										Hours saved weekly
									</div>
								</div>
								<div className="text-center">
									<div className="text-primary mb-2 text-3xl font-bold">
										23%
									</div>
									<div className="text-muted-foreground text-sm">
										Average revenue increase
									</div>
								</div>
								<div className="text-center">
									<div className="text-primary mb-2 text-3xl font-bold">
										&lt; 1 Week
									</div>
									<div className="text-muted-foreground text-sm">
										To see results
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* Blog Preview Section */}
				<section className="bg-card/30 px-4 py-20">
					<div className="container mx-auto">
						<motion.div {...fadeInUp} className="mb-16 text-center">
							<h2 className="mb-6 text-3xl font-bold md:text-4xl">
								Stay Ahead with Expert
								<span className="text-primary">
									{' '}
									Property Management
								</span>{' '}
								Insights
							</h2>
							<p className="text-muted-foreground mx-auto mb-8 max-w-3xl text-xl">
								Get actionable tips, industry trends, and proven
								strategies from property management experts.
								Learn how to maximize your rental income and
								streamline operations.
							</p>
							<Link to="/blog">
								<Button
									size="lg"
									className="from-primary to-primary/90 hover:from-primary/90 hover:to-primary mb-8 bg-gradient-to-r shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
								>
									<div className="flex items-center gap-2">
										<BookOpen className="h-5 w-5" />
										<span>Explore All Articles</span>
										<ArrowRight className="h-5 w-5" />
									</div>
								</Button>
							</Link>
						</motion.div>

						{/* Featured Blog Articles Preview */}
						<motion.div
							variants={staggerChildren}
							initial="initial"
							whileInView="animate"
							viewport={{ once: true }}
							className="grid gap-8 md:grid-cols-3"
						>
							<motion.div variants={fadeInUp}>
								<Card className="h-full transition-shadow hover:shadow-lg">
									<CardHeader>
										<CardTitle className="line-clamp-2 text-lg">
											Best Lease Agreement Generators for
											Landlords in 2025
										</CardTitle>
										<CardDescription className="line-clamp-3">
											Compare the top lease agreement
											generators and learn how to create
											legally compliant leases that
											protect your investment...
										</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="flex items-center justify-between">
											<span className="text-muted-foreground text-sm">
												5 min read
											</span>
											<Link
												to="/blog"
												className="text-primary text-sm font-medium hover:underline"
											>
												Read More →
											</Link>
										</div>
									</CardContent>
								</Card>
							</motion.div>

							<motion.div variants={fadeInUp}>
								<Card className="h-full transition-shadow hover:shadow-lg">
									<CardHeader>
										<CardTitle className="line-clamp-2 text-lg">
											Ultimate Tenant Screening Checklist
											for 2025
										</CardTitle>
										<CardDescription className="line-clamp-3">
											Avoid problem tenants with our
											comprehensive screening process.
											Download our free checklist and
											protect your rental income...
										</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="flex items-center justify-between">
											<span className="text-muted-foreground text-sm">
												8 min read
											</span>
											<Link
												to="/blog"
												className="text-primary text-sm font-medium hover:underline"
											>
												Read More →
											</Link>
										</div>
									</CardContent>
								</Card>
							</motion.div>

							<motion.div variants={fadeInUp}>
								<Card className="h-full transition-shadow hover:shadow-lg">
									<CardHeader>
										<CardTitle className="line-clamp-2 text-lg">
											How to Set Up Automated Rent
											Collection (Step-by-Step)
										</CardTitle>
										<CardDescription className="line-clamp-3">
											Eliminate late payments and reduce
											admin work with automated rent
											collection. Our complete guide shows
											you exactly how...
										</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="flex items-center justify-between">
											<span className="text-muted-foreground text-sm">
												12 min read
											</span>
											<Link
												to="/blog"
												className="text-primary text-sm font-medium hover:underline"
											>
												Read More →
											</Link>
										</div>
									</CardContent>
								</Card>
							</motion.div>
						</motion.div>

						{/* Blog Stats */}
						<motion.div {...fadeInUp} className="mt-16 text-center">
							<div className="mx-auto grid max-w-2xl grid-cols-3 gap-8">
								<div className="text-center">
									<div className="text-primary mb-2 text-2xl font-bold">
										50+
									</div>
									<div className="text-muted-foreground text-sm">
										Expert Articles
									</div>
								</div>
								<div className="text-center">
									<div className="text-primary mb-2 text-2xl font-bold">
										25k+
									</div>
									<div className="text-muted-foreground text-sm">
										Monthly Readers
									</div>
								</div>
								<div className="text-center">
									<div className="text-primary mb-2 text-2xl font-bold">
										Weekly
									</div>
									<div className="text-muted-foreground text-sm">
										New Content
									</div>
								</div>
							</div>
						</motion.div>
					</div>
				</section>

				{/* Minimal Footer */}
				<footer className="bg-card border-t px-4 py-12">
					<div className="container mx-auto">
						<div className="flex flex-col items-center justify-between gap-6 md:flex-row">
							{/* Brand */}
							<div className="flex items-center space-x-2">
								<Building className="text-primary h-6 w-6" />
								<span className="text-lg font-bold">
									TenantFlow
								</span>
							</div>

							{/* Main Links */}
							<div className="flex items-center gap-6 text-sm">
								<Link
									to="/pricing"
									className="text-muted-foreground hover:text-foreground transition-colors"
								>
									Pricing
								</Link>
								<Link
									to="/privacy"
									className="text-muted-foreground hover:text-foreground transition-colors"
								>
									Privacy Policy
								</Link>
								<a
									href="mailto:support@tenantflow.app"
									className="text-muted-foreground hover:text-foreground transition-colors"
								>
									Support
								</a>
							</div>

							{/* Social & Copyright */}
							<div className="flex items-center gap-4">
								<a
									href="https://facebook.com/tenantflowapp"
									target="_blank"
									rel="noopener noreferrer"
									className="text-muted-foreground hover:text-primary transition-colors"
									aria-label="Follow us on Facebook"
								>
									<Facebook className="h-5 w-5" />
								</a>
								<div className="text-muted-foreground text-sm">
									© 2025 TenantFlow
								</div>
							</div>
						</div>
					</div>
				</footer>
			</div>
		</>
	)
}
