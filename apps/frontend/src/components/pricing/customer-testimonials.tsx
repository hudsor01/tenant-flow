import { Star, Quote } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface Testimonial {
	name: string
	title: string
	company: string
	quote: string
	rating: number
	avatar?: string
	plan: string
}

interface CustomerTestimonialsProps {
	className?: string
}

const testimonials: Testimonial[] = [
	{
		name: 'Sarah Johnson',
		title: 'Property Manager',
		company: 'Sunset Properties',
		quote: 'TenantFlow transformed how we manage our 25 rental properties. The automation features alone save us 10 hours per week, and our tenants love the easy-to-use portal.',
		rating: 5,
		plan: 'Growth'
	},
	{
		name: 'Michael Chen',
		title: 'Real Estate Investor',
		company: 'Chen Investment Group',
		quote: "As someone managing 45 units across multiple states, TenantFlow's centralized dashboard gives me complete visibility. The financial reporting is exactly what I needed.",
		rating: 5,
		plan: 'TenantFlow Max'
	},
	{
		name: 'Emily Rodriguez',
		title: 'Co-founder',
		company: 'Urban Living LLC',
		quote: 'We started with the free trial and quickly upgraded to Starter. The rent collection automation and maintenance tracking features are game-changers for our growing business.',
		rating: 5,
		plan: 'Starter'
	}
]

/**
 * Customer testimonials component
 * Shows social proof and success stories from real customers
 */
export function CustomerTestimonials({ className }: CustomerTestimonialsProps) {
	const renderStars = (rating: number) => {
		return Array.from({ length: 5 }, (_, i) => (
			<Star
				key={i}
				className={`h-4 w-4 ${
					i < rating
						? 'fill-current text-yellow-400'
						: 'text-gray-300'
				}`}
			/>
		))
	}

	return (
		<div className={`py-16 ${className || ''}`}>
			<div className="mx-auto max-w-6xl">
				{/* Header */}
				<div className="mb-12 text-center">
					<h2 className="mb-4 text-3xl font-bold text-gray-900">
						Trusted by Property Managers Everywhere
					</h2>
					<p className="mx-auto max-w-2xl text-lg text-gray-600">
						Join thousands of property managers who've streamlined
						their operations and grown their business with
						TenantFlow.
					</p>
				</div>

				{/* Stats */}
				<div className="mb-16 grid grid-cols-2 gap-8 md:grid-cols-4">
					<div className="text-center">
						<div className="text-primary mb-2 text-3xl font-bold">
							10,000+
						</div>
						<div className="text-sm text-gray-600">
							Properties Managed
						</div>
					</div>
					<div className="text-center">
						<div className="mb-2 text-3xl font-bold text-green-600">
							98%
						</div>
						<div className="text-sm text-gray-600">
							Customer Satisfaction
						</div>
					</div>
					<div className="text-center">
						<div className="mb-2 text-3xl font-bold text-purple-600">
							$2M+
						</div>
						<div className="text-sm text-gray-600">
							Rent Collected
						</div>
					</div>
					<div className="text-center">
						<div className="mb-2 text-3xl font-bold text-orange-600">
							50+
						</div>
						<div className="text-sm text-gray-600">
							Countries Served
						</div>
					</div>
				</div>

				{/* Testimonials grid */}
				<div className="grid gap-8 md:grid-cols-3">
					{testimonials.map((testimonial, index) => (
						<Card
							key={index}
							className="border-2 transition-shadow hover:shadow-lg"
						>
							<CardContent className="p-6">
								{/* Quote icon */}
								<div className="mb-4">
									<Quote className="text-primary h-8 w-8 opacity-50" />
								</div>

								{/* Rating */}
								<div className="mb-4 flex items-center">
									{renderStars(testimonial.rating)}
								</div>

								{/* Quote */}
								<blockquote className="mb-6 leading-relaxed text-gray-700">
									"{testimonial.quote}"
								</blockquote>

								{/* Customer info */}
								<div className="flex items-center justify-between">
									<div className="flex items-center space-x-3">
										<Avatar className="h-10 w-10">
											<AvatarImage
												src={testimonial.avatar}
												alt={testimonial.name}
											/>
											<AvatarFallback className="text-primary bg-blue-100">
												{testimonial.name
													.split(' ')
													.map(n => n[0])
													.join('')}
											</AvatarFallback>
										</Avatar>
										<div>
											<div className="text-sm font-semibold text-gray-900">
												{testimonial.name}
											</div>
											<div className="text-xs text-gray-600">
												{testimonial.title}
											</div>
											<div className="text-xs text-gray-500">
												{testimonial.company}
											</div>
										</div>
									</div>
									<div className="text-right">
										<div className="text-primary rounded bg-blue-50 px-2 py-1 text-xs font-medium">
											{testimonial.plan} Plan
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>

				{/* Call to action */}
				<div className="mt-12 text-center">
					<p className="mb-4 text-gray-600">
						Ready to join our growing community of successful
						property managers?
					</p>
					<div className="flex items-center justify-center gap-2 text-sm text-gray-500">
						<Star className="h-4 w-4 fill-current text-yellow-400" />
						<span>4.9/5 average rating from 500+ reviews</span>
					</div>
				</div>
			</div>
		</div>
	)
}
