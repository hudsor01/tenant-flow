'use client'

import { Button } from '#components/ui/button'
import { useFormWithProgress } from '#hooks/use-form-progress'
import { createLogger } from '#lib/frontend-logger.js'
import type { ContactFormRequest } from '#types/domain'
import { Check, Mail, MapPin, Phone } from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { ContactFormFields } from './contact-form-fields'

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

		if (!data.name.trim()) {
			newErrors.name = 'Name is required'
		} else if (data.name.trim().length < 2) {
			newErrors.name = 'Name must be at least 2 characters'
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		if (!data.email.trim()) {
			newErrors.email = 'Email is required'
		} else if (!emailRegex.test(data.email)) {
			newErrors.email = 'Please enter a valid email address'
		}

		if (data.phone && data.phone.trim()) {
			const phoneRegex = /^[\d\s()+-]+$/
			if (!phoneRegex.test(data.phone)) {
				newErrors.phone = 'Please enter a valid phone number'
			}
		}

		if (!data.subject) {
			newErrors.subject = "Please select what you're interested in"
		}

		if (!data.message.trim()) {
			newErrors.message = 'Message is required'
		} else if (data.message.trim().length < 10) {
			newErrors.message = 'Message must be at least 10 characters'
		}

		setErrors(newErrors)
		return Object.keys(newErrors).length === 0
	}

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

			logger.info('Contact form submitted', {
				action: 'contact_form_submit',
				metadata: { email: data.email, subject: data.subject }
			})

			setSubmitMessage(
				"Thank you for reaching out! We've received your message and will get back to you within 4 hours during business hours."
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

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault()
		setErrors({})

		try {
			await handleFormSubmit(formData)
		} catch (error) {
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
				className={`min-h-screen flex-center bg-background ${className}`}
				id="contact-form"
			>
				<div className="max-w-md w-full p-8">
					<div className="p-8 bg-card rounded-2xl border border-border shadow-lg">
						<div className="size-16 rounded-full bg-primary/10 flex-center mx-auto mb-4">
							<Check className="size-8 text-primary" />
						</div>
						<h2 className="typography-h3 text-foreground text-center mb-4">
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
				<div
					className="absolute inset-0 bg-cover bg-center"
					style={{
						backgroundImage:
							"url('https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop')"
					}}
				/>
				<div className="absolute inset-0 bg-linear-to-br from-background/30 via-transparent to-background/20" />

				<div className="relative z-10 p-8 rounded-2xl backdrop-blur-lg bg-background/60 dark:bg-card/60 border border-border/20 shadow-2xl">
					<h1 className="typography-h2 text-foreground lg:text-4xl">
						Let&apos;s Talk About Your Properties
					</h1>
					<p className="mt-4 text-muted-foreground text-lg">
						Whether you manage 5 or 500 units, we&apos;re here to help
						streamline your operations and save you time every day.
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
					<h2 className="typography-h3 text-foreground mb-2">Get in Touch</h2>
					<p className="text-muted-foreground mb-8">
						Have questions about TenantFlow? Want to see a demo? We&apos;d love
						to hear from you. Our team typically responds within 4 hours.
					</p>

					{!isHydrated && (
						<div className="mb-4 p-3 bg-muted rounded-md">
							<p className="text-muted-foreground">Restoring your progress...</p>
						</div>
					)}

					{submitError && (
						<div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
							<p className="text-sm text-destructive">{submitError}</p>
						</div>
					)}

					<form onSubmit={handleSubmit} className="space-y-6">
						<ContactFormFields
							formData={formData}
							errors={errors}
							onInputChange={handleInputChange}
						/>

						<Button
							type="submit"
							disabled={isSubmitting}
							size="lg"
							className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
						>
							{isSubmitting ? 'Sending...' : 'Send Message'}
						</Button>

						<p className="text-center text-muted-foreground">
							We typically respond within 4 hours during business hours
						</p>
					</form>
				</div>
			</div>
		</section>
	)
}
