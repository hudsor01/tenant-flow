/**
 * Catch-all Modal Slot
 *
 * Official Next.js pattern for dismissing an intercepted-route modal when the
 * app navigates away (a success push or a link to an un-intercepted route).
 * Without it, an unmatched `@modal` slot retains its previous (open-modal)
 * state on soft navigation. Returning `null` renders nothing — the same
 * visible result as `default.tsx`, but for navigated-to routes rather than
 * hard loads.
 */
export default function CatchAllModal() {
	return null;
}
