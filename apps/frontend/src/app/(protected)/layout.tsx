import { AuthCheck } from '@/components/auth/auth-check'
import type { ReactNode } from 'react'

// Protected Route Layout - Authentication Boundary
// This layout wraps ALL protected routes with authentication validation
export default function ProtectedLayout({ children }: { children: ReactNode }) {
	return <AuthCheck>{children}</AuthCheck>
}
