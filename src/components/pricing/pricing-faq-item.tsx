"use client";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "#components/ui/accordion";
import { track } from "#lib/analytics/track";

/**
 * One pricing FAQ, its answer kept in the server HTML (SEO audit P1). Opening
 * it records `faq_open` (P14): the questions people open are the objections
 * to answer higher on the page.
 */
export function PricingFaqItem({
	question,
	answer,
}: {
	question: string;
	answer: string;
}) {
	return (
		<Accordion
			type="single"
			collapsible
			className="w-full"
			onValueChange={(value) => {
				// SEO audit P14: which objections people open.
				if (value)
					track({
						name: "faq_open",
						props: {
							question: question.slice(0, 120),
							location: "pricing",
						},
					});
			}}
		>
			<AccordionItem
				value="answer"
				className="rounded-2xl border border-border/50 bg-background/60 px-5 transition-colors hover:border-primary/30"
			>
				<AccordionTrigger className="text-left text-base font-medium leading-7 text-foreground hover:no-underline sm:text-lg sm:leading-8">
					{question}
				</AccordionTrigger>
				<AccordionContent
					forceMount
					className="pb-5 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7"
				>
					{answer}
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}
