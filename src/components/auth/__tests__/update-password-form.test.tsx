/**
 * @vitest-environment jsdom
 * UpdatePasswordForm saving spinner (66.2-39 F19).
 *
 * The inline spinner sits on the primary Submit button, whose label is
 * `text-primary-foreground`. Its arc was a named `border-white`, which in dark
 * mode drew a white arc beside the dark primary-foreground label. The arc uses
 * the `primary-foreground` token, so it always matches the label.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "#test/utils/test-render";

const { updateUser } = vi.hoisted(() => ({
	updateUser: vi.fn(() => new Promise<never>(() => undefined)),
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({ auth: { updateUser } }),
}));

import { UpdatePasswordForm } from "../update-password-form";

describe("UpdatePasswordForm saving state", () => {
	it("draws the spinner arc in the primary-foreground token", async () => {
		render(<UpdatePasswordForm />);
		const typed = "Str0ng!Passw0rd";
		fireEvent.change(screen.getByPlaceholderText("Enter your new password"), {
			target: { value: typed },
		});
		fireEvent.change(screen.getByPlaceholderText("Confirm your new password"), {
			target: { value: typed },
		});
		fireEvent.click(screen.getByRole("button", { name: /save new password/i }));
		const saving = await screen.findByText("Saving...");
		const spinner = saving.parentElement?.querySelector(".animate-spin");
		expect(spinner?.classList).toContain("border-primary-foreground");
		expect(spinner?.classList).not.toContain("border-white");
	});
});

/**
 * How the password is kept (66.2-39 fix round 4, Part 8j). The form said
 * "Your password will be encrypted and stored securely"; Supabase Auth keeps
 * only a bcrypt hash of it (its `encrypted_password` column is named for
 * history: hashing is not encryption), which cannot be turned back into the
 * password. No copy in src says a password is encrypted.
 */
describe("UpdatePasswordForm says how the password is kept", () => {
	it("as a one-way hash", () => {
		render(<UpdatePasswordForm />);
		expect(
			screen.getByText(
				"Your password is stored only as a one-way hash, never as readable text.",
			),
		).toBeInTheDocument();
		expect(screen.queryByText(/encrypt/i)).not.toBeInTheDocument();
	});

	it("and no source in src says a password is encrypted", () => {
		const root = process.cwd();
		const sources = (dir: string): string[] =>
			readdirSync(dir).flatMap((name) => {
				const path = join(dir, name);
				if (statSync(path).isDirectory()) {
					return name === "__tests__" || name === "test" ? [] : sources(path);
				}
				return /\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name)
					? [path]
					: [];
			});
		const claim =
			/\bpasswords?\b[^.\n]*\bencrypt|\bencrypt[^.\n]*\bpasswords?\b/i;
		const hits = sources(join(root, "src"))
			.filter((path) => !path.endsWith("src/types/supabase.ts"))
			.flatMap((path) =>
				readFileSync(path, "utf8")
					.split("\n")
					.flatMap((line, i) =>
						claim.test(line) ? [`${relative(root, path)}:${i + 1}`] : [],
					),
			);
		expect(hits).toEqual([]);
	});
});
