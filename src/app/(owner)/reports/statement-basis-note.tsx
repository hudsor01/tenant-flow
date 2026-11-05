import { BlurFade } from "#components/ui/blur-fade";
import {
	STATEMENT_BASIS_HEADING,
	STATEMENT_BASIS_NOTE,
} from "#lib/reports/statement-basis";

/**
 * The basis the statement above it is presented on, under its figures on the
 * balance sheet, income statement and cash flow pages. The text is
 * STATEMENT_BASIS_NOTE, the one each statement's CSV writes too.
 */
export function StatementBasisNote() {
	return (
		<BlurFade delay={0.4}>
			<section
				aria-labelledby="statement-basis-heading"
				className="mt-6 rounded-lg border border-border bg-card p-4"
			>
				<h2
					id="statement-basis-heading"
					className="mb-2 text-sm font-medium text-foreground"
				>
					{STATEMENT_BASIS_HEADING}
				</h2>
				<ul className="space-y-1 text-sm text-muted-foreground">
					{STATEMENT_BASIS_NOTE.map((entry) => (
						<li key={entry}>{entry}</li>
					))}
				</ul>
			</section>
		</BlurFade>
	);
}
