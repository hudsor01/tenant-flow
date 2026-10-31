/**
 * @vitest-environment jsdom
 * Toaster (sonner.tsx) Tests
 *
 * Pins D-31 / N20: the token map rides on the toaster className as important
 * arbitrary properties (no static inline style), the lucide status icons
 * replace Sonner's built-in glyphs, the dead per-toast hook classes are gone,
 * and the theme guard still resolves a theme without a ThemeProvider.
 */

import { act, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, describe, expect, test } from "vitest";
import { render } from "#test/utils/test-render";
import { Toaster } from "../sonner";

const TOKEN_CLASSES = [
	"[--normal-bg:var(--color-popover)]!",
	"[--normal-text:var(--color-popover-foreground)]!",
	"[--normal-border:var(--color-border)]!",
	"[--border-radius:var(--radius)]!",
];
const DEAD_HOOK_PREFIX = ["sonner", "toast"].join("-");

function toaster(): HTMLOListElement {
	const ol = document.querySelector<HTMLOListElement>(
		"ol[data-sonner-toaster]",
	);
	if (!ol) throw new Error("ol[data-sonner-toaster] not rendered");
	return ol;
}

// Plain `toast()` calls carry no data-type; the status helpers set one.
const toastSelector = (type: string) =>
	type === "default"
		? "[data-sonner-toast]:not([data-type])"
		: `[data-sonner-toast][data-type="${type}"]`;

async function raise(fire: () => void, type: string) {
	act(() => {
		fire();
	});
	await waitFor(() => {
		expect(document.querySelector(toastSelector(type))).not.toBeNull();
	});
}

function iconSvg(type: string): SVGElement {
	const svg = document.querySelector<SVGElement>(
		`${toastSelector(type)} [data-icon] svg`,
	);
	if (!svg) throw new Error(`no icon svg on the ${type} toast`);
	return svg;
}

afterEach(async () => {
	act(() => {
		toast.dismiss();
	});
	await waitFor(() => {
		expect(document.querySelectorAll("[data-sonner-toast]")).toHaveLength(0);
	});
});

describe("Toaster", () => {
	test("puts the token map on the toaster as classes, not an inline style", async () => {
		render(<Toaster />);
		await raise(
			() => toast("Probe neutral", { duration: Number.POSITIVE_INFINITY }),
			"default",
		);
		const ol = toaster();
		for (const token of TOKEN_CLASSES) expect(ol.classList).toContain(token);
		expect(ol.classList).not.toContain("toaster");
		expect(ol.classList).not.toContain("group");
		expect(ol.style.getPropertyValue("--normal-bg")).toBe("");
		expect(screen.getByText("Probe neutral")).toBeInTheDocument();
	});

	test("merges a caller className with the token classes", async () => {
		render(<Toaster className="probe-extra" />);
		await raise(
			() => toast("Probe merge", { duration: Number.POSITIVE_INFINITY }),
			"default",
		);
		const ol = toaster();
		for (const token of TOKEN_CLASSES) expect(ol.classList).toContain(token);
		expect(ol.classList).toContain("probe-extra");
	});

	test("renders the lucide status icons", async () => {
		render(<Toaster />);
		await raise(
			() =>
				toast.success("Probe success", {
					duration: Number.POSITIVE_INFINITY,
				}),
			"success",
		);
		const success = iconSvg("success");
		expect(success.classList).toContain("lucide");
		expect(success.classList).toContain("lucide-circle-check");
		expect(success.classList).toContain("size-4");

		await raise(
			() => toast.error("Probe error", { duration: Number.POSITIVE_INFINITY }),
			"error",
		);
		expect(iconSvg("error").classList).toContain("lucide-octagon-x");

		await raise(
			() =>
				toast.loading("Probe loading", {
					duration: Number.POSITIVE_INFINITY,
				}),
			"loading",
		);
		const loading = iconSvg("loading");
		expect(loading.classList).toContain("lucide");
		expect(loading.classList).toContain("animate-spin");
	});

	test("carries none of the dead per-toast hook classes", async () => {
		render(<Toaster />);
		await raise(
			() => toast("Probe hooks", { duration: Number.POSITIVE_INFINITY }),
			"default",
		);
		const hooked = [...document.querySelectorAll("[class]")].filter((el) =>
			[...el.classList].some((c) => c.startsWith(DEAD_HOOK_PREFIX)),
		);
		expect(hooked).toHaveLength(0);
	});

	test("resolves the system theme without a ThemeProvider", async () => {
		render(<Toaster />);
		await raise(
			() => toast("Probe theme", { duration: Number.POSITIVE_INFINITY }),
			"default",
		);
		expect(toaster()).toHaveAttribute("data-sonner-theme", "light");
	});
});
