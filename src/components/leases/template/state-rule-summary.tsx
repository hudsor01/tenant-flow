import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#components/ui/card";
import { leaseTemplateSchema } from "#lib/templates/lease-template";
import type { USState } from "#types/lease-generator.types";

interface StateRuleSummaryProps {
	state: USState;
}

export function StateRuleSummary({ state }: StateRuleSummaryProps) {
	const rules = leaseTemplateSchema.stateRules[state];
	if (!rules) return null;

	return (
		<Card className="shadow-sm">
			<CardHeader>
				<CardTitle className="text-base">
					{rules.stateName} Highlights
				</CardTitle>
				<CardDescription>
					Built-in notes for this state. Confirm them against current state law.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-2 text-xs">
				<ul className="mt-0 mb-0 flex list-disc flex-col gap-2 pl-4 [&>li]:mb-0">
					{rules.notices.map((notice) => (
						<li key={notice}>{notice}</li>
					))}
				</ul>
			</CardContent>
		</Card>
	);
}
