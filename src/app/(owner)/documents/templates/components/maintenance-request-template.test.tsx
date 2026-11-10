/**
 * @vitest-environment jsdom
 * The maintenance request template names its priority by label in the
 * generated PDF, as its preview does (66.2-39 fix round 3, cycle 2, F4).
 *
 * Part K routed the preview's priority through the `priorities` label map
 * ("Priority: Medium", VD-82), but the PDF payload still sent the stored
 * value, so `buildTemplateHtml` printed "Priority: medium" and the preview
 * and the document disagreed.
 */
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "#test/utils/test-render";
import { buildTemplateHtml } from "./build-template-html";
import type { TemplatePreviewOptions } from "./template-types";

const { captured } = vi.hoisted(() => ({
	captured: { getPayload: null as null | (() => TemplatePreviewOptions) },
}));
vi.mock("./use-template-pdf", () => ({
	useTemplatePdf: (_key: string, getPayload: () => TemplatePreviewOptions) => {
		captured.getPayload = getPayload;
		return {
			previewUrl: null,
			isGeneratingPreview: false,
			isExporting: false,
			handlePreview: vi.fn(),
			handleExport: vi.fn(),
		};
	},
}));
vi.mock("./template-definition", () => ({
	useTemplateDefinition: (_key: string, baseFields: unknown[]) => ({
		fields: baseFields,
		customFields: [],
		setCustomFields: vi.fn(),
		isSaving: false,
		save: vi.fn(),
	}),
}));
vi.mock("./dynamic-form", () => ({ DynamicForm: () => null }));

import { MaintenanceRequestTemplate } from "./maintenance-request-template.client";

describe("the maintenance request template's priority", () => {
	it("reads the same label on the preview and in the generated PDF", () => {
		render(<MaintenanceRequestTemplate />);
		expect(screen.getByText("Priority: Medium")).toBeInTheDocument();

		const payload = captured.getPayload?.();
		expect(payload?.data.request).toMatchObject({ priority: "Medium" });
		const html = buildTemplateHtml(payload as TemplatePreviewOptions);
		expect(html).toContain(
			'<span class="field-label">Priority</span><span class="field-value">Medium</span>',
		);
		expect(html).not.toContain(">medium<");
	});
});
