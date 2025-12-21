'use client'

import { cn } from '#lib/utils'
import { ChevronDown } from 'lucide-react'
import { useRef, useState } from 'react'

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
						<h2 className="typography-h2 mb-8 text-foreground">
							{category}
						</h2>
					)}
					{title && !category && (
						<h2 className="text-foreground mb-4 typography-h2 lg:text-4xl">
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
							key={faq.question}
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
	const contentRef = useRef<HTMLDivElement>(null)

	return (
		<div className="group overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg">
			<button
				onClick={onToggle}
				className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-muted/50 focus:outline-none focus:bg-muted/50"
			>
				<h3 className="text-foreground typography-large pr-4">
					{faq.question}
				</h3>
				<ChevronDown
					className={cn(
						"size-5 text-muted-foreground shrink-0 transition-transform [transition-duration:var(--duration-fast)]",
						isOpen && "rotate-180"
					)}
				/>
			</button>

			<div
				ref={contentRef}
				className={cn(
					"grid transition-all [transition-duration:var(--duration-normal)] ease-in-out",
					isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
				)}
			>
				<div className="overflow-hidden">
					<div className="px-6 pb-6">
						<div className="border-t border-border pt-4">
							<p className="text-muted-foreground leading-relaxed">
								{faq.answer}
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
