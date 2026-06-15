"use client";

import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { z } from "zod";
import { Badge } from "#components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "#components/ui/card";
import { BrandingEditor } from "./branding-editor";
import { ClausesEditor } from "./clauses-editor";
import { CustomFieldsEditor } from "./custom-fields-editor";
import { type DynamicField, DynamicForm } from "./dynamic-form";
import { FormBuilderPanel } from "./form-builder-panel";
import { useTemplateDefinition } from "./template-definition";
import { TemplatePreviewPanel } from "./template-preview-panel";
import { rentalApplicationSchema } from "./template-schemas";
import type { BrandingInfo, ClauseItem, CustomField } from "./template-types";
import { useTemplatePdf } from "./use-template-pdf";

const defaultBranding: BrandingInfo = {
	companyName: "TenantFlow Properties",
	logoUrl: null,
	primaryColor: "oklch(0.35 0.08 250)",
};

export function RentalApplicationTemplate() {
	const [branding, setBranding] = useState(defaultBranding);
	const form = useForm({
		defaultValues: {
			applicantName: "Taylor Morgan",
			email: "taylor.morgan@email.com",
			phone: "(415) 555-1200",
			currentAddress: "456 Pine Street, San Francisco, CA 94108",
			employer: "Pacific Design Co.",
			monthlyIncome: "6500",
			notes: "Applicant requests move-in by February 1st.",
			backgroundCheck: true,
			references: [
				{ name: "Morgan Lee", relationship: "Previous landlord", phone: "" },
			],
		},
		validators: {
			onBlur: ({ value }) => {
				const result = rentalApplicationSchema.safeParse(value);
				if (!result.success) {
					return z.treeifyError(result.error);
				}
				return undefined;
			},
			onSubmitAsync: ({ value }) => {
				const result = rentalApplicationSchema.safeParse(value);
				if (!result.success) {
					return z.treeifyError(result.error);
				}
				return undefined;
			},
		},
	});
	const [customFields, setCustomFields] = useState<CustomField[]>([]);
	const [clauses, setClauses] = useState<ClauseItem[]>([
		{
			id: "state-clause-1",
			text: "Application fee disclosures provided.",
		},
	]);

	const baseFields: DynamicField[] = [
		{
			name: "applicantName",
			label: "Applicant name",
			type: "text",
			section: "Applicant details",
		},
		{
			name: "email",
			label: "Email",
			type: "email",
			section: "Applicant details",
		},
		{
			name: "phone",
			label: "Phone",
			type: "tel",
			section: "Applicant details",
		},
		{
			name: "employer",
			label: "Employer",
			type: "text",
			section: "Applicant details",
		},
		{
			name: "monthlyIncome",
			label: "Monthly income",
			type: "number",
			section: "Applicant details",
			placeholder: "$",
		},
		{
			name: "currentAddress",
			label: "Current address",
			type: "text",
			section: "Applicant details",
			fullWidth: true,
		},
		{
			name: "backgroundCheck",
			label: "Background check consent",
			type: "checkbox",
			section: "Screening",
			fullWidth: true,
			description:
				"Include the applicant's authorization for the landlord to obtain a background/credit report from a third-party screening service.",
		},
		{
			name: "notes",
			label: "Additional notes",
			type: "textarea",
			section: "Screening",
			fullWidth: true,
		},
		{
			name: "references",
			label: "References",
			type: "list",
			section: "References",
			fullWidth: true,
			itemLabel: "Reference",
			addLabel: "Add reference",
			itemFields: [
				{ key: "name", label: "Name", type: "text" },
				{ key: "relationship", label: "Relationship", type: "text" },
				{ key: "phone", label: "Phone", type: "text" },
			],
		},
	];

	const {
		fields,
		customFields: builderFields,
		setCustomFields: setBuilderFields,
		isSaving: isSavingFields,
		save: saveFields,
	} = useTemplateDefinition("rental-application", baseFields, form as never);

	const getPayload = () => {
		const values = form.state.values as Record<string, unknown>;
		const dynamicFields = builderFields.map((field) => ({
			label: field.label,
			value:
				field.type === "checkbox"
					? values[field.name]
						? "Yes"
						: "No"
					: String(values[field.name] ?? ""),
		}));
		return {
			templateTitle: "Rental Application",
			state: "CA",
			branding,
			customFields,
			clauses,
			data: {
				applicant: {
					name: values.applicantName,
					email: values.email,
					phone: values.phone,
					currentAddress: values.currentAddress,
				},
				employment: {
					employer: values.employer,
					monthlyIncome: values.monthlyIncome,
				},
				references: values.references ?? [],
				backgroundCheck: {
					consent: values.backgroundCheck,
				},
				notes: values.notes,
				dynamicFields,
			},
		};
	};

	const {
		previewUrl,
		isGeneratingPreview,
		isExporting,
		handlePreview,
		handleExport,
	} = useTemplatePdf("rental-application", getPayload);

	return (
		<div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
			<div className="space-y-6">
				<BrandingEditor branding={branding} onChange={setBranding} />
				<Card>
					<CardHeader>
						<CardTitle>Applicant details</CardTitle>
					</CardHeader>
					<CardContent>
						<DynamicForm form={form} fields={fields} />
					</CardContent>
				</Card>

				<CustomFieldsEditor fields={customFields} onChange={setCustomFields} />
				<ClausesEditor clauses={clauses} onChange={setClauses} />
				<FormBuilderPanel
					fields={builderFields}
					onChange={setBuilderFields}
					onSave={saveFields}
					isSaving={isSavingFields}
				/>
			</div>

			<TemplatePreviewPanel
				title="Rental Application"
				previewUrl={previewUrl}
				isGenerating={isGeneratingPreview}
				isExporting={isExporting}
				onPreview={handlePreview}
				onExport={handleExport}
			>
				<div className="space-y-3">
					<div className="flex items-center gap-2">
						<Badge variant="outline">Applicant</Badge>
						<span className="text-sm text-muted-foreground">
							{form.state.values.applicantName}
						</span>
					</div>
					<p className="text-sm text-muted-foreground">
						{form.state.values.email} • {form.state.values.phone}
					</p>
					<p className="text-sm">Employer: {form.state.values.employer}</p>
					<p className="text-sm">
						Monthly income: ${form.state.values.monthlyIncome}
					</p>
					<p className="text-sm">
						Background check:{" "}
						{form.state.values.backgroundCheck ? "Authorized" : "Pending"}
					</p>
				</div>
			</TemplatePreviewPanel>
		</div>
	);
}
