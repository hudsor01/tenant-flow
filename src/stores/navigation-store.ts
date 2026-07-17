/**
 * Navigation Store - Mobile Menu State Management
 *
 * Manages mobile menu open/close state. All other navigation state
 * (breadcrumbs, history, active route) is dead code — real breadcrumbs
 * come from generateBreadcrumbs (src/lib/breadcrumbs.ts) in app-shell.
 */

import { create } from "zustand";
import { createLogger } from "#lib/frontend-logger";

const logger = createLogger({ component: "NavigationStore" });

export interface NavigationState {
	isMobileMenuOpen: boolean;
	toggleMobileMenu: () => void;
	openMobileMenu: () => void;
	closeMobileMenu: () => void;
}

const initialState = {
	isMobileMenuOpen: false,
};

export const useNavigationStore = create<NavigationState>((set) => ({
	...initialState,

	toggleMobileMenu: () => {
		set((state) => {
			const newState = !state.isMobileMenuOpen;
			logger.info("Mobile menu toggled", {
				action: "mobile_menu_toggled",
				metadata: { isOpen: newState },
			});
			return { isMobileMenuOpen: newState };
		});
	},

	openMobileMenu: () => {
		set({ isMobileMenuOpen: true });
		logger.info("Mobile menu opened", { action: "mobile_menu_opened" });
	},

	closeMobileMenu: () => {
		set({ isMobileMenuOpen: false });
		logger.info("Mobile menu closed", { action: "mobile_menu_closed" });
	},
}));
