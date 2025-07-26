import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { trpc } from '@/lib/utils/trpc'

export const CurrentUserAvatar = () => {
	const { data: user } = trpc.auth.me.useQuery()
	
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
