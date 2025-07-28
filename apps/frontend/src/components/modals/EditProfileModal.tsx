import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { User } from '@tenantflow/shared/types/auth'
import { useEditProfileData } from '@/hooks/useEditProfileData'
import { ProfileTabSection } from '@/components/profile/sections/ProfileTabSection'
import { SecurityTabSection } from '@/components/profile/sections/SecurityTabSection'

interface EditProfileModalProps {
	isOpen: boolean
	onClose: () => void
	user: User
}

export default function EditProfileModal({
	isOpen,
	onClose,
	user
}: EditProfileModalProps) {
	const {
		activeTab,
		setActiveTab,
		handleClose,
		avatarState,
		profileForm,
		passwordForm,
		onSubmit,
		onAvatarChange,
		handlePasswordSubmit
	} = useEditProfileData({ user, onClose })

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle className="text-2xl font-bold">
						Edit Profile
					</DialogTitle>
					<DialogDescription>
						Update your profile information and preferences
					</DialogDescription>
				</DialogHeader>

				<Tabs
					value={activeTab}
					onValueChange={(value: string) => setActiveTab(value)}
					className="w-full"
				>
					<TabsList className="grid w-full grid-cols-1 sm:grid-cols-2">
						<TabsTrigger value="profile">Profile</TabsTrigger>
						<TabsTrigger value="security">Security</TabsTrigger>
					</TabsList>

					<TabsContent value="profile">
						<ProfileTabSection
							user={user}
							form={profileForm}
							avatarState={avatarState}
							onAvatarChange={onAvatarChange}
							onSubmit={onSubmit}
							onCancel={handleClose}
							getInitials={(name: string) =>
								name
									.split(' ')
									.map((n: string) => n[0] || '')
									.join('')
							}
						/>
					</TabsContent>
					<TabsContent value="security">
						<SecurityTabSection 
							form={passwordForm}
							onSubmit={handlePasswordSubmit}
							onCancel={handleClose}
						/>
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	)
}
