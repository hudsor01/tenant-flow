import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export const CurrentUserAvatar = () => {
	// TODO: Get user profile data from useAuth when available
	const name = 'User' // TODO: Get user profile data when available
	const profileImage = undefined // TODO: Get user avatar when available

	const initials: string | undefined = name
		?.split(' ')
		?.map((word: string) => word[0])
		?.join('')
		?.toUpperCase()

	return (
		<Avatar>
			{profileImage && <AvatarImage src={profileImage} alt={initials} />}
			<AvatarFallback>{initials}</AvatarFallback>
		</Avatar>
	)
}
