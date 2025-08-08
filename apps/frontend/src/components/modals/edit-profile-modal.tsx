import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { User } from '@repo/shared'
// import { useEditProfileData } from '@/hooks/useEditProfileData'
// import { ProfileTabSection } from '@/components/profile/sections/ProfileTabSection'
// import { SecurityTabSection } from '@/components/profile/sections/SecurityTabSection'

interface EditProfileModalProps {
	isOpen: boolean
	onClose: () => void
	user: User
}

export default function EditProfileModal({
	isOpen,
	onClose,
	user: _user
}: EditProfileModalProps) {
	// TODO: Implement useEditProfileData hook
	const activeTab = 'profile'
	const setActiveTab = (_value: string) => {}
	const handleClose = () => onClose()
	const _avatarState = null
	const _profileForm = null
	const _passwordForm = null
	const _onSubmit = () => {}
	const _onAvatarChange = () => {}
	const _handlePasswordSubmit = () => {}

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
						<div className="p-4 text-center text-muted-foreground">
							Profile section coming soon...
						</div>
					</TabsContent>
					<TabsContent value="security">
						<div className="p-4 text-center text-muted-foreground">
							Security section coming soon...
						</div>
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	)
}
