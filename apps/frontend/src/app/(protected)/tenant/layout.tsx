import type { ReactNode } from 'react'

export default function TenantLayout({ children }: { children: ReactNode }) {
	return <div className="space-y-8">{children}</div>
}
