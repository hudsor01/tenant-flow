'use client'

import { BlurFade } from '@/components/magicui/blur-fade'
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
import { containerClasses } from '@/lib/design-system'
import type { ContactFormRequest } from '@repo/shared'
import { TYPOGRAPHY_SCALE } from '@repo/shared'
import { ArrowRight, Check } from 'lucide-react'
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
			<section className={`py-24 bg-muted/20 ${className}`} id="contact-form">
				<div className={containerClasses('lg')}>
					<BlurFade delay={0.1} inView>
						<div className="text-center">
							<div className="mx-auto max-w-md p-8 bg-card rounded-2xl border border-border shadow-lg">
								<div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
									<Check className="w-8 h-8 text-primary" />
								</div>
								<h2
									className="text-foreground font-bold mb-4"
									style={TYPOGRAPHY_SCALE['heading-lg']}
								>
									Thank You!
								</h2>
								<p className="text-muted-foreground mb-6">{submitMessage}</p>
								<Button
									onClick={() => setSubmitMessage(null)}
									variant="outline"
									className="w-full"
								>
									Send Another Message
								</Button>
							</div>
						</div>
					</BlurFade>
				</div>
			</section>
		)
	}

	return (
		<section className={`py-24 bg-muted/20 ${className}`} id="contact-form">
			<div className={containerClasses('lg')}>
				<BlurFade delay={0.1} inView>
					<div className="text-center mb-12 space-y-4">
						<h2
							className="text-foreground font-bold tracking-tight"
							style={TYPOGRAPHY_SCALE['display-lg']}
						>
							Get your custom ROI projection in 24 hours
						</h2>
						<p
							className="text-muted-foreground leading-relaxed max-w-2xl mx-auto"
							style={TYPOGRAPHY_SCALE['body-lg']}
						>
							Tell us about your portfolio and we'll show you exactly how much
							TenantFlow can save you. Most property managers see significant
							cost reductions within 90 days.
						</p>
					</div>

					<div className="bg-card rounded-2xl border border-border shadow-lg p-8">
						<form onSubmit={handleSubmit} className="space-y-6">
							<div className="grid md:grid-cols-2 gap-6">
								<div className="space-y-2">
									<Label htmlFor="name">Full Name *</Label>
									<Input
										id="name"
										type="text"
										value={formData.name}
										onChange={e => handleInputChange('name', e.target.value)}
										placeholder="Enter your full name"
										required
										className="w-full"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="email">Email *</Label>
									<Input
										id="email"
										type="email"
										value={formData.email}
										onChange={e => handleInputChange('email', e.target.value)}
										placeholder="Enter your email"
										required
										className="w-full"
									/>
								</div>
							</div>

							<div className="grid md:grid-cols-2 gap-6">
								<div className="space-y-2">
									<Label htmlFor="company">Company</Label>
									<Input
										id="company"
										type="text"
										value={formData.company || ''}
										onChange={e => handleInputChange('company', e.target.value)}
										placeholder="Enter your company name"
										className="w-full"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="phone">Phone</Label>
									<Input
										id="phone"
										type="tel"
										value={formData.phone || ''}
										onChange={e => handleInputChange('phone', e.target.value)}
										placeholder="Enter your phone number"
										className="w-full"
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="subject">Portfolio Size *</Label>
								<Select
									value={formData.subject}
									onValueChange={value => handleInputChange('subject', value)}
									required
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="How many properties do you manage?" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="1-5 properties (Starter Plan)">
											1-5 properties (Starter Plan)
										</SelectItem>
										<SelectItem value="6-20 properties (Growth Plan)">
											6-20 properties (Growth Plan)
										</SelectItem>
										<SelectItem value="21-100 properties (Scale Plan)">
											21-100 properties (Scale Plan)
										</SelectItem>
										<SelectItem value="100+ properties (Enterprise)">
											100+ properties (Enterprise)
										</SelectItem>
										<SelectItem value="I want to see a demo first">
											I want to see a demo first
										</SelectItem>
										<SelectItem value="Other inquiry">Other inquiry</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="message">How can we help? *</Label>
								<Textarea
									id="message"
									value={formData.message}
									onChange={e => handleInputChange('message', e.target.value)}
									placeholder="Tell us more about your property management challenges and goals..."
									required
									rows={6}
									className="w-full resize-none"
								/>
							</div>

							<div className="text-center">
								<Button
									type="submit"
									disabled={isSubmitting}
									size="lg"
									className="px-8 py-3 text-base font-semibold group"
								>
									{isSubmitting ? 'Sending...' : 'Get My Custom ROI Report'}
									{!isSubmitting && (
										<ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
									)}
								</Button>
								<p
									className="text-muted-foreground mt-3"
									style={TYPOGRAPHY_SCALE['body-sm']}
								>
									Free analysis • No commitment required • Results in 24 hours
								</p>
							</div>
						</form>
					</div>
				</BlurFade>
			</div>
		</section>
	)
}
