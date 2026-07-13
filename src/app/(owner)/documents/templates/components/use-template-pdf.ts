"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { callGeneratePdfFromHtml } from "#hooks/api/use-report-mutations";
import { createClient } from "#lib/supabase/client";
import { buildTemplateHtml } from "./build-template-html";
import type { TemplatePreviewOptions } from "./template-types";

/** Debounce delay in milliseconds for preview generation */
const PREVIEW_DEBOUNCE_MS = 500;

export function useTemplatePdf(
	template: string,
	getPayload: () => TemplatePreviewOptions,
	// FORM-05: optional export-time validation gate. Returns true when the form is
	// valid. Only Export is gated; Preview stays lenient so drafts still render.
	validate?: () => boolean | Promise<boolean>,
) {
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
	const [isExporting, setIsExporting] = useState(false);
	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const previewUrlRef = useRef<string | null>(null);

	useEffect(() => {
		return () => {
			if (previewUrlRef.current) {
				URL.revokeObjectURL(previewUrlRef.current);
			}
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, []);

	const handlePreview = () => {
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		debounceTimerRef.current = setTimeout(async () => {
			setIsGeneratingPreview(true);
			try {
				const payload = getPayload();
				const html = buildTemplateHtml(payload);

				const supabase = createClient();
				const {
					data: { session },
				} = await supabase.auth.getSession();
				if (!session?.access_token) {
					throw new Error("Not authenticated");
				}

				const filename = `${template}-preview.pdf`;
				const response = await fetch(
					`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-pdf`,
					{
						method: "POST",
						headers: {
							Authorization: `Bearer ${session.access_token}`,
							"Content-Type": "application/json",
						},
						body: JSON.stringify({ html, filename }),
					},
				);

				if (!response.ok) {
					throw new Error("PDF generation failed");
				}

				const blob = await response.blob();

				if (previewUrlRef.current) {
					URL.revokeObjectURL(previewUrlRef.current);
				}

				const url = URL.createObjectURL(blob);
				previewUrlRef.current = url;
				setPreviewUrl(url);
			} catch {
				toast.error("Failed to generate preview. Please try again.");
			} finally {
				setIsGeneratingPreview(false);
			}
		}, PREVIEW_DEBOUNCE_MS);
	};

	const handleExport = async () => {
		// FORM-05: block export on invalid input so the wired zod validators
		// actually gate the finished PDF (they map field errors via handleSubmit).
		if (validate && !(await validate())) {
			toast.error("Please fix the highlighted fields before exporting.");
			return;
		}
		setIsExporting(true);
		try {
			const payload = getPayload();
			const html = buildTemplateHtml(payload);
			const filename = `${template}.pdf`;
			await callGeneratePdfFromHtml(html, filename);
			toast.success("PDF exported successfully");
		} catch {
			toast.error("Failed to export PDF. Please try again.");
		} finally {
			setIsExporting(false);
		}
	};

	return {
		previewUrl,
		isGeneratingPreview,
		isExporting,
		handlePreview,
		handleExport,
	};
}
