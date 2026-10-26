// Probe stub for #lib/frontend-logger (component-probes.mjs maps the specifier here).
const noop = (..._args: unknown[]) => {};

export const logger = { debug: noop, info: noop, warn: noop, error: noop };
