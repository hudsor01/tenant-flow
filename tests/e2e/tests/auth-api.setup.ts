import path from "node:path";
import { fileURLToPath } from "node:url";
import { test as setup } from "@playwright/test";
import { loginAsOwner } from "../auth-helpers";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
// Mirrors OWNER_AUTH_FILE in playwright.config.ts: tests/e2e/playwright/.auth/owner.json
const OWNER_AUTH_FILE = path.join(
	currentDir,
	"..",
	"playwright/.auth/owner.json",
);

/**
 * `setup-owner` project: authenticate the synthetic owner once and persist the
 * @supabase/ssr session as storageState for the storageState-based owner /
 * firefox / chromium / mobile-chrome projects. Now that loginAsOwner injects the
 * session as cookies (not localStorage), page.context().storageState() captures
 * a valid session.
 *
 * NOTE: CI authenticates the dashboard a11y sweep via the `owner-axe` project,
 * which logs in in-test and does NOT depend on this setup.
 */
setup("authenticate owner", async ({ page }) => {
	await loginAsOwner(page);
	await page.context().storageState({ path: OWNER_AUTH_FILE });
});
