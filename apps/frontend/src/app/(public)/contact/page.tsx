'use client'

import React, { useState, useOptimistic } from 'react'
import { logger } from '@/lib/logger'
import { motion, AnimatePresence } from '@/lib/lazy-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
	Mail,
	Phone,
	Clock,
	MessageCircle,
	Send,
	CheckCircle,
	HeadphonesIcon,
	Sparkles,
	Users,
	Zap,
	Shield
} from 'lucide-react'

interface ContactForm {
	name: string
	email: string
	subject: string
	message: string
	type: 'sales' | 'support' | 'general'
}

interface ContactMethod {
	icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
	title: string
	description: string
	contact: string
	availability: string
	gradient: string
}

export default function ContactPage() {
	const [formData, setFormData] = useState<ContactForm>({
		name: '',
		email: '',
		subject: '',
		message: '',
		type: 'general'
	})

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [optimisticSubmitted, setOptimisticSubmitted] = useOptimistic(
		false,
		(_state, optimisticValue: boolean) => optimisticValue
	)

	const contactMethods: ContactMethod[] = [
		{
			icon: Mail,
			title: 'Email Support',
			description: 'Get help with any questions or issues',
			contact: 'support@tenantflow.app',
			availability: 'Response within 4 hours',
			gradient: 'from-primary to-primary'
		},
		{
			icon: Phone,
			title: 'Phone Support',
			description: 'Speak directly with our team',
			contact: '+1 (555) 123-4567',
			availability: 'Mon-Fri, 9AM-6PM EST',
			gradient: 'from-green-500 to-green-600'
		},
		{
			icon: MessageCircle,
			title: 'Live Chat',
			description: 'Instant help when you need it',
			contact: 'Available in app',
			availability: 'Mon-Sun, 8AM-8PM EST',
			gradient: 'from-purple-500 to-purple-600'
		},
		{
			icon: HeadphonesIcon,
			title: 'Sales Inquiry',
			description: 'Learn more about our solutions',
			contact: 'sales@tenantflow.app',
			availability: 'Response within 2 hours',
			gradient: 'from-orange-500 to-orange-600'
		}
	]

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsSubmitting(true)
		setOptimisticSubmitted(true)

		try {
			const { apiClient } = await import('@/lib/api-client')
			await apiClient.post('/api/v1/contact', formData as unknown as Record<string, unknown>)

			// Reset form on success
			setFormData({
				name: '',
				email: '',
				subject: '',
				message: '',
				type: 'general'
			})
		} catch (error) {
			logger.error(
				'Form submission error:',
				error instanceof Error ? error : new Error(String(error)),
				{ component: 'app_contact_page.tsx' }
			)
			setOptimisticSubmitted(false)
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleInputChange = (field: keyof ContactForm, value: string) => {
		setFormData(prev => ({ ...prev, [field]: value }))
	}

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
							<Badge className="from-primary via-accent to-success border-0 bg-gradient-to-r px-6 py-2 text-sm font-semibold text-white shadow-lg">
								<Sparkles className="mr-2 h-4 w-4" />
								Contact Us
							</Badge>
						</motion.div>

						<motion.h1
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.1 }}
							className="text-foreground mb-6 text-5xl leading-tight font-bold lg:text-6xl"
						>
							Let's{' '}
							<span className="from-primary via-accent to-success bg-gradient-to-r bg-clip-text text-transparent">
								Connect
							</span>
						</motion.h1>

						<motion.p
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.2 }}
							className="text-muted-foreground mx-auto max-w-3xl text-xl leading-relaxed"
						>
							Have questions? Need support? Want to learn more?
							We're here to help you succeed with your property
							management goals.
						</motion.p>
					</div>
				</div>
			</section>

			<div className="mx-auto max-w-7xl px-4 pb-16">
				<div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
					{/* Contact Methods */}
					<div className="lg:col-span-1">
						<motion.div
							initial={{ opacity: 0, x: -20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.6 }}
							className="space-y-6"
						>
							<div className="mb-8">
								<h2 className="text-foreground mb-4 text-3xl font-bold">
									Get in Touch
								</h2>
								<p className="text-muted-foreground">
									Choose the contact method that works best
									for you. Our team is standing by to help.
								</p>
							</div>

							{contactMethods.map((method, index) => {
								const IconComponent = method.icon
								return (
									<motion.div
										key={method.title}
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{
											duration: 0.5,
											delay: index * 0.1
										}}
									>
										<Card className="to-muted/30 group cursor-pointer border-0 bg-gradient-to-br from-white transition-all duration-300 hover:shadow-lg">
											<CardContent className="p-6">
												<div className="flex items-start space-x-4">
													<div
														className={`h-12 w-12 bg-gradient-to-br ${method.gradient} flex items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110`}
													>
														<IconComponent className="h-6 w-6 text-white" />
													</div>
													<div className="flex-1">
														<h3 className="text-foreground mb-1 font-semibold">
															{method.title}
														</h3>
														<p className="text-muted-foreground mb-2 text-sm">
															{method.description}
														</p>
														<p className="text-primary mb-1 text-sm font-medium">
															{method.contact}
														</p>
														<p className="text-muted-foreground text-xs">
															{
																method.availability
															}
														</p>
													</div>
												</div>
											</CardContent>
										</Card>
									</motion.div>
								)
							})}

							{/* Office Hours */}
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.6, delay: 0.5 }}
							>
								<Card className="from-accent/5 to-primary/5 border-0 bg-gradient-to-br">
									<CardContent className="p-6">
										<div className="mb-4 flex items-center space-x-3">
											<Clock className="text-accent h-6 w-6" />
											<h3 className="text-foreground font-semibold">
												Office Hours
											</h3>
										</div>
										<div className="text-muted-foreground space-y-2 text-sm">
											<div className="flex justify-between">
												<span>Monday - Friday</span>
												<span>
													9:00 AM - 6:00 PM EST
												</span>
											</div>
											<div className="flex justify-between">
												<span>Saturday</span>
												<span>
													10:00 AM - 4:00 PM EST
												</span>
											</div>
											<div className="flex justify-between">
												<span>Sunday</span>
												<span>Closed</span>
											</div>
										</div>
									</CardContent>
								</Card>
							</motion.div>
						</motion.div>
					</div>

					{/* Contact Form */}
					<div className="lg:col-span-2">
						<motion.div
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.6, delay: 0.2 }}
						>
							<Card className="border-0 bg-white/95 shadow-2xl backdrop-blur-md">
								<CardHeader className="pb-6">
									<CardTitle className="text-foreground text-2xl font-bold">
										Send us a Message
									</CardTitle>
									<p className="text-muted-foreground">
										Fill out the form below and we will get
										back to you as soon as possible.
									</p>
								</CardHeader>

								<CardContent>
									<AnimatePresence mode="wait">
										{optimisticSubmitted ? (
											<motion.div
												key="success"
												initial={{
													opacity: 0,
													scale: 0.95
												}}
												animate={{
													opacity: 1,
													scale: 1
												}}
												exit={{
													opacity: 0,
													scale: 0.95
												}}
												className="py-12 text-center"
											>
												<div className="from-success to-accent mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br">
													<CheckCircle className="h-8 w-8 text-white" />
												</div>
												<h3 className="text-foreground mb-4 text-2xl font-semibold">
													Message Sent!
												</h3>
												<p className="text-muted-foreground mx-auto mb-6 max-w-md">
													Thank you for reaching out.
													We will get back to you
													within 4 hours during
													business hours.
												</p>
												<Button
													onClick={() =>
														setOptimisticSubmitted(
															false
														)
													}
													variant="outline"
												>
													Send Another Message
												</Button>
											</motion.div>
										) : (
											<motion.form
												key="form"
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												exit={{ opacity: 0 }}
												onSubmit={handleSubmit}
												className="space-y-6"
											>
												{/* Contact Type Selection */}
												<div className="space-y-3">
													<Label className="text-foreground text-sm font-semibold">
														What can we help you
														with?
													</Label>
													<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
														{[
															{
																value: 'sales',
																label: 'Sales Inquiry',
																icon: Users
															},
															{
																value: 'support',
																label: 'Technical Support',
																icon: Zap
															},
															{
																value: 'general',
																label: 'General Question',
																icon: Shield
															}
														].map(option => {
															const IconComponent =
																option.icon
															return (
																<button
																	key={
																		option.value
																	}
																	type="button"
																	onClick={() =>
																		handleInputChange(
																			'type',
																			option.value as ContactForm['type']
																		)
																	}
																	className={`rounded-lg border-2 p-4 text-center transition-all duration-200 ${
																		formData.type ===
																		option.value
																			? 'border-primary bg-primary/5 text-primary'
																			: 'border-input hover:border-accent/50 text-muted-foreground hover:text-foreground'
																	}`}
																>
																	<IconComponent className="mx-auto mb-2 h-5 w-5" />
																	<div className="text-sm font-medium">
																		{
																			option.label
																		}
																	</div>
																</button>
															)
														})}
													</div>
												</div>

												{/* Name and Email */}
												<div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
													<div className="space-y-2">
														<Label
															htmlFor="name"
															className="text-foreground text-sm font-semibold"
														>
															Full Name *
														</Label>
														<Input
															id="name"
															placeholder="Your full name"
															value={
																formData.name
															}
															onChange={e =>
																handleInputChange(
																	'name',
																	e.target
																		.value
																)
															}
															className="focus:border-primary focus:shadow-primary/10 h-12 border-2 transition-all duration-200 focus:shadow-lg"
															required
														/>
													</div>

													<div className="space-y-2">
														<Label
															htmlFor="email"
															className="text-foreground text-sm font-semibold"
														>
															Email Address *
														</Label>
														<Input
															id="email"
															type="email"
															placeholder="your@email.com"
															value={
																formData.email
															}
															onChange={e =>
																handleInputChange(
																	'email',
																	e.target
																		.value
																)
															}
															className="focus:border-primary focus:shadow-primary/10 h-12 border-2 transition-all duration-200 focus:shadow-lg"
															required
														/>
													</div>
												</div>

												{/* Subject */}
												<div className="space-y-2">
													<Label
														htmlFor="subject"
														className="text-foreground text-sm font-semibold"
													>
														Subject *
													</Label>
													<Input
														id="subject"
														placeholder="Brief description of your inquiry"
														value={formData.subject}
														onChange={e =>
															handleInputChange(
																'subject',
																e.target.value
															)
														}
														className="focus:border-primary focus:shadow-primary/10 h-12 border-2 transition-all duration-200 focus:shadow-lg"
														required
													/>
												</div>

												{/* Message */}
												<div className="space-y-2">
													<Label
														htmlFor="message"
														className="text-foreground text-sm font-semibold"
													>
														Message *
													</Label>
													<Textarea
														id="message"
														placeholder="Tell us more about your inquiry..."
														value={formData.message}
														onChange={e =>
															handleInputChange(
																'message',
																e.target.value
															)
														}
														rows={6}
														className="focus:border-primary focus:shadow-primary/10 resize-none border-2 transition-all duration-200 focus:shadow-lg"
														required
													/>
												</div>

												{/* Submit Button */}
												<Button
													type="submit"
													variant="premium"
													size="lg"
													className="group h-12 w-full text-base font-semibold"
													disabled={isSubmitting}
												>
													{isSubmitting ? (
														<>
															<div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
															Sending...
														</>
													) : (
														<>
															Send Message
															<Send className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
														</>
													)}
												</Button>

												{/* Privacy Notice */}
												<p className="text-muted-foreground text-center text-xs">
													By submitting this form, you
													agree to our privacy policy.
													We will never share your
													information.
												</p>
											</motion.form>
										)}
									</AnimatePresence>
								</CardContent>
							</Card>
						</motion.div>
					</div>
				</div>
			</div>

			{/* FAQ Section */}
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
							Common Questions
						</h2>
						<p className="text-muted-foreground text-xl">
							Quick answers to questions we hear most often.
						</p>
					</motion.div>

					<div className="space-y-6">
						{[
							{
								question: 'How quickly will I get a response?',
								answer: 'We aim to respond to all inquiries within 4 hours during business hours. For urgent technical issues, use our live chat for immediate assistance.'
							},
							{
								question: 'Do you offer phone support?',
								answer: 'Yes! Our phone support is available Monday through Friday, 9 AM to 6 PM EST. Call us at +1 (555) 123-4567.'
							},
							{
								question: 'Can I schedule a demo?',
								answer: 'Absolutely! Contact our sales team to schedule a personalized demo that shows how TenantFlow can work for your specific needs.'
							},
							{
								question:
									'What if I need help outside business hours?',
								answer: 'Our knowledge base and help center are available 24/7. For urgent issues, you can also submit a support ticket and we will prioritize it for first thing the next business day.'
							}
						].map((faq, index) => (
							<motion.div
								key={index}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{
									duration: 0.5,
									delay: index * 0.1
								}}
								viewport={{ once: true }}
							>
								<Card className="border-0 bg-white/80 backdrop-blur-sm">
									<CardContent className="p-6">
										<h3 className="text-foreground mb-3 font-semibold">
											{faq.question}
										</h3>
										<p className="text-muted-foreground leading-relaxed">
											{faq.answer}
										</p>
									</CardContent>
								</Card>
							</motion.div>
						))}
					</div>
				</div>
			</section>
		</div>
	)
}
