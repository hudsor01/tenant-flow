import { AuthCheck } from '@/components/auth/auth-check'
import type { ReactNode } from 'react'

export default function ProtectedLayout({ children }: { children: ReactNode }) {
	return <AuthCheck>{children}</AuthCheck>
}
