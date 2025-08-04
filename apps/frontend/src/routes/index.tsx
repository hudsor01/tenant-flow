import { createFileRoute, Link } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { useState, useEffect } from 'react'
import { 
  Building2, 
  Users, 
  Wrench, 
  TrendingUp, 
  Shield,
  Zap,
  Award,
  ArrowRight,
  CheckCircle,
  Star,
  FileText,
  Download,
  Lock,
  Eye,
  Clock,
  Phone,
  Check,
  X,
  Plus,
  HelpCircle
} from 'lucide-react'
import { Navigation } from '@/components/layout/Navigation'
import { Button } from '@/components/ui/button'

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

// FAQ Item Component
interface FAQItemProps {
  question: string
  answer: string
  index: number
}

function FAQItem({ question, answer, index }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 overflow-hidden"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-8 py-6 text-left flex items-center justify-between group hover:bg-white/5 transition-all duration-300"
      >
        <h3 className="text-xl font-semibold text-white group-hover:text-[#60a5fa] transition-colors duration-300 pr-4">
          {question}
        </h3>
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.3 }}
          className="flex-shrink-0"
        >
          <Plus className="w-6 h-6 text-[#60a5fa] group-hover:text-[#34d399] transition-colors duration-300" />
        </motion.div>
      </button>
      
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-8 pb-6 border-t border-white/10">
              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                className="text-lg text-white/80 leading-relaxed pt-4"
              >
                {answer}
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function HomePage() {
	const [showFloatingCTA, setShowFloatingCTA] = useState(false)

		// Show floating CTA after scrolling past hero section
		useEffect(() => {
			const handleScroll = () => {
				const scrollPosition = window.scrollY
				const heroHeight = window.innerHeight
				setShowFloatingCTA(scrollPosition > heroHeight * 0.8)
			}

			window.addEventListener('scroll', handleScroll)
			return () => window.removeEventListener('scroll', handleScroll)
		}, [])

		return (
			<div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] text-white overflow-hidden">
				{/* Floating CTA */}
				<AnimatePresence>
					{showFloatingCTA && (
						<motion.div
							initial={{ opacity: 0, y: 100, scale: 0.8 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: 100, scale: 0.8 }}
							transition={{ type: "spring", damping: 20, stiffness: 300 }}
							className="fixed bottom-6 right-6 z-50 max-w-sm"
						>
							<div className="bg-gradient-to-r from-[#60a5fa] to-[#34d399] backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-2xl">
								<div className="flex items-center gap-4">
									<div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
										<Star className="w-6 h-6 text-white" />
									</div>
									<div className="flex-1">
										<h4 className="font-bold text-white text-lg">Ready to get started?</h4>
										<p className="text-white/80 text-sm">Join 50+ early adopters</p>
									</div>
								</div>
								<div className="mt-4 flex gap-3">
									<Link to="/auth/Signup" className="flex-1">
										<Button className="w-full bg-white text-[#60a5fa] hover:bg-white/90 font-semibold py-2 text-sm rounded-lg">
											Start Free
										</Button>
									</Link>
									<button
										onClick={() => setShowFloatingCTA(false)}
										className="px-3 py-2 text-white/60 hover:text-white transition-colors"
									>
										<X className="w-4 h-4" />
									</button>
								</div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>

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

					<div className="max-w-7xl w-full text-left">

						{/* Main Headline */}
						<motion.h1 
							variants={fadeInUp}
							className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 leading-tight max-w-5xl"
						>
							<span className="text-white">Stop Losing Rent to</span>
							<br />
							<span className="bg-gradient-to-r from-[#60a5fa] via-[#34d399] to-[#fbbf24] bg-clip-text text-transparent">
								Vacancies & Late Payments
							</span>
						</motion.h1>

						{/* Subtitle */}
						<motion.p 
							variants={fadeInUp}
							className="text-2xl md:text-3xl text-white/80 mb-8 max-w-4xl leading-relaxed"
						>
							Professional property management software that helps you fill units 40% faster 
							and automate rent collection. Built for landlords who value their time.
						</motion.p>

						{/* Value Props */}
						<motion.div 
							variants={fadeInUp}
							className="flex flex-wrap gap-4 mb-12 text-lg"
						>
							<div className="flex items-center gap-2 text-white/90">
								<CheckCircle className="w-5 h-5 text-[#34d399]" />
								<span>Fill vacancies faster</span>
							</div>
							<div className="flex items-center gap-2 text-white/90">
								<CheckCircle className="w-5 h-5 text-[#34d399]" />
								<span>Automate rent collection</span>
							</div>
							<div className="flex items-center gap-2 text-white/90">
								<CheckCircle className="w-5 h-5 text-[#34d399]" />
								<span>Handle maintenance in minutes</span>
							</div>
						</motion.div>

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

						{/* Concrete Benefits Grid */}
						<motion.div 
							variants={staggerContainer}
							className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 max-w-7xl"
						>
							{[
								{
									icon: Building2,
									title: "Fill Vacancies 40% Faster",
									description: "Professional listings, tenant screening, and automated showings reduce empty unit time",
									metric: "Save $2,400/unit",
									color: "from-[#60a5fa] to-[#3b82f6]"
								},
								{
									icon: Users,
									title: "Never Chase Rent Again",
									description: "Automated rent collection, payment reminders, and late fee enforcement",
									metric: "98% on-time rate",
									color: "from-[#34d399] to-[#059669]"
								},
								{
									icon: Wrench,
									title: "Handle Repairs in Minutes",
									description: "Tenants submit requests with photos, you assign vendors with one click",
									metric: "3hr avg response",
									color: "from-[#fbbf24] to-[#f59e0b]"
								},
								{
									icon: TrendingUp,
									title: "Know Your Numbers",
									description: "Real-time P&L, expense tracking, and tax-ready reports at your fingertips",
									metric: "Save 10hrs/month",
									color: "from-[#a78bfa] to-[#7c3aed]"
								}
							].map((benefit) => (
								<motion.div
									key={benefit.title}
									variants={glowAnimation}
									whileHover={{ y: -12, scale: 1.08 }}
									className="group relative bg-white/5 backdrop-blur-sm rounded-3xl p-10 border border-white/10 hover:border-white/20 transition-all duration-300"
								>
									<div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${benefit.color} p-5 mb-8 group-hover:scale-110 transition-transform duration-300`}>
										<benefit.icon className="w-10 h-10 text-white" />
									</div>
									<h3 className="text-2xl font-bold mb-4 text-white group-hover:text-[#60a5fa] transition-colors duration-300">
										{benefit.title}
									</h3>
									<p className="text-lg text-white/70 group-hover:text-white/90 transition-colors duration-300 leading-relaxed mb-4">
										{benefit.description}
									</p>
									<div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full">
										<Star className="w-4 h-4 text-[#fbbf24]" />
										<span className="text-sm font-semibold text-white">{benefit.metric}</span>
									</div>
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
						<div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
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

						{/* Mid-Section CTA */}
						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							whileInView={{ opacity: 1, scale: 1 }}
							transition={{ duration: 0.6 }}
							viewport={{ once: true }}
							className="text-center bg-gradient-to-r from-[#60a5fa]/20 to-[#34d399]/20 backdrop-blur-sm rounded-3xl p-12 border border-[#60a5fa]/30"
						>
							<h3 className="text-4xl font-bold text-white mb-6">
								Ready to Transform Your Property Management?
							</h3>
							<p className="text-xl text-white/80 mb-8 max-w-3xl mx-auto">
								Join the early access program and get 50% off for life, plus direct access to our development team.
							</p>
							<div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
								<Link to="/auth/Signup">
									<motion.button
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.95 }}
										className="bg-gradient-to-r from-[#60a5fa] to-[#34d399] hover:from-[#3b82f6] hover:to-[#059669] text-white font-bold px-12 py-4 rounded-xl text-xl shadow-xl hover:shadow-2xl transition-all duration-300"
									>
										Start Free Trial Now
										<ArrowRight className="w-6 h-6 ml-3 inline" />
									</motion.button>
								</Link>
								<div className="flex items-center gap-2 text-white/60">
									<CheckCircle className="w-5 h-5 text-[#34d399]" />
									<span className="text-lg">14-day free trial • No credit card required</span>
								</div>
							</div>
						</motion.div>
					</div>
				</motion.div>

				{/* Free Tools Showcase Section */}
				<motion.div 
					initial={{ opacity: 0, y: 50 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8 }}
					viewport={{ once: true }}
					className="relative z-10 py-32 px-4 flex justify-center bg-gradient-to-r from-[#0f172a]/80 to-[#1e293b]/80"
				>
					<div className="max-w-7xl w-full">
						<div className="text-center mb-20">
							<motion.div
								initial={{ opacity: 0, scale: 0.9 }}
								whileInView={{ opacity: 1, scale: 1 }}
								transition={{ duration: 0.5 }}
								className="inline-flex items-center gap-2 bg-gradient-to-r from-[#fbbf24]/20 to-[#f59e0b]/20 backdrop-blur-sm border border-[#fbbf24]/30 text-white px-4 py-2 rounded-full text-sm font-medium mb-8"
							>
								<Star className="w-4 h-4 text-[#fbbf24]" />
								Free Professional Tools
							</motion.div>
							<h2 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8 text-white">
								Try Our Tools{' '}
								<span className="bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] bg-clip-text text-transparent">
									Risk-Free
								</span>
							</h2>
							<p className="text-2xl md:text-3xl text-white/80 max-w-4xl mx-auto leading-relaxed">
								Get a taste of professional property management with our free tools. 
								No signup required, instant results.
							</p>
						</div>

						{/* Free Tools Cards */}
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
							{/* Lease Generator Tool */}
							<motion.div
								initial={{ opacity: 0, x: -30 }}
								whileInView={{ opacity: 1, x: 0 }}
								transition={{ duration: 0.6 }}
								viewport={{ once: true }}
								className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-3xl p-8 border border-[#fbbf24]/20 hover:border-[#fbbf24]/40 transition-all duration-300 group"
							>
								<div className="flex items-center justify-between mb-6">
									<div className="w-16 h-16 bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
										<FileText className="w-8 h-8 text-white" />
									</div>
									<div className="text-right">
										<div className="text-sm text-[#fbbf24] font-semibold mb-1">100% FREE</div>
										<div className="text-xs text-white/60">No signup required</div>
									</div>
								</div>
								
								<h3 className="text-2xl font-bold text-white mb-4">Professional Lease Generator</h3>
								<p className="text-white/70 text-lg mb-6 leading-relaxed">
									Create legally-compliant residential lease agreements in minutes. 
									Professional templates with state-specific clauses included.
								</p>
								
								<div className="flex flex-wrap gap-2 mb-6">
									<span className="inline-flex items-center gap-1 px-3 py-1 bg-[#fbbf24]/20 rounded-full text-sm text-[#fbbf24]">
										<CheckCircle className="w-3 h-3" />
										State Compliant
									</span>
									<span className="inline-flex items-center gap-1 px-3 py-1 bg-[#fbbf24]/20 rounded-full text-sm text-[#fbbf24]">
										<Download className="w-3 h-3" />
										PDF & Word
									</span>
									<span className="inline-flex items-center gap-1 px-3 py-1 bg-[#fbbf24]/20 rounded-full text-sm text-[#fbbf24]">
										<Zap className="w-3 h-3" />
										5 Minutes
									</span>
								</div>
								
								<Link to="/tools/lease-generator">
									<motion.button
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										className="w-full bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] text-white font-bold py-4 px-6 rounded-xl hover:shadow-lg hover:shadow-[#fbbf24]/25 transition-all duration-300"
									>
										Generate Free Lease Now
										<ArrowRight className="w-5 h-5 ml-2 inline" />
									</motion.button>
								</Link>
							</motion.div>

							{/* Coming Soon Tool */}
							<motion.div
								initial={{ opacity: 0, x: 30 }}
								whileInView={{ opacity: 1, x: 0 }}
								transition={{ duration: 0.6, delay: 0.1 }}
								viewport={{ once: true }}
								className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-all duration-300 group relative overflow-hidden"
							>
								{/* Coming Soon Overlay */}
								<div className="absolute top-4 right-4 bg-gradient-to-r from-[#60a5fa] to-[#34d399] text-white px-3 py-1 rounded-full text-xs font-semibold">
									Coming Soon
								</div>
								
								<div className="flex items-center justify-between mb-6">
									<div className="w-16 h-16 bg-gradient-to-br from-[#60a5fa]/20 to-[#34d399]/20 rounded-2xl flex items-center justify-center border border-[#60a5fa]/30">
										<TrendingUp className="w-8 h-8 text-[#60a5fa]" />
									</div>
									<div className="text-right">
										<div className="text-sm text-[#60a5fa] font-semibold mb-1">FREE TOOL</div>
										<div className="text-xs text-white/60">In development</div>
									</div>
								</div>
								
								<h3 className="text-2xl font-bold text-white mb-4">ROI Calculator</h3>
								<p className="text-white/70 text-lg mb-6 leading-relaxed">
									Calculate potential returns on investment properties with detailed cash flow analysis, 
									tax implications, and market projections.
								</p>
								
								<div className="flex flex-wrap gap-2 mb-6">
									<span className="inline-flex items-center gap-1 px-3 py-1 bg-white/10 rounded-full text-sm text-white/60">
										<TrendingUp className="w-3 h-3" />
										Cash Flow Analysis
									</span>
									<span className="inline-flex items-center gap-1 px-3 py-1 bg-white/10 rounded-full text-sm text-white/60">
										<Shield className="w-3 h-3" />
										Market Data
									</span>
								</div>
								
								<button
									disabled
									className="w-full bg-white/10 text-white/50 font-bold py-4 px-6 rounded-xl cursor-not-allowed"
								>
									Notify Me When Ready
								</button>
							</motion.div>
						</div>

						{/* CTA to Main Platform */}
						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							whileInView={{ opacity: 1, scale: 1 }}
							transition={{ duration: 0.6 }}
							viewport={{ once: true }}
							className="text-center"
						>
							<p className="text-xl text-white/80 mb-8">
								Love the free tools? Get the complete property management platform:
							</p>
							<Link to="/auth/Signup">
								<motion.button
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
									className="bg-gradient-to-r from-[#60a5fa] to-[#34d399] text-white font-bold px-12 py-4 rounded-2xl text-xl shadow-xl hover:shadow-2xl transition-all duration-300"
								>
									Start Free Trial
									<ArrowRight className="w-6 h-6 ml-3 inline" />
								</motion.button>
							</Link>
						</motion.div>
					</div>
				</motion.div>

				{/* Trust Building Section */}
				<motion.div 
					initial={{ opacity: 0 }}
					whileInView={{ opacity: 1 }}
					transition={{ duration: 0.8 }}
					viewport={{ once: true }}
					className="relative z-10 py-24 px-4 flex justify-center"
				>
					<div className="max-w-6xl w-full">
						<div className="text-center mb-16">
							<motion.div
								initial={{ opacity: 0, scale: 0.9 }}
								whileInView={{ opacity: 1, scale: 1 }}
								transition={{ duration: 0.5 }}
								className="inline-flex items-center gap-2 bg-gradient-to-r from-[#60a5fa] to-[#34d399] text-white px-6 py-3 rounded-full text-lg font-semibold mb-8"
							>
								<Zap className="w-5 h-5" />
								Just Launched - Early Access Program
							</motion.div>
							<h2 className="text-5xl md:text-6xl font-bold mb-8 text-white">
								Built by Property Managers,{' '}
								<span className="bg-gradient-to-r from-[#60a5fa] to-[#34d399] bg-clip-text text-transparent">
									For Property Managers
								</span>
							</h2>
							<p className="text-2xl md:text-3xl text-white/80 max-w-4xl mx-auto leading-relaxed">
								We understand the daily challenges because we've been there. 
								Join our early adopters and help shape the future of property management.
							</p>
						</div>

						{/* Trust Indicators */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.1 }}
								className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 text-center"
							>
								<Shield className="w-12 h-12 text-[#60a5fa] mx-auto mb-4" />
								<h3 className="text-xl font-bold text-white mb-2">Bank-Grade Security</h3>
								<p className="text-white/70">
									256-bit encryption, SOC 2 compliant infrastructure, 
									and automatic daily backups
								</p>
							</motion.div>

							<motion.div
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.2 }}
								className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 text-center"
							>
								<Award className="w-12 h-12 text-[#34d399] mx-auto mb-4" />
								<h3 className="text-xl font-bold text-white mb-2">30-Day Money Back</h3>
								<p className="text-white/70">
									Not satisfied? Get a full refund within 30 days. 
									No questions asked, no hassle
								</p>
							</motion.div>

							<motion.div
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.3 }}
								className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 text-center"
							>
								<Users className="w-12 h-12 text-[#fbbf24] mx-auto mb-4" />
								<h3 className="text-xl font-bold text-white mb-2">Early Adopter Benefits</h3>
								<p className="text-white/70">
									First 50 customers get 50% off for life plus 
									direct access to our product team
								</p>
							</motion.div>
						</div>

						{/* Special Offer Banner */}
						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							whileInView={{ opacity: 1, scale: 1 }}
							transition={{ duration: 0.6 }}
							className="bg-gradient-to-r from-[#60a5fa]/20 to-[#34d399]/20 backdrop-blur-sm rounded-3xl p-8 border border-[#60a5fa]/30 text-center"
						>
							<h3 className="text-2xl font-bold text-white mb-4">
								🚀 Limited Time: Early Access Special
							</h3>
							<p className="text-xl text-white/80 mb-6">
								Be among the first to revolutionize your property management. 
								Lock in our founder's pricing before it's gone.
							</p>
							<Link to="/auth/Signup">
								<Button
									size="lg"
									className="bg-gradient-to-r from-[#60a5fa] to-[#34d399] hover:from-[#3b82f6] hover:to-[#059669] text-white font-bold px-12 py-4 text-xl shadow-xl hover:shadow-2xl transition-all duration-300"
								>
									Claim Your 50% Discount
									<ArrowRight className="w-6 h-6 ml-3" />
								</Button>
							</Link>
							<p className="text-sm text-white/60 mt-4">
								Only 37 spots remaining at this price
							</p>
						</motion.div>
					</div>
				</motion.div>

				{/* Founder Story Section */}
				<motion.div 
					initial={{ opacity: 0, y: 50 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8 }}
					viewport={{ once: true }}
					className="relative z-10 py-32 px-4 flex justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155]"
				>
					<div className="max-w-6xl w-full">
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
							{/* Story Content */}
							<motion.div
								initial={{ opacity: 0, x: -30 }}
								whileInView={{ opacity: 1, x: 0 }}
								transition={{ duration: 0.6 }}
								viewport={{ once: true }}
							>
								<div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#60a5fa]/20 to-[#34d399]/20 backdrop-blur-sm border border-[#60a5fa]/30 text-white px-4 py-2 rounded-full text-sm font-medium mb-8">
									<Users className="w-4 h-4" />
									Our Story
								</div>
								
								<h2 className="text-4xl md:text-5xl font-bold text-white mb-8 leading-tight">
									Built by Property Managers Who{' '}
									<span className="bg-gradient-to-r from-[#60a5fa] to-[#34d399] bg-clip-text text-transparent">
										Felt Your Pain
									</span>
								</h2>
								
								<div className="space-y-6 text-lg text-white/80 leading-relaxed">
									<p>
										After years of managing rental properties with spreadsheets, sticky notes, and 
										a dozen different apps, we knew there had to be a better way.
									</p>
									
									<p>
										We were tired of chasing late rent payments, scrambling to fill vacant units, 
										and drowning in maintenance requests. Every property manager we talked to had 
										the same frustrations.
									</p>
									
									<p>
										So we built TenantFlow - not as another generic software company, but as 
										property managers solving real problems we face every day.
									</p>
								</div>
								
								<div className="mt-10 space-y-4">
									<div className="flex items-center gap-4">
										<div className="w-12 h-12 bg-gradient-to-br from-[#60a5fa] to-[#34d399] rounded-full flex items-center justify-center">
											<CheckCircle className="w-6 h-6 text-white" />
										</div>
										<div>
											<h4 className="font-semibold text-white">Property Manager Founded</h4>
											<p className="text-white/60">Built by people who understand the daily grind</p>
										</div>
									</div>
									
									<div className="flex items-center gap-4">
										<div className="w-12 h-12 bg-gradient-to-br from-[#60a5fa] to-[#34d399] rounded-full flex items-center justify-center">
											<CheckCircle className="w-6 h-6 text-white" />
										</div>
										<div>
											<h4 className="font-semibold text-white">Real-World Tested</h4>
											<p className="text-white/60">Every feature born from actual pain points</p>
										</div>
									</div>
									
									<div className="flex items-center gap-4">
										<div className="w-12 h-12 bg-gradient-to-br from-[#60a5fa] to-[#34d399] rounded-full flex items-center justify-center">
											<CheckCircle className="w-6 h-6 text-white" />
										</div>
										<div>
											<h4 className="font-semibold text-white">Continuously Evolving</h4>
											<p className="text-white/60">Your feedback shapes every update</p>
										</div>
									</div>
								</div>
							</motion.div>

							{/* Visual Element */}
							<motion.div
								initial={{ opacity: 0, x: 30 }}
								whileInView={{ opacity: 1, x: 0 }}
								transition={{ duration: 0.6, delay: 0.2 }}
								viewport={{ once: true }}
								className="relative"
							>
								<div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10">
									<div className="space-y-6">
										<div className="flex items-center gap-4">
											<div className="w-16 h-16 bg-gradient-to-br from-[#60a5fa] to-[#34d399] rounded-2xl flex items-center justify-center">
												<Building2 className="w-8 h-8 text-white" />
											</div>
											<div>
												<h3 className="text-xl font-bold text-white">The Problem</h3>
												<p className="text-white/60">Managing properties was a nightmare of spreadsheets and chaos</p>
											</div>
										</div>
										
										<div className="border-l-2 border-[#60a5fa]/30 pl-6 ml-8 space-y-4 text-white/70">
											<p>"Why is rent collection so hard?"</p>
											<p>"How long will this unit stay empty?"</p>
											<p>"Where did I put that maintenance request?"</p>
											<p>"Is this even profitable anymore?"</p>
										</div>
										
										<div className="flex items-center gap-4 pt-4">
											<div className="w-16 h-16 bg-gradient-to-br from-[#34d399] to-[#059669] rounded-2xl flex items-center justify-center">
												<Zap className="w-8 h-8 text-white" />
											</div>
											<div>
												<h3 className="text-xl font-bold text-white">The Solution</h3>
												<p className="text-white/60">TenantFlow - property management that actually works</p>
											</div>
										</div>
									</div>
								</div>
								
								{/* Decorative elements */}
								<div className="absolute -top-4 -right-4 w-24 h-24 bg-[#60a5fa]/10 rounded-full blur-xl" />
								<div className="absolute -bottom-6 -left-6 w-32 h-32 bg-[#34d399]/10 rounded-full blur-xl" />
							</motion.div>
						</div>
						
						{/* Early Access CTA */}
						<motion.div
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.4 }}
							viewport={{ once: true }}
							className="text-center mt-20"
						>
							<div className="bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm rounded-3xl p-10 border border-white/10">
								<h3 className="text-3xl font-bold text-white mb-6">
									Join Our Journey
								</h3>
								<p className="text-xl text-white/80 mb-8 max-w-3xl mx-auto">
									We're still in early access, which means you get to help shape the product while 
									enjoying founder pricing. Your feedback directly influences our roadmap.
								</p>
								<div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
									<Link to="/auth/Signup">
										<motion.button
											whileHover={{ scale: 1.05 }}
											whileTap={{ scale: 0.95 }}
											className="bg-gradient-to-r from-[#60a5fa] to-[#34d399] text-white font-bold px-10 py-4 rounded-xl text-lg shadow-xl hover:shadow-2xl transition-all duration-300"
										>
											Become a Founding User
											<ArrowRight className="w-5 h-5 ml-2 inline" />
										</motion.button>
									</Link>
									<div className="flex items-center gap-2 text-white/60">
										<Clock className="w-4 h-4" />
										<span className="text-sm">14-day free trial • No credit card required</span>
									</div>
								</div>
							</div>
						</motion.div>
					</div>
				</motion.div>

				{/* Pricing Comparison Section */}
				<motion.div 
					initial={{ opacity: 0, y: 50 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8 }}
					viewport={{ once: true }}
					className="relative z-10 py-32 px-4 flex justify-center bg-gradient-to-br from-[#1e293b]/90 to-[#0f172a]/90"
				>
					<div className="max-w-7xl w-full">
						<div className="text-center mb-20">
							<motion.div
								initial={{ opacity: 0, scale: 0.9 }}
								whileInView={{ opacity: 1, scale: 1 }}
								transition={{ duration: 0.5 }}
								className="inline-flex items-center gap-2 bg-gradient-to-r from-[#60a5fa]/20 to-[#34d399]/20 backdrop-blur-sm border border-[#60a5fa]/30 text-white px-6 py-3 rounded-full text-sm font-medium mb-8"
							>
								<Star className="w-4 h-4 text-[#fbbf24]" />
								Early Adopter Special Pricing
							</motion.div>
							<h2 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8 text-white">
								Simple,{' '}
								<span className="bg-gradient-to-r from-[#60a5fa] to-[#34d399] bg-clip-text text-transparent">
									Transparent Pricing
								</span>
							</h2>
							<p className="text-2xl md:text-3xl text-white/80 max-w-4xl mx-auto leading-relaxed">
								Choose the plan that fits your portfolio size. Upgrade or downgrade anytime.
							</p>
						</div>

						{/* Pricing Cards */}
						<div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-16">
							{/* Free Trial Plan */}
							<motion.div
								initial={{ opacity: 0, y: 30 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.6, delay: 0.1 }}
								viewport={{ once: true }}
								className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/20 hover:border-white/30 transition-all duration-300 group relative"
							>
								<div className="text-center mb-8">
									<h3 className="text-2xl font-bold text-white mb-2">Free Trial</h3>
									<p className="text-white/60 mb-6">Perfect for getting started</p>
									<div className="mb-6">
										<span className="text-5xl font-bold text-white">$0</span>
										<span className="text-white/60 text-lg">/month</span>
									</div>
									<div className="bg-gradient-to-r from-[#60a5fa]/20 to-[#34d399]/20 rounded-full px-4 py-2 text-sm text-white/80 border border-[#60a5fa]/30">
										14-day free trial
									</div>
								</div>
								
								<div className="space-y-4 mb-8">
									<div className="flex items-center gap-3">
										<Check className="w-5 h-5 text-[#34d399] flex-shrink-0" />
										<span className="text-white/80">Up to 2 properties</span>
									</div>
									<div className="flex items-center gap-3">
										<Check className="w-5 h-5 text-[#34d399] flex-shrink-0" />
										<span className="text-white/80">Up to 5 tenants</span>
									</div>
									<div className="flex items-center gap-3">
										<Check className="w-5 h-5 text-[#34d399] flex-shrink-0" />
										<span className="text-white/80">Basic maintenance tracking</span>
									</div>
									<div className="flex items-center gap-3">
										<Check className="w-5 h-5 text-[#34d399] flex-shrink-0" />
										<span className="text-white/80">Document storage (1GB)</span>
									</div>
									<div className="flex items-center gap-3">
										<Check className="w-5 h-5 text-[#34d399] flex-shrink-0" />
										<span className="text-white/80">Email support</span>
									</div>
								</div>
								
								<Link to="/auth/Signup" className="block">
									<Button className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/30 hover:border-white/50 py-3 text-lg font-semibold rounded-xl transition-all duration-300">
										Start Free Trial
									</Button>
								</Link>
							</motion.div>

							{/* Starter Plan */}
							<motion.div
								initial={{ opacity: 0, y: 30 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.6, delay: 0.2 }}
								viewport={{ once: true }}
								className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/20 hover:border-white/30 transition-all duration-300 group relative"
							>
								<div className="text-center mb-8">
									<h3 className="text-2xl font-bold text-white mb-2">Starter</h3>
									<p className="text-white/60 mb-6">Great for small portfolios</p>
									<div className="mb-6">
										<span className="text-5xl font-bold text-white">$19</span>
										<span className="text-white/60 text-lg">/month</span>
									</div>
									<div className="bg-gradient-to-r from-[#fbbf24]/20 to-[#f59e0b]/20 rounded-full px-4 py-2 text-sm text-[#fbbf24] border border-[#fbbf24]/30">
										50% off early access
									</div>
								</div>
								
								<div className="space-y-4 mb-8">
									<div className="flex items-center gap-3">
										<Check className="w-5 h-5 text-[#34d399] flex-shrink-0" />
										<span className="text-white/80">Up to 10 properties</span>
									</div>
									<div className="flex items-center gap-3">
										<Check className="w-5 h-5 text-[#34d399] flex-shrink-0" />
										<span className="text-white/80">Up to 50 tenants</span>
									</div>
									<div className="flex items-center gap-3">
										<Check className="w-5 h-5 text-[#34d399] flex-shrink-0" />
										<span className="text-white/80">Advanced maintenance workflow</span>
									</div>
									<div className="flex items-center gap-3">
										<Check className="w-5 h-5 text-[#34d399] flex-shrink-0" />
										<span className="text-white/80">Automated rent reminders</span>
									</div>
									<div className="flex items-center gap-3">
										<Check className="w-5 h-5 text-[#34d399] flex-shrink-0" />
										<span className="text-white/80">Financial reporting</span>
									</div>
								</div>
								
								<Link to="/auth/Signup" className="block">
									<Button className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/30 hover:border-white/50 py-3 text-lg font-semibold rounded-xl transition-all duration-300">
										Choose Starter
									</Button>
								</Link>
							</motion.div>

							{/* Growth Plan - Recommended */}
							<motion.div
								initial={{ opacity: 0, y: 30 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.6, delay: 0.3 }}
								viewport={{ once: true }}
								className="bg-gradient-to-br from-[#60a5fa]/20 via-[#34d399]/10 to-[#60a5fa]/20 backdrop-blur-sm rounded-3xl p-8 border-2 border-[#60a5fa]/40 hover:border-[#60a5fa]/60 transition-all duration-300 group relative scale-105 lg:scale-110"
							>
								{/* Most Popular Badge */}
								<div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#60a5fa] to-[#34d399] text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
									Most Popular
								</div>
								
								<div className="text-center mb-8 pt-2">
									<h3 className="text-2xl font-bold text-white mb-2">Growth</h3>
									<p className="text-white/60 mb-6">Ideal for growing businesses</p>
									<div className="mb-6">
										<span className="text-5xl font-bold text-white">$49</span>
										<span className="text-white/60 text-lg">/month</span>
									</div>
									<div className="bg-gradient-to-r from-[#60a5fa] to-[#34d399] rounded-full px-4 py-2 text-sm text-white font-semibold">
										🔥 Best Value - 50% Off
									</div>
								</div>
								
								<div className="space-y-4 mb-8">
									<div className="flex items-center gap-3">
										<Check className="w-5 h-5 text-[#34d399] flex-shrink-0" />
										<span className="text-white">Up to 50 properties</span>
									</div>
									<div className="flex items-center gap-3">
										<Check className="w-5 h-5 text-[#34d399] flex-shrink-0" />
										<span className="text-white">Up to 250 tenants</span>
									</div>
									<div className="flex items-center gap-3">
										<Check className="w-5 h-5 text-[#34d399] flex-shrink-0" />
										<span className="text-white">Advanced analytics & insights</span>
									</div>
									<div className="flex items-center gap-3">
										<Check className="w-5 h-5 text-[#34d399] flex-shrink-0" />
										<span className="text-white">Custom report builder</span>
									</div>
									<div className="flex items-center gap-3">
										<Check className="w-5 h-5 text-[#34d399] flex-shrink-0" />
										<span className="text-white">API access</span>
									</div>
									<div className="flex items-center gap-3">
										<Check className="w-5 h-5 text-[#34d399] flex-shrink-0" />
										<span className="text-white">Priority support</span>
									</div>
								</div>
								
								<Link to="/auth/Signup" className="block">
									<Button className="w-full bg-gradient-to-r from-[#60a5fa] to-[#34d399] hover:from-[#3b82f6] hover:to-[#059669] text-white py-3 text-lg font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300">
										Choose Growth
									</Button>
								</Link>
							</motion.div>

							{/* Enterprise Plan */}
							<motion.div
								initial={{ opacity: 0, y: 30 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.6, delay: 0.4 }}
								viewport={{ once: true }}
								className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/20 hover:border-white/30 transition-all duration-300 group relative"
							>
								<div className="text-center mb-8">
									<h3 className="text-2xl font-bold text-white mb-2">Enterprise</h3>
									<p className="text-white/60 mb-6">Unlimited growth potential</p>
									<div className="mb-6">
										<span className="text-5xl font-bold text-white">$149</span>
										<span className="text-white/60 text-lg">/month</span>
									</div>
									<div className="bg-gradient-to-r from-[#a78bfa]/20 to-[#7c3aed]/20 rounded-full px-4 py-2 text-sm text-[#a78bfa] border border-[#a78bfa]/30">
										Custom pricing available
									</div>
								</div>
								
								<div className="space-y-4 mb-8">
									<div className="flex items-center gap-3">
										<Check className="w-5 h-5 text-[#34d399] flex-shrink-0" />
										<span className="text-white/80">Unlimited properties</span>
									</div>
									<div className="flex items-center gap-3">
										<Check className="w-5 h-5 text-[#34d399] flex-shrink-0" />
										<span className="text-white/80">Unlimited tenants</span>
									</div>
									<div className="flex items-center gap-3">
										<Check className="w-5 h-5 text-[#34d399] flex-shrink-0" />
										<span className="text-white/80">Custom integrations</span>
									</div>
									<div className="flex items-center gap-3">
										<Check className="w-5 h-5 text-[#34d399] flex-shrink-0" />
										<span className="text-white/80">Dedicated account manager</span>
									</div>
									<div className="flex items-center gap-3">
										<Check className="w-5 h-5 text-[#34d399] flex-shrink-0" />
										<span className="text-white/80">24/7 priority support</span>
									</div>
								</div>
								
								<Link to="/pricing" className="block">
									<Button className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/30 hover:border-white/50 py-3 text-lg font-semibold rounded-xl transition-all duration-300">
										Contact Sales
									</Button>
								</Link>
							</motion.div>
						</div>

						{/* Value Propositions */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.5 }}
							viewport={{ once: true }}
							className="text-center mb-16"
						>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
								<div className="flex flex-col items-center">
									<div className="w-12 h-12 bg-gradient-to-br from-[#34d399]/20 to-[#059669]/20 rounded-lg flex items-center justify-center mb-4">
										<CheckCircle className="w-6 h-6 text-[#34d399]" />
									</div>
									<h4 className="text-lg font-semibold text-white mb-2">No Setup Fees</h4>
									<p className="text-white/60 text-center">Start managing properties immediately with no hidden costs or setup charges</p>
								</div>
								<div className="flex flex-col items-center">
									<div className="w-12 h-12 bg-gradient-to-br from-[#60a5fa]/20 to-[#3b82f6]/20 rounded-lg flex items-center justify-center mb-4">
										<ArrowRight className="w-6 h-6 text-[#60a5fa]" />
									</div>
									<h4 className="text-lg font-semibold text-white mb-2">Upgrade Anytime</h4>
									<p className="text-white/60 text-center">Scale up or down as your portfolio grows - no long-term contracts required</p>
								</div>
								<div className="flex flex-col items-center">
									<div className="w-12 h-12 bg-gradient-to-br from-[#fbbf24]/20 to-[#f59e0b]/20 rounded-lg flex items-center justify-center mb-4">
										<Award className="w-6 h-6 text-[#fbbf24]" />
									</div>
									<h4 className="text-lg font-semibold text-white mb-2">30-Day Guarantee</h4>
									<p className="text-white/60 text-center">Not happy? Get a full refund within 30 days, no questions asked</p>
								</div>
							</div>
						</motion.div>

						{/* FAQ Callout */}
						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							whileInView={{ opacity: 1, scale: 1 }}
							transition={{ duration: 0.6 }}
							className="text-center bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/10"
						>
							<h3 className="text-2xl font-bold text-white mb-4">
								Questions About Pricing?
							</h3>
							<p className="text-lg text-white/70 max-w-2xl mx-auto mb-6">
								We're here to help you choose the right plan for your portfolio size and needs.
							</p>
							<div className="flex flex-col sm:flex-row gap-4 justify-center">
								<Link to="/pricing">
									<Button variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8 py-3">
										View Detailed Pricing
									</Button>
								</Link>
								<Link to="/contact">
									<Button className="bg-gradient-to-r from-[#60a5fa] to-[#34d399] hover:from-[#3b82f6] hover:to-[#059669] text-white px-8 py-3">
										Talk to Sales
									</Button>
								</Link>
							</div>
						</motion.div>
					</div>
				</motion.div>

				{/* FAQ Section */}
				<motion.div 
					initial={{ opacity: 0, y: 50 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8 }}
					viewport={{ once: true }}
					className="relative z-10 py-32 px-4 flex justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155]"
				>
					<div className="max-w-5xl w-full">
						<div className="text-center mb-20">
							<motion.div
								initial={{ opacity: 0, scale: 0.9 }}
								whileInView={{ opacity: 1, scale: 1 }}
								transition={{ duration: 0.5 }}
								className="inline-flex items-center gap-2 bg-gradient-to-r from-[#60a5fa]/20 to-[#34d399]/20 backdrop-blur-sm border border-[#60a5fa]/30 text-white px-6 py-3 rounded-full text-sm font-medium mb-8"
							>
								<HelpCircle className="w-4 h-4" />
								Frequently Asked Questions
							</motion.div>
							<h2 className="text-5xl md:text-6xl font-bold mb-8 text-white">
								Got{' '}
								<span className="bg-gradient-to-r from-[#60a5fa] to-[#34d399] bg-clip-text text-transparent">
									Questions?
								</span>
							</h2>
							<p className="text-2xl md:text-3xl text-white/80 max-w-3xl mx-auto leading-relaxed">
								Everything you need to know about TenantFlow and getting started with professional property management.
							</p>
						</div>

						{/* FAQ Items */}
						<div className="space-y-4">
							{[
								{
									question: "Is TenantFlow really free to try?",
									answer: "Yes! You get a full 14-day free trial with access to all features. No credit card required to start, and you can cancel anytime during the trial with no charges."
								},
								{
									question: "What makes TenantFlow different from other property management software?",
									answer: "We're built by actual property managers who understand the daily frustrations. Every feature solves a real problem we've faced ourselves - from chasing late rent to filling vacant units quickly. Plus, we're in early access, which means you get founder pricing and direct input on new features."
								},
								{
									question: "How quickly can I get started?",
									answer: "Most property managers are up and running in under 30 minutes. Our setup wizard guides you through adding your first property, and you can import tenant data from spreadsheets or other systems. No technical expertise required."
								},
								{
									question: "Do you integrate with accounting software?",
									answer: "Yes! We integrate with QuickBooks, Xero, and other popular accounting platforms. You can also export financial reports in formats ready for your CPA or bookkeeper."
								},
								{
									question: "What if I have more properties than my plan allows?",
									answer: "You can upgrade your plan instantly - no need to wait for billing cycles. We'll prorate the charges and you'll have access to additional capacity immediately. Downgrading is just as easy if your portfolio shrinks."
								},
								{
									question: "Is my data secure?",
									answer: "Absolutely. We use bank-grade 256-bit encryption, maintain SOC 2 compliance, and store all data on secure AWS servers. We also perform daily automated backups and undergo regular third-party security audits."
								},
								{
									question: "Can I cancel anytime?",
									answer: "Yes, you can cancel your subscription at any time. We'll never lock you into long-term contracts. If you cancel, you'll continue to have access until the end of your current billing period."
								},
								{
									question: "Do you offer phone support?",
									answer: "Growth and Enterprise plans include priority phone support. All plans get email support with response times under 24 hours. As an early access customer, you also get direct access to our product team for feedback and feature requests."
								}
							].map((faq, index) => (
								<FAQItem key={index} question={faq.question} answer={faq.answer} index={index} />
							))}
						</div>

						{/* Still Have Questions CTA */}
						<motion.div
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.4 }}
							viewport={{ once: true }}
							className="mt-20 text-center bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm rounded-3xl p-12 border border-white/10"
						>
							<div className="w-16 h-16 bg-gradient-to-br from-[#60a5fa]/20 to-[#34d399]/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
								<Phone className="w-8 h-8 text-[#60a5fa]" />
							</div>
							<h3 className="text-3xl font-bold text-white mb-4">
								Still Have Questions?
							</h3>
							<p className="text-xl text-white/70 max-w-2xl mx-auto mb-8">
								Our team is here to help you succeed. Book a personal demo or chat with our property management experts.
							</p>
							<div className="flex flex-col sm:flex-row gap-6 justify-center">
								<Link to="/contact">
									<Button className="bg-gradient-to-r from-[#60a5fa] to-[#34d399] hover:from-[#3b82f6] hover:to-[#059669] text-white px-10 py-4 text-lg font-semibold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300">
										Schedule a Demo
										<ArrowRight className="w-5 h-5 ml-2" />
									</Button>
								</Link>
								<Link to="/auth/Signup">
									<Button variant="outline" className="border-white/30 text-white hover:bg-white/10 px-10 py-4 text-lg font-semibold rounded-xl">
										Start Free Trial
									</Button>
								</Link>
							</div>
							<p className="text-sm text-white/50 mt-6">
								Average response time: Under 2 hours • Available 7 days a week
							</p>
						</motion.div>
					</div>
				</motion.div>

				{/* Security & Compliance Section */}
				<motion.div 
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8 }}
					viewport={{ once: true }}
					className="relative z-10 py-20 px-4 flex justify-center bg-gradient-to-r from-[#1e293b]/60 to-[#0f172a]/60 border-t border-white/10"
				>
					<div className="max-w-7xl w-full">
						<div className="text-center mb-16">
							<h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
								Enterprise-Grade Security & Compliance
							</h3>
							<p className="text-xl text-white/70 max-w-3xl mx-auto">
								Your data security is our top priority. We maintain the highest standards of protection and compliance.
							</p>
						</div>

						{/* Security Features Grid */}
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.1 }}
								className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 text-center group hover:border-[#60a5fa]/30 transition-all duration-300"
							>
								<div className="w-12 h-12 bg-gradient-to-br from-[#60a5fa]/20 to-[#3b82f6]/20 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
									<Lock className="w-6 h-6 text-[#60a5fa]" />
								</div>
								<h4 className="font-bold text-white mb-2">256-Bit SSL Encryption</h4>
								<p className="text-sm text-white/60">All data encrypted in transit and at rest</p>
							</motion.div>

							<motion.div
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.2 }}
								className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 text-center group hover:border-[#34d399]/30 transition-all duration-300"
							>
								<div className="w-12 h-12 bg-gradient-to-br from-[#34d399]/20 to-[#059669]/20 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
									<Shield className="w-6 h-6 text-[#34d399]" />
								</div>
								<h4 className="font-bold text-white mb-2">SOC 2 Type II Compliant</h4>
								<p className="text-sm text-white/60">Audited security controls and processes</p>
							</motion.div>

							<motion.div
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.3 }}
								className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 text-center group hover:border-[#fbbf24]/30 transition-all duration-300"
							>
								<div className="w-12 h-12 bg-gradient-to-br from-[#fbbf24]/20 to-[#f59e0b]/20 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
									<Clock className="w-6 h-6 text-[#fbbf24]" />
								</div>
								<h4 className="font-bold text-white mb-2">Daily Automated Backups</h4>
								<p className="text-sm text-white/60">99.9% uptime with instant recovery</p>
							</motion.div>

							<motion.div
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.4 }}
								className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 text-center group hover:border-[#a78bfa]/30 transition-all duration-300"
							>
								<div className="w-12 h-12 bg-gradient-to-br from-[#a78bfa]/20 to-[#7c3aed]/20 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
									<Eye className="w-6 h-6 text-[#a78bfa]" />
								</div>
								<h4 className="font-bold text-white mb-2">24/7 Security Monitoring</h4>
								<p className="text-sm text-white/60">Real-time threat detection and response</p>
							</motion.div>
						</div>

						{/* Compliance Badges */}
						<div className="flex flex-wrap justify-center items-center gap-8 mb-12">
							<div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm px-6 py-3 rounded-full border border-white/10">
								<Shield className="w-5 h-5 text-[#60a5fa]" />
								<span className="text-sm font-semibold text-white">GDPR Compliant</span>
							</div>
							<div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm px-6 py-3 rounded-full border border-white/10">
								<Lock className="w-5 h-5 text-[#34d399]" />
								<span className="text-sm font-semibold text-white">CCPA Compliant</span>
							</div>
							<div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm px-6 py-3 rounded-full border border-white/10">
								<Award className="w-5 h-5 text-[#fbbf24]" />
								<span className="text-sm font-semibold text-white">ISO 27001 Certified</span>
							</div>
							<div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm px-6 py-3 rounded-full border border-white/10">
								<Phone className="w-5 h-5 text-[#a78bfa]" />
								<span className="text-sm font-semibold text-white">24/7 Support</span>
							</div>
						</div>

						{/* Trust Statement */}
						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							whileInView={{ opacity: 1, scale: 1 }}
							transition={{ duration: 0.6 }}
							className="text-center bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/10"
						>
							<h4 className="text-2xl font-bold text-white mb-4">
								Trusted by Property Managers, Secured by Experts
							</h4>
							<p className="text-lg text-white/70 max-w-3xl mx-auto mb-6">
								Our infrastructure is hosted on AWS with enterprise-grade security controls. 
								We undergo regular third-party security audits and maintain strict data protection protocols.
							</p>
							<div className="flex flex-wrap justify-center gap-6 text-sm text-white/60">
								<span className="flex items-center gap-2">
									<CheckCircle className="w-4 h-4 text-[#34d399]" />
									PCI DSS Level 1 Compliant
								</span>
								<span className="flex items-center gap-2">
									<CheckCircle className="w-4 h-4 text-[#34d399]" />
									Encrypted Database Storage
								</span>
								<span className="flex items-center gap-2">
									<CheckCircle className="w-4 h-4 text-[#34d399]" />
									Multi-Factor Authentication
								</span>
								<span className="flex items-center gap-2">
									<CheckCircle className="w-4 h-4 text-[#34d399]" />
									Role-Based Access Control
								</span>
							</div>
						</motion.div>
					</div>
				</motion.div>

				{/* Final CTA Section */}
				<motion.div 
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8 }}
					viewport={{ once: true }}
					className="relative z-10 py-20 px-4 flex justify-center bg-gradient-to-r from-[#0f172a] to-[#1e293b] border-t border-white/10"
				>
					<div className="max-w-5xl w-full text-center">
						<motion.div
							initial={{ opacity: 0, scale: 0.9 }}
							whileInView={{ opacity: 1, scale: 1 }}
							transition={{ duration: 0.6 }}
							className="bg-gradient-to-br from-[#60a5fa]/10 via-[#34d399]/5 to-[#fbbf24]/10 backdrop-blur-sm rounded-3xl p-16 border border-white/10 relative overflow-hidden"
						>
							{/* Decorative elements */}
							<div className="absolute top-0 right-0 w-32 h-32 bg-[#60a5fa]/10 rounded-full blur-3xl" />
							<div className="absolute bottom-0 left-0 w-40 h-40 bg-[#34d399]/10 rounded-full blur-3xl" />
							
							<div className="relative z-10">
								<div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#60a5fa] to-[#34d399] text-white px-6 py-3 rounded-full text-sm font-bold mb-8 shadow-lg">
									<Clock className="w-4 h-4" />
									Limited Time: 50% Off Founder Pricing
								</div>
								
								<h2 className="text-5xl md:text-6xl font-bold text-white mb-8 leading-tight">
									Don't Let Another Month Go By{' '}
									<span className="bg-gradient-to-r from-[#60a5fa] to-[#34d399] bg-clip-text text-transparent">
										Losing Money
									</span>
								</h2>
								
								<p className="text-2xl text-white/80 mb-12 max-w-4xl mx-auto leading-relaxed">
									Every day you wait is money left on the table. Join the property managers who are already 
									filling vacancies faster and collecting rent automatically.
								</p>
								
								<div className="space-y-8">
									<div className="flex flex-col lg:flex-row gap-8 justify-center items-center">
										<Link to="/auth/Signup">
											<motion.button
												whileHover={{ scale: 1.05, y: -2 }}
												whileTap={{ scale: 0.95 }}
												className="group relative bg-gradient-to-r from-[#60a5fa] to-[#34d399] px-16 py-6 rounded-2xl font-bold text-2xl overflow-hidden shadow-xl shadow-[#60a5fa]/25 hover:shadow-2xl hover:shadow-[#60a5fa]/40 transition-all duration-300"
											>
												<div className="absolute inset-0 bg-gradient-to-r from-[#3b82f6] to-[#059669] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
												<span className="relative flex items-center text-white">
													Start Your Free Trial
													<ArrowRight className="w-8 h-8 ml-4 group-hover:translate-x-1 transition-transform duration-300" />
												</span>
											</motion.button>
										</Link>
										
										<div className="text-center lg:text-left">
											<div className="flex items-center justify-center lg:justify-start gap-2 text-white/70 mb-2">
												<CheckCircle className="w-5 h-5 text-[#34d399]" />
												<span className="text-lg">14-day free trial</span>
											</div>
											<div className="flex items-center justify-center lg:justify-start gap-2 text-white/70 mb-2">
												<CheckCircle className="w-5 h-5 text-[#34d399]" />
												<span className="text-lg">No credit card required</span>
											</div>
											<div className="flex items-center justify-center lg:justify-start gap-2 text-white/70">
												<CheckCircle className="w-5 h-5 text-[#34d399]" />
												<span className="text-lg">Cancel anytime</span>
											</div>
										</div>
									</div>
									
									<div className="border-t border-white/10 pt-8">
										<p className="text-white/60 text-lg mb-6">
											Still have questions? Our property management experts are here to help.
										</p>
										<div className="flex flex-col sm:flex-row gap-4 justify-center">
											<Link to="/contact">
												<Button variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8 py-3 text-lg">
													Book a Demo
												</Button>
											</Link>
											<Link to="/tools/lease-generator">
												<Button variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8 py-3 text-lg">
													Try Free Lease Generator
												</Button>
											</Link>
										</div>
									</div>
								</div>
							</div>
						</motion.div>
						
						{/* Footer Text */}
						<motion.div
							initial={{ opacity: 0 }}
							whileInView={{ opacity: 1 }}
							transition={{ duration: 0.6, delay: 0.3 }}
							className="mt-12 text-center text-white/50"
						>
							<p className="text-lg">
								Trusted by property managers • Built by property managers • 
								<span className="text-[#34d399]"> Backed by a 30-day money-back guarantee</span>
							</p>
						</motion.div>
					</div>
				</motion.div>
			</div>
		)
}

export const Route = createFileRoute('/')({
	component: HomePage
})
