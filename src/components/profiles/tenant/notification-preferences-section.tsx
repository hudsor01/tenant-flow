'use client'

import { CardLayout } from '#components/ui/card-layout'
import { ToggleSwitch } from '#components/ui/toggle-switch'
import { Bell } from 'lucide-react'

interface NotificationPreferences {
	rentReminders?: boolean
	maintenanceUpdates?: boolean
	propertyNotices?: boolean
}

interface NotificationPreferencesSectionProps {
	preferences: NotificationPreferences | undefined
	isLoading: boolean
	isSaving: boolean
	onToggle: (key: string, value: boolean) => void
}

export function NotificationPreferencesSection({
	preferences,
	isLoading,
	isSaving,
	onToggle
}: NotificationPreferencesSectionProps) {
	const isDisabled = isLoading || isSaving

	return (
		<CardLayout
			title="Notification Preferences"
			description="Choose how you want to be notified"
		>
			<div className="space-y-4">
				<ToggleSwitch
					icon={Bell}
					label="Rent Reminders"
					description="Get notified before rent is due"
					checked={preferences?.rentReminders ?? true}
					disabled={isDisabled}
					onChange={checked => onToggle('rentReminders', checked)}
				/>

				<ToggleSwitch
					icon={Bell}
					label="Maintenance Updates"
					description="Updates on your maintenance requests"
					checked={preferences?.maintenanceUpdates ?? true}
					disabled={isDisabled}
					onChange={checked => onToggle('maintenanceUpdates', checked)}
				/>

				<ToggleSwitch
					icon={Bell}
					label="Property Notices"
					description="Important announcements and updates"
					checked={preferences?.propertyNotices ?? true}
					disabled={isDisabled}
					onChange={checked => onToggle('propertyNotices', checked)}
				/>
			</div>
		</CardLayout>
	)
}
