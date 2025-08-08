import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
	Home,
	Wrench,
	FileText,
	User,
	LogOut,
	Building
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useTenants } from '@/hooks/use-tenants'

interface TenantPortalLayoutProps {
	children: React.ReactNode
}

export function TenantPortalLayout({ children }: TenantPortalLayoutProps) {
	const pathname = usePathname()
	const { logout } = useAuth()
	const { tenants, selectedTenant } = useTenants()
	const tenantData = selectedTenant || tenants?.[0]

	const handleSignOut = () => {
		void logout()
	}

	const navigation = [
		{
			name: 'Dashboard',
			href: '/tenant-dashboard',
			icon: Home,
			current: pathname === '/tenant-dashboard'
		},
		{
			name: 'Maintenance',
			href: '/tenant-maintenance',
			icon: Wrench,
			current: pathname === '/tenant-maintenance'
		},
		{
			name: 'Documents',
			href: '/documents',
			icon: FileText,
			current: pathname === '/documents'
		},
		{
			name: 'Profile',
			href: '/profile',
			icon: User,
			current: pathname === '/profile'
		}
	]

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<div className="border-b border-gray-200 bg-white">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between py-4">
						{/* Logo/Brand */}
						<div className="flex items-center">
							<div className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-green-600">
								<Building className="h-5 w-5 text-white" />
							</div>
							<div>
								<h1 className="text-xl font-bold text-gray-900">
									TenantFlow
								</h1>
								<p className="text-xs text-gray-500">
									Tenant Portal
								</p>
							</div>
						</div>

						{/* Property Info */}
						{tenantData && (
							<div className="hidden text-center md:block">
								<p className="text-sm font-medium text-gray-900">
									{tenantData.name}
								</p>
								<p className="text-xs text-gray-500">
									Tenant Portal
								</p>
							</div>
						)}

						{/* User Menu */}
						<div className="flex items-center space-x-3">
							{tenantData && (
								<div className="hidden text-right sm:block">
									<p className="text-sm font-medium text-gray-900">
										{tenantData.name}
									</p>
									<p className="text-xs text-gray-500">
										Tenant
									</p>
								</div>
							)}
							<Button
								variant="outline"
								size="sm"
								onClick={handleSignOut}
								className="flex items-center gap-2"
							>
								<LogOut className="h-4 w-4" />
								<span className="hidden sm:inline">
									Sign Out
								</span>
							</Button>
						</div>
					</div>
				</div>
			</div>

			<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
					{/* Sidebar Navigation */}
					<div className="lg:col-span-1">
						<Card className="p-4">
							<nav className="space-y-2">
								{navigation.map(item => {
									const Icon = item.icon
									return (
										<Link
											key={item.name}
											href={item.href}
											className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
												item.current
													? 'border border-green-200 bg-green-100 text-green-700'
													: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
											}`}
										>
											<Icon className="mr-3 h-4 w-4" />
											{item.name}
										</Link>
									)
								})}
							</nav>

							{/* Quick Stats */}
							{tenantData && (
								<div className="mt-6 border-t pt-6">
									<h3 className="mb-3 text-xs font-medium tracking-wide text-gray-500 uppercase">
										Quick Info
									</h3>
									<div className="space-y-2">
										<div className="flex justify-between text-sm">
											<span className="text-gray-500">
												Rent:
											</span>
											<span className="font-medium">
												${'TBD'}
											</span>
										</div>
										<div className="flex justify-between text-sm">
											<span className="text-gray-500">
												Status:
											</span>
											<span className="font-medium text-green-600">
												{'Active'}
											</span>
										</div>
									</div>
								</div>
							)}
						</Card>
					</div>

					{/* Main Content */}
					<div className="lg:col-span-3">{children}</div>
				</div>
			</div>
		</div>
	)
}
