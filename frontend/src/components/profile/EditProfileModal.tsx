import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { User } from '@/types/entities'
import { useEditProfileData } from '@/hooks/useEditProfileData'
import { ProfileTabSection } from './sections/ProfileTabSection'
import { SecurityTabSection } from './sections/SecurityTabSection'

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
		onSubmit,
		onAvatarChange // Destructure onAvatarChange from your hook
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
					onValueChange={setActiveTab}
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
									.map(n => n[0])
									.join('')
							}
						/>
					</TabsContent>
					<TabsContent value="security">
						<SecurityTabSection user={user} onClose={handleClose} />
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	)
}
