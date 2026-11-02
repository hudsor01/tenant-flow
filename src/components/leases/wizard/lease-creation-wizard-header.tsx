import {
	Stepper,
	StepperDescription,
	StepperIndicator,
	StepperItem,
	StepperList,
	StepperSeparator,
	StepperTitle,
	StepperTrigger,
} from "#components/ui/stepper";
import type { WizardStep } from "#lib/validation/lease-wizard.schemas";

export const WIZARD_STEPS: {
	value: WizardStep;
	title: string;
	description: string;
}[] = [
	{ value: "selection", title: "Selection", description: "Property & tenant" },
	{ value: "terms", title: "Terms", description: "Dates & finances" },
	{ value: "details", title: "Details", description: "Rules & disclosures" },
	{ value: "review", title: "Review", description: "Confirm & create" },
];

interface LeaseCreationWizardHeaderProps {
	currentStep: WizardStep;
	onStepChange: (step: WizardStep) => void;
}

export function LeaseCreationWizardHeader({
	currentStep,
	onStepChange,
}: LeaseCreationWizardHeaderProps) {
	return (
		<Stepper
			value={currentStep}
			onValueChange={(value) => onStepChange(value as WizardStep)}
			orientation="horizontal"
			nonInteractive
		>
			<StepperList>
				{WIZARD_STEPS.map((step) => (
					<StepperItem key={step.value} value={step.value}>
						<StepperTrigger className="gap-3">
							<StepperIndicator />
							<div className="flex flex-col items-start">
								{/* Four titles do not fit beside their indicators below sm
								    (WCAG 1.4.10 at 320px); they stay the triggers' names. */}
								<StepperTitle className="max-sm:sr-only">
									{step.title}
								</StepperTitle>
								<StepperDescription className="hidden sm:block">
									{step.description}
								</StepperDescription>
							</div>
						</StepperTrigger>
						<StepperSeparator />
					</StepperItem>
				))}
			</StepperList>
		</Stepper>
	);
}
