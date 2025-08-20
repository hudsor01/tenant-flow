import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/use-auth'

export const CurrentUserAvatar = () => {
	const { user } = useAuth()

	const userData = user as
		| { name?: string; email?: string; avatarUrl?: string }
		| undefined
	const name = userData?.name || userData?.email || 'User'
	const profileImage = userData?.avatarUrl

	const initials: string =
		name
			?.split(' ')
			?.map((word: string) => word[0] || '')
			?.join('')
			?.toUpperCase()
			?.slice(0, 2) || '??'

	return (
		<Avatar>
			{profileImage && (
				<AvatarImage src={profileImage} alt={`${name} avatar`} />
			)}
			<AvatarFallback>{initials}</AvatarFallback>
		</Avatar>
	)
}
