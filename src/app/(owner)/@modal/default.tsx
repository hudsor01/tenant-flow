/**
 * Default Modal Slot
 *
 * Required for Next.js parallel routes. Returns null when no modal is active.
 * This prevents errors when navigating directly to pages without intercepting.
 */
export default function Default() {
	return null
}
