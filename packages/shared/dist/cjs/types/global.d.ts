/**
 * Global type declarations and augmentations
 *
 * This file contains global type declarations that extend the global namespace,
 * window object, and other global interfaces used throughout the application.
 */
declare global {
    /**
     * PostHog analytics integration
     */
    interface Window {
        posthog?: {
            capture: (event: string, properties?: Record<string, unknown>) => void;
            identify: (distinctId: string, properties?: Record<string, unknown>) => void;
            alias: (alias: string) => void;
            reset: () => void;
            isFeatureEnabled: (flag: string) => boolean;
            getFeatureFlag: (flag: string) => string | boolean;
            reloadFeatureFlags: () => Promise<void>;
            onFeatureFlags: (callback: () => void) => void;
            group: (groupType: string, groupKey: string, properties?: Record<string, unknown>) => void;
            register: (properties: Record<string, unknown>) => void;
            unregister: (property: string) => void;
        };
    }
}
export {};
//# sourceMappingURL=global.d.ts.map