import Link from 'next/link'

interface LogoSectionProps {
	homeLink: string
}

export function LogoSection({ homeLink }: LogoSectionProps) {
	return (
		<Link href={homeLink} className="group">
			<span className="text-gradient-brand text-3xl font-bold tracking-tight transition-all duration-200">
				TenantFlow
			</span>
		</Link>
	)
}