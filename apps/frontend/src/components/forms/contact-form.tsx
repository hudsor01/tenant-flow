'use client'

import { useState, useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

interface ContactFormProps {
	defaultType?: 'demo' | 'support' | 'sales' | 'general'
	source?: string
}

interface FormState {
	success: boolean
	error?: string
}

// Simulated contact form action (would integrate with backend)
async function submitContactForm(
	prevState: FormState,
	formData: FormData
): Promise<FormState> {
	const _data = {
		name: formData.get('name') as string,
		email: formData.get('email') as string,
		company: formData.get('company') as string,
		phone: formData.get('phone') as string,
		inquiryType: formData.get('inquiryType') as string,
		message: formData.get('message') as string,
		source: formData.get('source') as string
	}

	// Simulate API call delay
	await new Promise(resolve => setTimeout(resolve, 1500))

	// Simulate success (in real app, would call API)
	// TODO: Replace with actual API call using _data
	// await apiClient.post('/contact', _data)
	toast.success("Thank you! We'll get back to you within 24 hours.")

	return { success: true }
}

export function ContactForm({
	defaultType = 'general',
	source
}: ContactFormProps) {
	const [state, formAction, isPending] = useActionState(submitContactForm, {
		success: false
	})
	const [inquiryType, setInquiryType] = useState(defaultType)

	const inquiryTypes = [
		{
			value: 'demo',
			label: 'Schedule a Demo',
			icon: () => <i className="i-lucide-calendar inline-block" />,
			description: 'See TenantFlow in action'
		},
		{
			value: 'sales',
			label: 'Sales Inquiry',
			icon: () => <i className="i-lucide-phone inline-block" />,
			description: 'Learn about pricing & features'
		},
		{
			value: 'support',
			label: 'Technical Support',
			icon: () => <i className="i-lucide-mail inline-block" />,
			description: 'Get help with your account'
		},
		{
			value: 'general',
			label: 'General Question',
			icon: () => <i className="i-lucide-check-circle inline-block" />,
			description: 'Other inquiries'
		}
	]

	return (
		<Card className="mx-auto w-full max-w-2xl">
			<CardHeader>
				<CardTitle className="text-2xl">
					{defaultType === 'demo'
						? 'Schedule Your Demo'
						: 'Get in Touch'}
				</CardTitle>
				<CardDescription>
					{defaultType === 'demo'
						? "Fill out the form below and we'll contact you to schedule a personalized demo."
						: "We'll get back to you within 24 hours."}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<AnimatePresence mode="wait">
					{state.success ? (
						<motion.div
							key="success"
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							className="py-8 text-center"
						>
							<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
								<i className="i-lucide-checkcircle inline-block h-8 w-8 text-green-600"  />
							</div>
							<h3 className="mb-2 text-xl font-semibold">
								Message Sent!
							</h3>
							<p className="text-muted-foreground mb-4">
								Thank you for contacting us. We'll get back to
								you soon.
							</p>
							<Button
								variant="outline"
								onClick={() => window.location.reload()}
							>
								Send Another Message
							</Button>
						</motion.div>
					) : (
						<motion.form
							key="form"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							action={formAction}
							className="space-y-6"
						>
							<input
								type="hidden"
								name="source"
								value={source || 'contact-page'}
							/>

							{/* Inquiry Type */}
							<div className="space-y-3">
								<Label className="text-sm font-medium">
									What can we help you with? *
								</Label>
								<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
									{inquiryTypes.map(type => {
										const IconComponent = type.icon
										return (
											<button
												key={type.value}
												type="button"
												onClick={() =>
													setInquiryType(
														type.value as
															| 'demo'
															| 'support'
															| 'sales'
															| 'general'
													)
												}
												className={`rounded-lg border-2 p-4 text-left transition-all duration-200 ${
													inquiryType === type.value
														? 'border-primary bg-primary/5'
														: 'border-input hover:border-primary/50'
												}`}
											>
												<div className="flex items-start space-x-3">
													<div
														className={`mt-0.5 h-5 w-5 ${
															inquiryType ===
															type.value
																? 'text-primary'
																: 'text-muted-foreground'
														}`}
													>
														<IconComponent />
													</div>
													<div>
														<div className="text-sm font-medium">
															{type.label}
														</div>
														<div className="text-muted-foreground mt-1 text-xs">
															{type.description}
														</div>
													</div>
												</div>
											</button>
										)
									})}
								</div>
								<input
									type="hidden"
									name="inquiryType"
									value={inquiryType}
								/>
							</div>

							{/* Basic Information */}
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="name">Full Name *</Label>
									<Input
										id="name"
										name="name"
										placeholder="Your full name"
										required
										disabled={isPending}
										className="h-11"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="email">
										Email Address *
									</Label>
									<Input
										id="email"
										name="email"
										type="email"
										placeholder="your@email.com"
										required
										disabled={isPending}
										className="h-11"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="company">Company</Label>
									<Input
										id="company"
										name="company"
										placeholder="Your company name"
										disabled={isPending}
										className="h-11"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="phone">Phone Number</Label>
									<Input
										id="phone"
										name="phone"
										type="tel"
										placeholder="+1 (555) 123-4567"
										disabled={isPending}
										className="h-11"
									/>
								</div>
							</div>

							{/* Message */}
							<div className="space-y-2">
								<Label htmlFor="message">
									Message *
									{inquiryType === 'demo' && (
										<span className="text-muted-foreground ml-2 text-sm">
											(Tell us about your property
											portfolio)
										</span>
									)}
								</Label>
								<Textarea
									id="message"
									name="message"
									placeholder={
										inquiryType === 'demo'
											? "Tell us about your property portfolio, number of units, and what you'd like to see in the demo..."
											: 'How can we help you?'
									}
									rows={4}
									required
									disabled={isPending}
									className="resize-none"
								/>
							</div>

							{state.error && (
								<div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
									{state.error}
								</div>
							)}

							{/* Submit Button */}
							<Button
								type="submit"
								size="lg"
								className="h-12 w-full text-base font-semibold"
								disabled={isPending}
							>
								{isPending ? (
									<>
										<div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
										Sending...
									</>
								) : (
									<>
										{inquiryType === 'demo'
											? 'Request Demo'
											: 'Send Message'}
										<i className="i-lucide-send inline-block ml-2 h-4 w-4"  />
									</>
								)}
							</Button>

							{/* Trust Indicators */}
							<div className="border-t pt-4">
								<div className="text-muted-foreground flex flex-wrap items-center justify-center gap-4 text-xs">
									<div className="flex items-center gap-1">
										<i className="i-lucide-checkcircle inline-block h-3 w-3"  />
										<span>No spam, ever</span>
									</div>
									<div className="flex items-center gap-1">
										<i className="i-lucide-checkcircle inline-block h-3 w-3"  />
										<span>24-hour response</span>
									</div>
									<div className="flex items-center gap-1">
										<i className="i-lucide-checkcircle inline-block h-3 w-3"  />
										<span>Free consultation</span>
									</div>
								</div>
							</div>
						</motion.form>
					)}
				</AnimatePresence>
			</CardContent>
		</Card>
	)
}
