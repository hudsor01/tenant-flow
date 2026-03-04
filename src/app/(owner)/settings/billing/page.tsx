import { redirect } from 'next/navigation'

/**
 * Billing Settings Page Redirect
 *
 * Redirects to the main settings page with billing tab selected.
 * The billing functionality is now integrated into the main Settings page.
 */
export default function BillingSettingsPage() {
	redirect('/settings?tab=billing')
}
