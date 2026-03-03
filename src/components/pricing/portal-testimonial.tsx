import { Star, Users } from 'lucide-react'

export interface TestimonialData {
	text: string
	author: string
	company: string
	rating: number
}

interface PortalTestimonialProps {
	testimonial: TestimonialData
}

export function PortalTestimonial({ testimonial }: PortalTestimonialProps) {
	return (
		<div className="bg-primary/8 rounded-2xl p-6 border-2 border-primary/20 max-w-2xl mx-auto">
			<div className="flex-center gap-1 mb-4">
				{[...Array(testimonial.rating)].map((_, i) => (
					<Star key={i} className="size-4 fill-accent text-accent" />
				))}
				<span className="ml-2 text-sm font-bold text-primary">
					{testimonial.rating}/5
				</span>
			</div>

			<blockquote className="text-foreground text-center leading-relaxed font-medium">
				&quot;{testimonial.text}&quot;
			</blockquote>

			<div className="flex-center gap-3 mt-4 pt-4 border-t border-primary/10">
				<div className="size-10 bg-primary/15 rounded-full flex-center">
					<Users className="size-5 text-primary" />
				</div>
				<cite className="text-sm font-bold text-foreground not-italic">
					{testimonial.author}
					<span className="text-muted-foreground font-medium block">
						{testimonial.company}
					</span>
				</cite>
			</div>
		</div>
	)
}
