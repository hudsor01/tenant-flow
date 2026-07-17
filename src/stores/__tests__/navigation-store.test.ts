/**
 * Navigation store tests to ensure mobile menu state management works correctly.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { useNavigationStore } from "#stores/navigation-store";

describe("navigation store", () => {
	beforeEach(() => {
		// Reset to initial state
		useNavigationStore.setState({ isMobileMenuOpen: false });
	});

	it("toggles the mobile menu state consistently", () => {
		const store = useNavigationStore.getState();
		expect(store.isMobileMenuOpen).toBe(false);

		store.toggleMobileMenu();
		expect(useNavigationStore.getState().isMobileMenuOpen).toBe(true);

		store.closeMobileMenu();
		expect(useNavigationStore.getState().isMobileMenuOpen).toBe(false);
	});

	it("opens and closes the mobile menu directly", () => {
		const store = useNavigationStore.getState();

		store.openMobileMenu();
		expect(useNavigationStore.getState().isMobileMenuOpen).toBe(true);

		store.closeMobileMenu();
		expect(useNavigationStore.getState().isMobileMenuOpen).toBe(false);
	});

	it("resets to closed state after setState", () => {
		const store = useNavigationStore.getState();

		store.openMobileMenu();
		expect(useNavigationStore.getState().isMobileMenuOpen).toBe(true);

		useNavigationStore.setState({ isMobileMenuOpen: false });
		expect(useNavigationStore.getState().isMobileMenuOpen).toBe(false);
	});
});
