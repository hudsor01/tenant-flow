'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { ContactFormRequest } from '@repo/shared'
import { Check, Mail, MapPin, Phone } from 'lucide-react'
import { useState } from 'react'

interface ContactFormProps {
	className?: string
}

export function ContactForm({ className = '' }: ContactFormProps) {
	const [formData, setFormData] = useState<ContactFormRequest>({
		name: '',
		email: '',
		subject: '',
		message: '',
		type: 'sales',
		company: '',
		phone: ''
	})
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [submitMessage, setSubmitMessage] = useState<string | null>(null)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsSubmitting(true)

		try {
			const response = await fetch('/api/contact', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formData)
			})

			const result = await response.json()

			if (response.ok) {
				setSubmitMessage(
					result.message ||
						'Thank you for contacting us. We will get back to you within 4 hours.'
				)
				setFormData({
					name: '',
					email: '',
					subject: '',
					message: '',
					type: 'sales',
					company: '',
					phone: ''
				})
			} else {
				throw new Error(result.error || 'Failed to submit form')
			}
		} catch {
			setSubmitMessage(
				'Sorry, there was an error submitting your message. Please try again.'
			)
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleInputChange = (
		field: keyof ContactFormRequest,
		value: string
	) => {
		setFormData(prev => ({ ...prev, [field]: value }))
	}

	if (submitMessage) {
		return (
			<section
				className={`min-h-screen lg:flex ${className}`}
				id="contact-form"
			>
				<div className="flex flex-col justify-center w-full lg:w-1/2 lg:px-12 xl:px-32 p-8">
					<div className="max-w-md mx-auto w-full">
						<div className="p-8 bg-card rounded-2xl border border-border shadow-lg">
							<div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
								<Check className="w-8 h-8 text-primary" />
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
				</div>
				<div className="hidden lg:block lg:w-1/2 relative">
					<div
						className="absolute inset-0 bg-cover bg-center"
						style={{
							backgroundImage: `url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2073&q=80')`
						}}
					>
						<div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/70" />
					</div>
				</div>
			</section>
		)
	}

	return (
		<section className={`min-h-screen lg:flex ${className}`} id="contact-form">
			{/* Left side - Contact Info with Background */}
			<div className="relative flex flex-col justify-center w-full p-8 lg:w-1/2 lg:px-12 xl:px-32">
				{/* Background Image with Overlay */}
				<div
					className="absolute inset-0 bg-cover bg-center"
					style={{
						backgroundImage: `url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2073&q=80')`
					}}
				>
					<div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/70" />
				</div>

				{/* Content */}
				<div className="relative z-10">
					<h1 className="text-3xl font-bold text-white lg:text-4xl">
						Transform Your Property Management
					</h1>

					<p className="mt-4 text-white/90 text-lg">
						Join 10,000+ property managers who've increased NOI by 40% with our
						enterprise-grade automation platform.
					</p>

					<div className="mt-8 space-y-6">
						<div className="flex items-start">
							<MapPin className="w-6 h-6 text-white/80 mt-1 flex-shrink-0" />
							<div className="ml-3">
								<p className="text-white font-semibold">Headquarters</p>
								<p className="text-white/80">
									123 Market Street, Suite 500
									<br />
									San Francisco, CA 94103
								</p>
							</div>
						</div>

						<div className="flex items-start">
							<Phone className="w-6 h-6 text-white/80 mt-1 flex-shrink-0" />
							<div className="ml-3">
								<p className="text-white font-semibold">Sales Hotline</p>
								<p className="text-white/80">+1 (888) 555-FLOW</p>
								<p className="text-white/70 text-sm">Mon-Fri, 9AM-6PM PST</p>
							</div>
						</div>

						<div className="flex items-start">
							<Mail className="w-6 h-6 text-white/80 mt-1 flex-shrink-0" />
							<div className="ml-3">
								<p className="text-white font-semibold">Email Us</p>
								<p className="text-white/80">sales@tenantflow.app</p>
								<p className="text-white/70 text-sm">Response within 4 hours</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Right side - Contact Form */}
			<div className="flex flex-col justify-center w-full p-8 lg:w-1/2 lg:px-12 xl:px-24 bg-background">
				<div className="max-w-lg mx-auto w-full">
					<h2 className="text-2xl font-bold text-foreground mb-2">
						Get Your Custom ROI Report
					</h2>
					<p className="text-muted-foreground mb-8">
						Tell us about your portfolio and we'll show you exactly how much
						TenantFlow can save you.
					</p>

					<form onSubmit={handleSubmit} className="space-y-6">
						<div className="grid md:grid-cols-2 gap-4">
							<div>
								<Label htmlFor="name" className="text-foreground">
									Full Name *
								</Label>
								<Input
									id="name"
									type="text"
									value={formData.name}
									onChange={e => handleInputChange('name', e.target.value)}
									placeholder="John Smith"
									required
									className="mt-2 bg-background border-input"
								/>
							</div>

							<div>
								<Label htmlFor="email" className="text-foreground">
									Email Address *
								</Label>
								<Input
									id="email"
									type="email"
									value={formData.email}
									onChange={e => handleInputChange('email', e.target.value)}
									placeholder="john@propertyco.com"
									required
									className="mt-2 bg-background border-input"
								/>
							</div>
						</div>

						<div className="grid md:grid-cols-2 gap-4">
							<div>
								<Label htmlFor="company" className="text-foreground">
									Company Name
								</Label>
								<Input
									id="company"
									type="text"
									value={formData.company || ''}
									onChange={e => handleInputChange('company', e.target.value)}
									placeholder="Property Management Co"
									className="mt-2 bg-background border-input"
								/>
							</div>

							<div>
								<Label htmlFor="phone" className="text-foreground">
									Phone Number
								</Label>
								<Input
									id="phone"
									type="tel"
									value={formData.phone || ''}
									onChange={e => handleInputChange('phone', e.target.value)}
									placeholder="+1 (555) 123-4567"
									className="mt-2 bg-background border-input"
								/>
							</div>
						</div>

						<div>
							<Label htmlFor="subject" className="text-foreground">
								Portfolio Size *
							</Label>
							<Select
								value={formData.subject}
								onValueChange={value => handleInputChange('subject', value)}
								required
							>
								<SelectTrigger className="mt-2 bg-background border-input">
									<SelectValue placeholder="How many properties do you manage?" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="1-5 properties">
										1-5 properties (Starter)
									</SelectItem>
									<SelectItem value="6-20 properties">
										6-20 properties (Growth)
									</SelectItem>
									<SelectItem value="21-100 properties">
										21-100 properties (Scale)
									</SelectItem>
									<SelectItem value="100+ properties">
										100+ properties (Enterprise)
									</SelectItem>
									<SelectItem value="Just exploring">
										Just exploring options
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label htmlFor="type" className="text-foreground">
								How did you hear about us?
							</Label>
							<Select
								value={formData.type}
								onValueChange={value => handleInputChange('type', value)}
							>
								<SelectTrigger className="mt-2 bg-background border-input">
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
						</div>

						<div>
							<Label htmlFor="message" className="text-foreground">
								Tell us about your challenges *
							</Label>
							<Textarea
								id="message"
								value={formData.message}
								onChange={e => handleInputChange('message', e.target.value)}
								placeholder="What are your biggest property management challenges? What features are most important to you?"
								required
								rows={5}
								className="mt-2 resize-none bg-background border-input"
							/>
						</div>

						<Button
							type="submit"
							disabled={isSubmitting}
							size="lg"
							className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
						>
							{isSubmitting ? 'Sending...' : 'Get My Custom ROI Report'}
						</Button>

						<p className="text-center text-sm text-muted-foreground">
							Free analysis • No credit card required • Results in 24 hours
						</p>
					</form>
				</div>
			</div>
		</section>
	)
}
