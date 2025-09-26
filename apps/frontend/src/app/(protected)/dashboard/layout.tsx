import { AuthCheck } from '@/components/auth/auth-check'
import { ViewTransitionsProvider } from '@/components/providers/view-transitions-provider'
import type { ReactNode } from 'react'

import './dashboard.css'

// Server Component Layout with View Transitions
export default function DashboardLayout({ children }: { children: ReactNode }) {
	return (
		<AuthCheck>
			<ViewTransitionsProvider>{children}</ViewTransitionsProvider>
		</AuthCheck>
	)
}
