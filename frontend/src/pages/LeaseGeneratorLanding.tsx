import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
	FileText,
	Download,
	CheckCircle,
	Star,
	Clock,
	Shield,
	ArrowRight,
	Building,
	DollarSign,
	Users
} from 'lucide-react'
import { Link } from 'react-router-dom'
import StateLeaseLinks from '@/components/lease-generator/StateLeaseLinks'

export default function LeaseGeneratorLanding() {
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

	return (
		<div className="from-background via-background to-primary/5 min-h-screen bg-gradient-to-br">
			{/* Navigation */}
			<nav className="bg-card/50 sticky top-0 z-40 border-b backdrop-blur-sm">
				<div className="container mx-auto px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
					<div className="flex items-center justify-between">
						<Link to="/" className="flex items-center space-x-2">
							<Building className="text-primary h-8 w-8" />
							<span className="text-xl font-bold">
								TenantFlow
							</span>
						</Link>
						<div className="flex items-center space-x-2 sm:space-x-4">
							<Link to="/" className="hidden sm:block">
								<Button variant="ghost">Home</Button>
							</Link>
							<Link to="/pricing" className="hidden sm:block">
								<Button variant="ghost">Pricing</Button>
							</Link>
							<Link to="/auth/login">
								<Button
									variant="ghost"
									size="sm"
									className="sm:size-default"
								>
									Sign In
								</Button>
							</Link>
							<Link to="/pricing">
								<Button size="sm" className="sm:size-default">
									Get Started
								</Button>
							</Link>
						</div>
					</div>
				</div>
			</nav>

			{/* Hero Section */}
			<section className="px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8">
				<div className="container mx-auto text-center">
					<motion.div {...fadeInUp}>
						<Badge variant="secondary" className="mb-4">
							<Star className="mr-1 h-4 w-4" />
							100% Free • No Signup Required
						</Badge>
						<h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl">
							Professional Lease
							<br />
							<span className="text-primary">Generator</span>
						</h1>
						<p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-xl">
							Create legally-compliant residential lease
							agreements in minutes. Professional templates,
							instant download, completely free.
						</p>
						<div className="mb-8 flex flex-col justify-center gap-4 sm:flex-row">
							<Link to="/lease-generator/create">
								<Button size="lg" className="px-8 text-lg">
									<FileText className="mr-2 h-5 w-5" />
									Generate Free Lease Now
								</Button>
							</Link>
							<Link to="/pricing">
								<Button
									variant="outline"
									size="lg"
									className="px-8 text-lg"
								>
									<Building className="mr-2 h-5 w-5" />
									Full Property Management
								</Button>
							</Link>
						</div>
						<p className="text-muted-foreground text-sm">
							First lease completely free • PDF & Word formats •
							Legally compliant templates
						</p>
					</motion.div>
				</div>
			</section>

			{/* How It Works Section */}
			<section className="bg-primary/5 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
				<div className="container mx-auto">
					<motion.div {...fadeInUp} className="mb-12 text-center">
						<h2 className="mb-4 text-3xl font-bold md:text-4xl">
							Generate Your Lease in 3 Simple Steps
						</h2>
						<p className="text-muted-foreground text-xl">
							No legal knowledge required • Professional results
							guaranteed
						</p>
					</motion.div>

					<motion.div
						variants={staggerChildren}
						initial="initial"
						whileInView="animate"
						viewport={{ once: true }}
						className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 md:grid-cols-3"
					>
						<motion.div variants={fadeInUp} className="text-center">
							<div className="bg-primary/10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full">
								<FileText className="text-primary h-8 w-8" />
							</div>
							<h3 className="mb-3 text-xl font-semibold">
								1. Fill Out Form
							</h3>
							<p className="text-muted-foreground">
								Enter property details, tenant information, and
								lease terms using our guided form
							</p>
						</motion.div>

						<motion.div variants={fadeInUp} className="text-center">
							<div className="bg-primary/10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full">
								<Shield className="text-primary h-8 w-8" />
							</div>
							<h3 className="mb-3 text-xl font-semibold">
								2. Review & Customize
							</h3>
							<p className="text-muted-foreground">
								Preview your lease with standard legal clauses
								and make any necessary adjustments
							</p>
						</motion.div>

						<motion.div variants={fadeInUp} className="text-center">
							<div className="bg-primary/10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full">
								<Download className="text-primary h-8 w-8" />
							</div>
							<h3 className="mb-3 text-xl font-semibold">
								3. Download & Sign
							</h3>
							<p className="text-muted-foreground">
								Instantly download your professional lease in
								PDF or Word format, ready for signing
							</p>
						</motion.div>
					</motion.div>

					<motion.div {...fadeInUp} className="text-center">
						<Link to="/lease-generator/create">
							<Button size="lg" className="px-12 text-lg">
								Start Creating Your Lease
								<ArrowRight className="ml-2 h-5 w-5" />
							</Button>
						</Link>
					</motion.div>
				</div>
			</section>

			{/* Features Section */}
			<section className="px-4 py-16">
				<div className="container mx-auto">
					<motion.div {...fadeInUp} className="mb-12 text-center">
						<h2 className="mb-4 text-3xl font-bold md:text-4xl">
							Professional Lease Templates
						</h2>
						<p className="text-muted-foreground text-xl">
							Built by legal experts, trusted by thousands of
							landlords
						</p>
					</motion.div>

					<motion.div
						variants={staggerChildren}
						initial="initial"
						whileInView="animate"
						viewport={{ once: true }}
						className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4"
					>
						<motion.div variants={fadeInUp}>
							<Card className="h-full text-center">
								<CardHeader>
									<Shield className="text-primary mx-auto mb-2 h-8 w-8" />
									<CardTitle>Legally Compliant</CardTitle>
									<CardDescription>
										Standard clauses and legal protections
										included automatically
									</CardDescription>
								</CardHeader>
							</Card>
						</motion.div>

						<motion.div variants={fadeInUp}>
							<Card className="h-full text-center">
								<CardHeader>
									<Clock className="text-primary mx-auto mb-2 h-8 w-8" />
									<CardTitle>5-Minute Setup</CardTitle>
									<CardDescription>
										Quick guided form gets you a complete
										lease in minutes
									</CardDescription>
								</CardHeader>
							</Card>
						</motion.div>

						<motion.div variants={fadeInUp}>
							<Card className="h-full text-center">
								<CardHeader>
									<Download className="text-primary mx-auto mb-2 h-8 w-8" />
									<CardTitle>Multiple Formats</CardTitle>
									<CardDescription>
										Download as PDF for signing or Word for
										customization
									</CardDescription>
								</CardHeader>
							</Card>
						</motion.div>

						<motion.div variants={fadeInUp}>
							<Card className="h-full text-center">
								<CardHeader>
									<DollarSign className="text-primary mx-auto mb-2 h-8 w-8" />
									<CardTitle>Completely Free</CardTitle>
									<CardDescription>
										First lease is free, no hidden fees or
										signup required
									</CardDescription>
								</CardHeader>
							</Card>
						</motion.div>
					</motion.div>
				</div>
			</section>

			{/* Testimonials/Social Proof */}
			<section className="bg-primary/5 px-4 py-16">
				<div className="container mx-auto">
					<motion.div {...fadeInUp} className="mb-12 text-center">
						<h2 className="mb-4 text-3xl font-bold md:text-4xl">
							Trusted by Property Owners
						</h2>
						<div className="text-muted-foreground flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
							<div className="flex items-center gap-2">
								<Users className="text-primary h-5 w-5" />
								<span>10,000+ Leases Generated</span>
							</div>
							<div className="flex items-center gap-2">
								<Star className="text-primary h-5 w-5" />
								<span>4.9/5 Rating</span>
							</div>
							<div className="flex items-center gap-2">
								<CheckCircle className="text-primary h-5 w-5" />
								<span>Legal Expert Approved</span>
							</div>
						</div>
					</motion.div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="px-4 py-20">
				<div className="container mx-auto text-center">
					<motion.div {...fadeInUp}>
						<h2 className="mb-4 text-3xl font-bold md:text-4xl">
							Ready to Create Your Professional Lease?
						</h2>
						<p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-xl">
							Join thousands of landlords who've created
							professional lease agreements with our free
							generator.
						</p>
						<div className="mb-8 flex flex-col justify-center gap-4 sm:flex-row">
							<Link to="/lease-generator/create">
								<Button size="lg" className="px-8 text-lg">
									Generate Free Lease
									<FileText className="ml-2 h-5 w-5" />
								</Button>
							</Link>
							<Link to="/pricing">
								<Button
									variant="outline"
									size="lg"
									className="px-8 text-lg"
								>
									Full Property Management Platform
									<ArrowRight className="ml-2 h-5 w-5" />
								</Button>
							</Link>
						</div>
						<p className="text-muted-foreground text-sm">
							Need to manage multiple properties? Check out our
							full platform with tenant management, payment
							tracking, and more.
						</p>
					</motion.div>
				</div>
			</section>

			{/* State-Specific Lease Generators */}
			<section className="px-4 py-16">
				<div className="container mx-auto">
					<motion.div {...fadeInUp}>
						<StateLeaseLinks />
					</motion.div>
				</div>
			</section>
		</div>
	)
}
