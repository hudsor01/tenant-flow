'use client'

import { animated, config, useSpring, useTransition } from '@react-spring/web'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

interface FaqItem {
	question: string
	answer: string
}

interface FaqsAccordionProps {
	title?: string
	description?: string
	category?: string
	faqs: FaqItem[]
	defaultOpenIndex?: number | null
}

export function FaqsAccordion({
	title,
	description,
	category,
	faqs,
	defaultOpenIndex = null
}: FaqsAccordionProps) {
	const [openIndex, setOpenIndex] = useState<number | null>(defaultOpenIndex)

	const toggleAccordion = (index: number) => {
		setOpenIndex(openIndex === index ? null : index)
	}

	return (
		<section className="mb-16">
			{/* Category Header - Only show if title/description/category provided */}
			{(title || description || category) && (
				<div className="text-center mb-12">
					{category && (
						<h2 className="text-3xl font-bold mb-8 text-foreground">
							{category}
						</h2>
					)}
					{title && !category && (
						<h2 className="text-foreground mb-4 text-3xl font-bold lg:text-4xl">
							{title}
						</h2>
					)}
					{description && (
						<p className="text-muted-foreground text-lg max-w-2xl mx-auto">
							{description}
						</p>
					)}
				</div>
			)}

			{/* FAQ Items */}
			<div className="space-y-4">
				{faqs.map((faq, index) => {
					const isOpen = openIndex === index

					return (
						<FaqItem
							key={index}
							faq={faq}
							isOpen={isOpen}
							onToggle={() => toggleAccordion(index)}
						/>
					)
				})}
			</div>
		</section>
	)
}

interface FaqItemProps {
	faq: FaqItem
	isOpen: boolean
	onToggle: () => void
}

function FaqItem({ faq, isOpen, onToggle }: FaqItemProps) {
	// Rotation animation for chevron
	const chevronAnimation = useSpring({
		transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
		config: config.default
	})

	// Height animation for answer
	const contentTransitions = useTransition(isOpen, {
		from: { height: 0, opacity: 0 },
		enter: { height: 'auto', opacity: 1 },
		leave: { height: 0, opacity: 0 },
		config: config.default
	})

	return (
		<div className="group overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg">
			<button
				onClick={onToggle}
				className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-muted/50 focus:outline-none focus:bg-muted/50"
			>
				<h3 className="text-foreground text-lg font-semibold pr-4">
					{faq.question}
				</h3>
				<animated.div style={chevronAnimation} className="flex-shrink-0">
					<ChevronDown className="h-5 w-5 text-muted-foreground" />
				</animated.div>
			</button>

			{contentTransitions((style, item) =>
				item ? (
					<animated.div style={style} className="overflow-hidden">
						<div className="px-6 pb-6">
							<div className="border-t border-border pt-4">
								<p className="text-muted-foreground leading-relaxed">
									{faq.answer}
								</p>
							</div>
						</div>
					</animated.div>
				) : null
			)}
		</div>
	)
}
