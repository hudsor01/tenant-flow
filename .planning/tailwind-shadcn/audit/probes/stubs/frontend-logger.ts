// Probe stub for #lib/frontend-logger (component-probes.mjs maps the specifier here).
const noop = (..._args: unknown[]) => {};

export const logger = { debug: noop, info: noop, warn: noop, error: noop };

// createLogger (66.2-35): src/lib/dom-utils.ts calls it at module scope, and the sidebar reaches it
// through src/lib/sidebar-state.ts, so the quick-actions-dock-centering probe needs it.
export const createLogger = (..._args: unknown[]) => logger;
