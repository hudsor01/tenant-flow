// Import validator at runtime (class-validator provides it). TypeScript
// may not have an explicit dependency here, so ignore types for the import.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as validator from 'validator'
import { Logger } from '@nestjs/common'

/**
 * Apply runtime hardening to validator.js to mitigate CVE-2025-56200.
 *
 * The vulnerability stems from validator.isURL using '://' to parse protocols
 * while browsers accept ':'; this can lead to validation bypasses. There is
 * currently no patched upstream release, so we apply a conservative runtime
 * guard that requires a valid WHATWG URL with an allowed protocol before
 * delegating to the original implementation.
 */
export function applyValidatorPatches() {
  try {
    // Keep a reference to the original
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const origIsURL = (validator as any).isURL as ((str: string, options?: unknown) => boolean)

    // Replace with stricter wrapper
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(validator as any).isURL = function (str: string, options?: unknown) {
      if (!str || typeof str !== 'string') return false

      try {
        // Use WHATWG URL parser to ensure a scheme (protocol) exists and is explicit.
        const u = new URL(str)

        // Allow only http(s) by default to reduce open-redirect/XSS risk.
        const allowed = new Set(['http:', 'https:'])
        if (!allowed.has(u.protocol)) return false
      } catch {
        // Not a valid absolute URL according to WHATWG -> reject
        return false
      }

      // Delegate to original implementation for other checks
      try {
        return origIsURL ? origIsURL(str, options) : false
      } catch {
        return false
      }
    }
  } catch (err) {
    // Best-effort: do not crash startup if patching fails; use Nest Logger
    const logger = new Logger('validator-patch')
    logger.warn('Failed to apply validator.js runtime patch', err as Error)
  }
}

export default applyValidatorPatches
