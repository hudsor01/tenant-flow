/**
 * Reset all Zustand module-singleton stores to their initial state.
 * Called on sign-out (STATE-02) to prevent cross-user state leakage.
 * Idempotent — safe to call multiple times.
 */

import { useDashboardPresetsStore } from "./dashboard-presets-store";
import { useDashboardStore } from "./dashboard-store";
import { useErrorBoundaryStore } from "./error-boundary-store";
import { useLeasesStore } from "./leases-store";
import { useNavigationStore } from "./navigation-store";
import { usePropertiesStore } from "./properties-store";
import { useTenantsStore } from "./tenants-store";

export function resetAllStores(): void {
	// Lease/property/tenant selection + filter state
	useLeasesStore.getState().reset();
	usePropertiesStore.getState().reset();
	useTenantsStore.getState().reset();

	// Dashboard state — reset to documented default viewMode
	useDashboardStore.setState({ viewMode: "table" });

	// Navigation — close any open mobile menu
	useNavigationStore.setState({ isMobileMenuOpen: false });

	// Error boundary — clear any lingering error
	useErrorBoundaryStore.getState().clearError();

	// Dashboard presets — reset persisted state AND clear localStorage key
	useDashboardPresetsStore.setState({ presets: {}, columnVisibility: {} });
	useDashboardPresetsStore.persist.clearStorage();
}
