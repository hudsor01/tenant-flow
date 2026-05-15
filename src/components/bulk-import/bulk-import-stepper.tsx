"use client";

import { ArrowLeft, CheckCheck, FileCheck, Upload } from "lucide-react";
import { Button } from "#components/ui/button";
import { DialogFooter } from "#components/ui/dialog";
import {
	Content as StepperContent,
	Description as StepperDescription,
	Indicator as StepperIndicator,
	Item as StepperItem,
	List as StepperList,
	Root as StepperRoot,
	Separator as StepperSeparator,
	Title as StepperTitle,
	Trigger as StepperTrigger,
} from "#components/ui/stepper";
import { cn } from "#lib/utils";
import type { ImportStep } from "#types/api-contracts";
import { BulkImportConfirmStep } from "./bulk-import-confirm-step";
import { BulkImportUploadStep } from "./bulk-import-upload-step";
import { BulkImportValidateStep } from "./bulk-import-validate-step";
import type { BulkImportConfig } from "./types";
import { useBulkImportStepperState } from "./use-bulk-import-stepper-state";

interface BulkImportStepperProps<T> {
	config: BulkImportConfig<T>;
	currentStep: ImportStep;
	onStepChange: (step: ImportStep) => void;
	onComplete: () => void;
	onPendingChange?: (pending: boolean) => void;
}

export function BulkImportStepper<T>({
	config,
	currentStep,
	onStepChange,
	onComplete,
	onPendingChange,
}: BulkImportStepperProps<T>) {
	const {
		file,
		parseResult,
		importProgress,
		result,
		cumulative,
		retryCount,
		isImporting,
		validRowCount,
		hasErrors,
		csvMalformed,
		handleFileSelect,
		handleUpload,
		handleRetryFailed,
		handleBack,
	} = useBulkImportStepperState<T>({
		config,
		currentStep,
		onStepChange,
		onComplete,
		...(onPendingChange ? { onPendingChange } : {}),
	});

	const triggerCls = cn(
		"w-full rounded-lg p-3 transition-all duration-200 hover:bg-muted/60",
		"data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=completed]:bg-success/5",
	);
	const indicatorCls = cn(
		"size-9 rounded-lg transition-all duration-200",
		"data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md",
		"data-[state=completed]:bg-success data-[state=completed]:text-success-foreground",
		"data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground",
	);

	const steps = [
		{
			value: "upload" as const,
			icon: Upload,
			title: "Upload",
			desc: "Choose CSV file",
			hasSep: true,
		},
		{
			value: "validate" as const,
			icon: FileCheck,
			title: "Validate",
			desc: "Review data",
			hasSep: true,
		},
		{
			value: "confirm" as const,
			icon: CheckCheck,
			title: "Confirm",
			desc: `Import ${config.entityLabel.plural.toLowerCase()}`,
			hasSep: false,
		},
	];

	return (
		<>
			<StepperRoot value={currentStep} className="w-full">
				<StepperList className="mb-8 p-1 bg-muted/30 rounded-xl">
					{steps.map((step) => (
						<StepperItem key={step.value} value={step.value}>
							<StepperTrigger className={triggerCls}>
								<StepperIndicator className={indicatorCls}>
									<step.icon className="size-4" />
								</StepperIndicator>
								<div className="flex flex-col items-start ml-3">
									<StepperTitle className="text-sm font-semibold">
										{step.title}
									</StepperTitle>
									<StepperDescription className="text-xs">
										{step.desc}
									</StepperDescription>
								</div>
							</StepperTrigger>
							{step.hasSep && (
								<StepperSeparator className="mx-2 data-[state=completed]:bg-success" />
							)}
						</StepperItem>
					))}
				</StepperList>

				<StepperContent
					value="upload"
					className="animate-in fade-in slide-in-from-right-4 duration-300"
				>
					<BulkImportUploadStep
						config={config}
						onFileSelect={handleFileSelect}
					/>
				</StepperContent>

				<StepperContent
					value="validate"
					className="animate-in fade-in slide-in-from-right-4 duration-300"
				>
					{file && (
						<BulkImportValidateStep
							file={file}
							parseResult={parseResult}
							templateHeaders={config.templateHeaders}
							csvMalformed={csvMalformed}
						/>
					)}
				</StepperContent>

				<StepperContent
					value="confirm"
					className="animate-in fade-in slide-in-from-right-4 duration-300"
				>
					<BulkImportConfirmStep
						entityLabel={config.entityLabel}
						isImporting={isImporting}
						importProgress={importProgress}
						result={result}
						cumulative={cumulative}
						retryCount={retryCount}
						parseResult={parseResult}
						onRetryFailed={handleRetryFailed}
					/>
				</StepperContent>
			</StepperRoot>

			<DialogFooter className="gap-3 pt-4 border-t border-border/50">
				{currentStep !== "upload" && !result && (
					<Button
						variant="outline"
						onClick={handleBack}
						disabled={isImporting}
						className="gap-2 hover:bg-muted/50"
					>
						<ArrowLeft className="size-4" />
						{currentStep === "validate" ? "Back" : "Cancel"}
					</Button>
				)}

				{currentStep === "validate" && (
					<Button
						onClick={handleUpload}
						disabled={
							validRowCount === 0 ||
							hasErrors ||
							(parseResult?.tooManyRows ?? false) ||
							isImporting
						}
						className="gap-2 min-w-32"
					>
						Import {validRowCount} {config.entityLabel.plural}
					</Button>
				)}

				{currentStep === "confirm" && result && (
					<Button variant="outline" onClick={onComplete}>
						Close
					</Button>
				)}
			</DialogFooter>
		</>
	);
}
