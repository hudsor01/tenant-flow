/**
 * The Dropzone with the REAL react-dropzone and the real `useSupabaseUpload`,
 * composed as PropertyImageDropzone composes it (66.2-39 fix round 4, G44).
 *
 * property-image-dropzone.test.tsx mocks the hook, so `getRootProps` returns
 * nothing there and no test saw the root: with react-dropzone's defaults it
 * has `tabIndex: 0`, an Enter/Space handler and a click handler that opens the
 * picker. The "select files" button inside it made two tab stops for one
 * action, and one activation of the button clicked the file input twice (its
 * own handler, then the root's click). Here the root is no tab stop, the
 * button is the one, and each activation clicks the input once; a click on
 * the root itself still opens the picker.
 *
 * The file input's `click` events are counted: react-dropzone opens the
 * picker by calling `input.click()` (no File System Access API in jsdom).
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
	Dropzone,
	DropzoneContent,
	DropzoneEmptyState,
} from "#components/ui/dropzone";
import { useSupabaseUpload } from "#hooks/use-supabase-upload";

// No upload runs here; the client is never created.
vi.mock("#lib/supabase/client", () => ({
	createClient: () => {
		throw new Error("no upload in this test");
	},
}));

function ImageDropzone() {
	const uploadState = useSupabaseUpload({
		bucketName: "property-images",
		path: "property-1",
		allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
		maxFileSize: 10 * 1024 * 1024,
		maxFiles: 10,
	});
	return (
		<Dropzone {...uploadState}>
			<DropzoneEmptyState />
			<DropzoneContent />
		</Dropzone>
	);
}

function renderDropzone() {
	const view = render(
		<QueryClientProvider client={new QueryClient()}>
			<button type="button">Before</button>
			<ImageDropzone />
			<button type="button">After</button>
		</QueryClientProvider>,
	);
	const input = view.container.querySelector('input[type="file"]');
	const root = input?.parentElement;
	if (!(input instanceof HTMLInputElement) || !root) {
		throw new Error("the dropzone rendered no file input in its root");
	}
	const inputClicks = vi.fn();
	input.addEventListener("click", inputClicks);
	return { root, inputClicks };
}

describe("Dropzone with react-dropzone", () => {
	it("has one tab stop, the select button, and a root that is none", async () => {
		const user = userEvent.setup();
		const { root } = renderDropzone();
		const before = screen.getByRole("button", { name: "Before" });
		const select = screen.getByRole("button", { name: "select files" });
		expect(root.contains(select)).toBe(true);

		before.focus();
		const stops: Element[] = [];
		for (let press = 0; press < 4; press += 1) {
			await user.tab();
			const active = document.activeElement;
			if (!active || active.textContent === "After") break;
			stops.push(active);
		}

		expect(stops).toEqual([select]);
		expect(root).not.toHaveAttribute("tabindex");
	});

	it("opens the picker once per activation of the select button", async () => {
		const user = userEvent.setup();
		const { inputClicks } = renderDropzone();
		const select = screen.getByRole("button", { name: "select files" });

		select.focus();
		await user.keyboard("{Enter}");
		expect(inputClicks).toHaveBeenCalledTimes(1);

		await user.keyboard(" ");
		expect(inputClicks).toHaveBeenCalledTimes(2);

		await user.click(select);
		expect(inputClicks).toHaveBeenCalledTimes(3);
	});

	it("still opens the picker once on a click anywhere on the root", async () => {
		const user = userEvent.setup();
		const { root, inputClicks } = renderDropzone();

		await user.click(root);

		expect(inputClicks).toHaveBeenCalledTimes(1);
	});
});
