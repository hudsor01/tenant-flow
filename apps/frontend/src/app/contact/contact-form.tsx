'use client'

import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput
} from '@/components/ui/input-group'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useFormWithProgress } from '@/hooks/use-form-progress'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { ContactFormRequest } from '@repo/shared/types/domain'
import { Check, Mail, MapPin, Phone } from 'lucide-react'
import { useState } from 'react'

const logger = createLogger({ component: 'ContactForm' })

interface ContactFormProps {
	className?: string
}

export function ContactForm({ className = '' }: ContactFormProps) {
	const [submitMessage, setSubmitMessage] = useState<string | null>(null)
	const [errors, setErrors] = useState<Record<string, string>>({})

	// Validation function - must be declared before useFormWithProgress
	const validateForm = (data: ContactFormRequest): boolean => {
		const newErrors: Record<string, string> = {}

		// Name validation
		if (!data.name.trim()) {
			newErrors.name = 'Name is required'
		} else if (data.name.trim().length < 2) {
			newErrors.name = 'Name must be at least 2 characters'
		}

		// Email validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		if (!data.email.trim()) {
			newErrors.email = 'Email is required'
		} else if (!emailRegex.test(data.email)) {
			newErrors.email = 'Please enter a valid email address'
		}

		// Phone validation (optional but must be valid if provided)
		if (data.phone && data.phone.trim()) {
			const phoneRegex = /^[\d\s()+-]+$/
			if (!phoneRegex.test(data.phone)) {
				newErrors.phone = 'Please enter a valid phone number'
			}
		}

		// Subject validation
		if (!data.subject) {
			newErrors.subject = "Please select what you're interested in"
		}

		// Message validation
		if (!data.message.trim()) {
			newErrors.message = 'Message is required'
		} else if (data.message.trim().length < 10) {
			newErrors.message = 'Message must be at least 10 characters'
		}

		setErrors(newErrors)
		return Object.keys(newErrors).length === 0
	}

	// Initialize form with progress persistence
	const {
		formData,
		updateField,
		handleSubmit: handleFormSubmit,
		isSubmitting,
		submitError,
		isHydrated
	} = useFormWithProgress<ContactFormRequest>(
		'contact',
		async (data: ContactFormRequest) => {
			if (!validateForm(data)) {
				throw new Error('Please check your input')
			}

			// Call backend directly instead of Next.js proxy
			const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4600'
			const response = await fetch(`${apiBaseUrl}/api/v1/contact`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(data)
			})

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || 'Failed to submit form')
			}

			setSubmitMessage(
				result.message ||
					'Thank you for reaching out! Our team will review your message and get back to you within 4 hours.'
			)
		},
		{
			name: '',
			email: '',
			subject: '',
			message: '',
			type: 'sales',
			company: '',
			phone: ''
		}
	)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setErrors({})

		try {
			await handleFormSubmit(formData)
		} catch (error) {
			// Error handling is managed by useFormWithProgress
			logger.error('Form submission error', {
				action: 'contact_form_submit_failed',
				metadata: {
					hasName: !!formData.name,
					hasEmail: !!formData.email,
					hasSubject: !!formData.subject,
					error: error instanceof Error ? error.message : String(error)
				}
			})
		}
	}

	const handleInputChange = (
		field: keyof ContactFormRequest,
		value: string
	) => {
		updateField(field, value)
	}

	if (submitMessage) {
		return (
			<section
				className={`min-h-screen flex items-center justify-center bg-background ${className}`}
				id="contact-form"
			>
				<div className="max-w-md w-full p-8">
					<div className="p-8 bg-card rounded-2xl border border-border shadow-lg">
						<div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
							<Check className="size-8 text-primary" />
						</div>
						<h2 className="text-2xl font-bold text-foreground text-center mb-4">
							Thank You!
						</h2>
						<p className="text-muted-foreground text-center mb-6">
							{submitMessage}
						</p>
						<Button
							onClick={() => setSubmitMessage(null)}
							variant="outline"
							className="w-full"
						>
							Send Another Message
						</Button>
					</div>
				</div>
			</section>
		)
	}

	return (
		<section
			className={`relative min-h-screen lg:flex bg-background ${className}`}
			id="contact-form"
		>
			{/* Left side - Contact Info with Image Background */}
			<div className="relative flex flex-col justify-center w-full p-8 lg:w-1/2 lg:px-12 xl:px-32 overflow-hidden">
				{/* Background Image - Warm modern residential building */}
				<div
					className="absolute inset-0 bg-cover bg-center"
					style={{backgroundImage: "url('https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop')"}}
				/>

				{/* Subtle gradient overlay for text contrast */}
				<div className="absolute inset-0 bg-gradient-to-br from-background/30 via-transparent to-background/20" />

				{/* Glassmorphism Container */}
				<div className="relative z-10 p-8 rounded-2xl backdrop-blur-lg bg-background/60 dark:bg-card/60 border border-border/20 shadow-2xl">
					<h1 className="text-3xl font-bold text-foreground lg:text-4xl">
						Let&apos;s Talk About Your Properties
					</h1>

					<p className="mt-4 text-muted-foreground text-lg">
						Whether you manage 5 or 500 units, we&apos;re here to help streamline
						your operations and save you time every day.
					</p>

					<div className="mt-8 space-y-6">
						<div className="flex items-start">
							<div className="p-2 rounded-lg bg-primary/10 backdrop-blur-sm">
								<MapPin className="size-6 text-primary" />
							</div>
							<div className="ml-3">
								<p className="text-foreground font-semibold">Headquarters</p>
								<p className="text-muted-foreground">
									123 Market Street, Suite 500
									<br />
									San Francisco, CA 94103
								</p>
							</div>
						</div>

						<div className="flex items-start">
							<div className="p-2 rounded-lg bg-primary/10 backdrop-blur-sm">
								<Phone className="size-6 text-primary" />
							</div>
							<div className="ml-3">
								<p className="text-foreground font-semibold">Sales Hotline</p>
								<p className="text-muted-foreground">+1 (888) 555-FLOW</p>
								<p className="text-muted-foreground text-sm">
									Mon-Fri, 9AM-6PM PST
								</p>
							</div>
						</div>

						<div className="flex items-start">
							<div className="p-2 rounded-lg bg-primary/10 backdrop-blur-sm">
								<Mail className="size-6 text-primary" />
							</div>
							<div className="ml-3">
								<p className="text-foreground font-semibold">Email Us</p>
								<p className="text-muted-foreground">sales@tenantflow.app</p>
								<p className="text-muted-foreground text-sm">
									Response within 4 hours
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Right side - Contact Form */}
			<div className="flex flex-col justify-center w-full p-8 lg:w-1/2 lg:px-16 xl:px-24 bg-background border-l border-border">
				<div className="max-w-xl mx-auto w-full">
					<h2 className="text-2xl font-bold text-foreground mb-2">
						Get in Touch
					</h2>
					<p className="text-muted-foreground mb-8">
						Have questions about TenantFlow? Want to see a demo? We&apos;d love to
						hear from you. Our team typically responds within 4 hours.
					</p>

					{/* Progress indicator */}
					{!isHydrated && (
						<div className="mb-4 p-3 bg-muted rounded-md">
							<p className="text-sm text-muted-foreground">
								Restoring your progress...
							</p>
						</div>
					)}

					{/* Error display */}
					{submitError && (
						<div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
							<p className="text-sm text-destructive">{submitError}</p>
						</div>
					)}

					<form onSubmit={handleSubmit} className="space-y-6">
						<div className="grid md:grid-cols-2 gap-4">
							<Field>
								<FieldLabel htmlFor="name">Full Name *</FieldLabel>
								<InputGroup>
									<InputGroupAddon align="inline-start">
										<Mail className="size-4" />
									</InputGroupAddon>
									<InputGroupInput
										id="name"
										name="name"
										type="text"
										autoComplete="name"
										value={formData.name}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
											handleInputChange('name', e.target.value)
										}
										placeholder="John Smith"
										required
										className={errors.name ? 'border-destructive' : ''}
									/>
								</InputGroup>
								{errors.name && <FieldError>{errors.name}</FieldError>}
							</Field>

							<Field>
								<FieldLabel htmlFor="email">Email Address *</FieldLabel>
								<InputGroup>
									<InputGroupAddon align="inline-start">
										<Mail className="size-4" />
									</InputGroupAddon>
									<InputGroupInput
										id="email"
										name="email"
										type="email"
										autoComplete="email"
										value={formData.email}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
											handleInputChange('email', e.target.value)
										}
										placeholder="john@propertyco.com"
										required
										className={errors.email ? 'border-destructive' : ''}
									/>
								</InputGroup>
								{errors.email && <FieldError>{errors.email}</FieldError>}
							</Field>
						</div>

						<div className="grid md:grid-cols-2 gap-4">
							<Field>
								<FieldLabel htmlFor="company">Company Name</FieldLabel>
								<Input
									id="company"
									name="organization"
									type="text"
									autoComplete="organization"
									value={formData.company || ''}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										handleInputChange('company', e.target.value)
									}
									placeholder="Property Management Co"
								/>
							</Field>

							<Field>
								<FieldLabel htmlFor="phone">Phone Number</FieldLabel>
								<InputGroup>
									<InputGroupAddon align="inline-start">
										<Phone className="size-4" />
									</InputGroupAddon>
									<InputGroupInput
										id="phone"
										name="tel"
										type="tel"
										autoComplete="tel"
										value={formData.phone || ''}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
											handleInputChange('phone', e.target.value)
										}
										placeholder="+1 (555) 123-4567"
										className={errors.phone ? 'border-destructive' : ''}
									/>
								</InputGroup>
								{errors.phone && <FieldError>{errors.phone}</FieldError>}
							</Field>
						</div>

						<Field>
							<FieldLabel htmlFor="subject">I&apos;m interested in... *</FieldLabel>
							<Select
								name="subject"
								value={formData.subject}
								onValueChange={(value: string) =>
									handleInputChange('subject', value)
								}
								required
							>
								<SelectTrigger
									id="subject"
									className={errors.subject ? 'border-destructive' : ''}
								>
									<SelectValue placeholder="What brings you to TenantFlow?" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="Product Demo">
										Scheduling a product demo
									</SelectItem>
									<SelectItem value="Pricing Information">
										Learning about pricing plans
									</SelectItem>
									<SelectItem value="Technical Support">
										Getting technical support
									</SelectItem>
									<SelectItem value="Partnership">
										Partnership opportunities
									</SelectItem>
									<SelectItem value="General Question">
										General questions about TenantFlow
									</SelectItem>
								</SelectContent>
							</Select>
							{errors.subject && <FieldError>{errors.subject}</FieldError>}
						</Field>

						<Field>
							<FieldLabel htmlFor="type">How did you hear about us?</FieldLabel>
							<Select
								name="referralSource"
								value={formData.type}
								onValueChange={(value: string) =>
									handleInputChange('type', value)
								}
							>
								<SelectTrigger id="type">
									<SelectValue placeholder="Select an option" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="search">Google Search</SelectItem>
									<SelectItem value="social">Social Media</SelectItem>
									<SelectItem value="referral">Referral</SelectItem>
									<SelectItem value="sales">Sales Outreach</SelectItem>
									<SelectItem value="conference">Conference/Event</SelectItem>
									<SelectItem value="other">Other</SelectItem>
								</SelectContent>
							</Select>
						</Field>

						<Field>
							<FieldLabel htmlFor="message">How can we help? *</FieldLabel>
							<Textarea
								id="message"
								name="message"
								autoComplete="off"
								value={formData.message}
								onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
									handleInputChange('message', e.target.value)
								}
								placeholder="Tell us about your property portfolio, current challenges, or any specific questions you have about TenantFlow..."
								required
								rows={5}
								className={`resize-none ${errors.message ? 'border-destructive' : ''}`}
							/>
							{errors.message && <FieldError>{errors.message}</FieldError>}
						</Field>

						<Button
							type="submit"
							disabled={isSubmitting}
							size="lg"
							className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
						>
							{isSubmitting ? 'Sending...' : 'Send Message'}
						</Button>

						<p className="text-center text-sm text-muted-foreground">
							We typically respond within 4 hours during business hours
						</p>
					</form>
				</div>
			</div>
		</section>
	)
}
