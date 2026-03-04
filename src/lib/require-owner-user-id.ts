import * as Sentry from '@sentry/nextjs'

/**
 * Guards against undefined owner_user_id in mutation functions.
 * Throws a user-facing error and logs to Sentry if userId is undefined.
 * Used as defense-in-depth -- RLS is the primary control.
 */
export function requireOwnerUserId(userId: string | undefined): string {
	if (!userId) {
		Sentry.captureMessage(
			'owner_user_id undefined in mutation -- user may not be authenticated',
			{ level: 'warning' }
		)
		throw new Error('Unable to save. Please refresh and try again.')
	}
	return userId
}
