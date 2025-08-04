import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { 
  Building2, 
  Users, 
  Wrench, 
  TrendingUp, 
  Shield,
  Zap,
  Award,
  ArrowRight,
  Star
} from 'lucide-react'
import { Navigation } from '@/components/layout/Navigation'

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 }
}

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3
    }
  }
}

const glowAnimation: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: 0.8,
      ease: "easeOut" as const
    }
  }
}

export const Route = createFileRoute('/')({
	component: () => {
		return (
			<div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] text-white overflow-hidden">
				{/* Navigation */}
				<Navigation context="public" transparent={true} />

				{/* Background Elements */}
				<div className="absolute inset-0">
					<div className="absolute top-20 left-20 w-72 h-72 bg-[#60a5fa]/10 rounded-full blur-3xl" />
					<div className="absolute bottom-32 right-16 w-96 h-96 bg-[#34d399]/8 rounded-full blur-3xl" />
					<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#fbbf24]/5 rounded-full blur-3xl" />
				</div>

				{/* Hero Section */}
				<motion.div 
					className="relative z-10 min-h-screen flex items-center justify-start px-8 pt-32 lg:px-16"
					initial="hidden"
					animate="visible"
					variants={staggerContainer}
				>
					{/* Quick CTA in top right */}
					<motion.div 
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ delay: 0.8, duration: 0.6 }}
						className="absolute top-32 right-8 lg:right-16 hidden md:block"
					>
						<Link to="/auth/Signup">
							<motion.button
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								className="group inline-flex items-center gap-3 bg-gradient-to-r from-[#60a5fa] to-[#3b82f6] px-8 py-4 rounded-full font-semibold text-lg text-white shadow-lg hover:shadow-xl transition-all duration-300"
							>
								<span>Get Started Free</span>
								<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
							</motion.button>
						</Link>
					</motion.div>

					<div className="max-w-7xl w-full text-left">
						{/* Main Headline */}
						<motion.h1 
							variants={fadeInUp}
							className="text-7xl md:text-9xl lg:text-[12rem] font-bold mb-10 leading-tight max-w-5xl"
						>
							<span className="bg-gradient-to-r from-[#60a5fa] via-[#34d399] to-[#fbbf24] bg-clip-text text-transparent">
								Simplify.
							</span>
							<br />
							<span className="text-white">Property Management.</span>
						</motion.h1>

						{/* Subtitle */}
						<motion.p 
							variants={fadeInUp}
							className="text-3xl md:text-4xl text-white/80 mb-16 max-w-4xl leading-relaxed"
						>
							Transform your property management with professional-grade tools designed for 
							modern property owners who demand excellence.
						</motion.p>

						{/* CTA Buttons */}
						<motion.div 
							variants={fadeInUp}
							className="flex flex-col sm:flex-row gap-8 mb-24"
						>
							<Link to="/auth/Signup">
								<motion.button
									whileHover={{ scale: 1.05, y: -2 }}
									whileTap={{ scale: 0.95 }}
									className="group relative bg-gradient-to-r from-[#60a5fa] to-[#3b82f6] px-16 py-6 rounded-2xl font-bold text-2xl overflow-hidden shadow-lg shadow-[#60a5fa]/25 hover:shadow-xl hover:shadow-[#60a5fa]/40 transition-all duration-300"
								>
									<div className="absolute inset-0 bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
									<span className="relative flex items-center">
										Get Started Free
										<ArrowRight className="w-7 h-7 ml-4 group-hover:translate-x-1 transition-transform duration-300" />
									</span>
								</motion.button>
							</Link>
							
							<Link to="/pricing">
								<motion.button
									whileHover={{ scale: 1.05, y: -2 }}
									whileTap={{ scale: 0.95 }}
									className="group border-2 border-white/30 hover:border-white/50 px-16 py-6 rounded-2xl font-bold text-2xl backdrop-blur-sm hover:bg-white/5 transition-all duration-300"
								>
									<span className="flex items-center">
										View Pricing
										<Zap className="w-7 h-7 ml-4 group-hover:text-[#fbbf24] transition-colors duration-300" />
									</span>
								</motion.button>
							</Link>
						</motion.div>

						{/* Feature Grid */}
						<motion.div 
							variants={staggerContainer}
							className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 max-w-7xl"
						>
							{[
								{
									icon: Building2,
									title: "Property Portfolio",
									description: "Manage multiple properties with comprehensive oversight",
									color: "from-[#60a5fa] to-[#3b82f6]"
								},
								{
									icon: Users,
									title: "Tenant Management",
									description: "Streamlined tenant onboarding and relationship management",
									color: "from-[#34d399] to-[#059669]"
								},
								{
									icon: Wrench,
									title: "Maintenance Tracking",
									description: "Efficient maintenance request and work order management",
									color: "from-[#fbbf24] to-[#f59e0b]"
								},
								{
									icon: TrendingUp,
									title: "Analytics & Reports",
									description: "Data-driven insights for optimized property performance",
									color: "from-[#a78bfa] to-[#7c3aed]"
								}
							].map((feature) => (
								<motion.div
									key={feature.title}
									variants={glowAnimation}
									whileHover={{ y: -12, scale: 1.08 }}
									className="group relative bg-white/5 backdrop-blur-sm rounded-3xl p-10 border border-white/10 hover:border-white/20 transition-all duration-300"
								>
									<div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${feature.color} p-5 mb-8 group-hover:scale-110 transition-transform duration-300`}>
										<feature.icon className="w-10 h-10 text-white" />
									</div>
									<h3 className="text-2xl font-bold mb-4 text-white group-hover:text-[#60a5fa] transition-colors duration-300">
										{feature.title}
									</h3>
									<p className="text-lg text-white/70 group-hover:text-white/90 transition-colors duration-300 leading-relaxed">
										{feature.description}
									</p>
								</motion.div>
							))}
						</motion.div>
					</div>
				</motion.div>

				{/* Value Proposition Section */}
				<motion.div 
					initial={{ opacity: 0, y: 50 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8 }}
					viewport={{ once: true }}
					className="relative z-10 py-32 px-4 flex justify-center"
				>
					<div className="max-w-7xl w-full">
						<div className="text-center mb-24">
							<h2 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-10">
								Everything You Need to{' '}
								<span className="bg-gradient-to-r from-[#60a5fa] to-[#34d399] bg-clip-text text-transparent">
									Manage Properties
								</span>
							</h2>
							<p className="text-3xl md:text-4xl text-white/80 max-w-5xl mx-auto leading-relaxed">
								From tenant management to maintenance tracking, we've built the complete toolkit 
								for modern property management professionals.
							</p>
						</div>

						{/* Benefits Grid */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-12">
							{[
								{
									icon: Shield,
									title: "Enterprise Security",
									description: "Bank-grade security with multi-tenant data isolation and compliance"
								},
								{
									icon: Zap,
									title: "Lightning Fast",
									description: "Optimized performance with edge caching and real-time updates"
								},
								{
									icon: Award,
									title: "Professional Grade",
									description: "Built for property managers who demand institutional-quality tools"
								}
							].map((benefit, index) => (
								<motion.div
									key={benefit.title}
									initial={{ opacity: 0, y: 30 }}
									whileInView={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.6, delay: index * 0.2 }}
									viewport={{ once: true }}
									className="bg-white/5 backdrop-blur-sm rounded-3xl p-12 border border-white/10 hover:border-white/20 transition-all duration-300 group"
								>
									<div className="w-24 h-24 bg-gradient-to-br from-[#60a5fa]/20 to-[#34d399]/20 rounded-3xl flex items-center justify-center mb-10 group-hover:scale-110 transition-transform duration-300">
										<benefit.icon className="w-12 h-12 text-[#60a5fa]" />
									</div>
									<h3 className="text-3xl font-bold mb-6 text-white">
										{benefit.title}
									</h3>
									<p className="text-xl text-white/70 leading-relaxed">
										{benefit.description}
									</p>
								</motion.div>
							))}
						</div>
					</div>
				</motion.div>

				{/* Social Proof Section */}
				<motion.div 
					initial={{ opacity: 0 }}
					whileInView={{ opacity: 1 }}
					transition={{ duration: 0.8 }}
					viewport={{ once: true }}
					className="relative z-10 py-24 px-4 flex justify-center"
				>
					<div className="max-w-5xl w-full text-center">
						<div className="flex items-center justify-center gap-3 mb-8">
							{[...Array(5)].map((_, i) => (
								<Star key={i} className="w-10 h-10 fill-[#fbbf24] text-[#fbbf24]" />
							))}
						</div>
						<p className="text-3xl md:text-4xl text-white/80 mb-12 max-w-5xl mx-auto leading-relaxed">
							"TenantFlow has transformed how we manage our 50+ property portfolio. 
							The professional-grade tools and intuitive interface make complex 
							property management feel effortless."
						</p>
						<div className="flex items-center justify-center gap-6">
							<div className="w-20 h-20 bg-gradient-to-br from-[#60a5fa] to-[#34d399] rounded-full flex items-center justify-center">
								<span className="text-white font-bold text-2xl">SM</span>
							</div>
							<div className="text-left">
								<p className="font-bold text-white text-2xl">Sarah Mitchell</p>
								<p className="text-xl text-white/60">Property Portfolio Manager</p>
							</div>
						</div>
					</div>
				</motion.div>
			</div>
		)
	}
})
