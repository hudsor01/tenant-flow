import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'

export const CurrentUserAvatar = () => {
	const { user } = useAuth()

	const name = user?.name || user?.email || 'User'
	const profileImage = user?.avatarUrl

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
