import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useMe } from '@/hooks/trpc/useAuth'

export const CurrentUserAvatar = () => {
	const { data: user } = useMe()
	
	const name = user?.name || user?.email || 'User'
	const profileImage = user?.avatarUrl

	const initials: string = name
		?.split(' ')
		?.map((word: string) => word[0] || '')
		?.join('')
		?.toUpperCase()
		?.slice(0, 2) || '??'

	return (
		<Avatar>
			{profileImage && <AvatarImage src={profileImage} alt={`${name} avatar`} />}
			<AvatarFallback>{initials}</AvatarFallback>
		</Avatar>
	)
}
