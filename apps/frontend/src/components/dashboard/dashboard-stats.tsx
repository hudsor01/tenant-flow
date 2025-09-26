import { getDashboardStats } from '@/app/actions/dashboard'
import { Card } from '@/components/ui/card'
import { Building2, DollarSign, Users, Wrench } from 'lucide-react'

// SSR-safe currency formatter - deterministic output
const formatCurrency = (amount: number) => {
	const dollars = Math.floor(amount)
	// Use basic number formatting without locale dependency
	return `$${dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

export async function DashboardStats() {
	const result = await getDashboardStats()

	// Use fallback if fetch failed
	const stats = result.success ? result.data : {
		properties: { total: 0 },
		tenants: { active: 0 },
		revenue: { monthly: 0 },
		maintenance: { total: 0 }
	}

	return (
		<div
			className="grid grid-cols-1 @lg:grid-cols-2 @2xl:grid-cols-4"
			style={{ gap: 'var(--spacing-3)' }}
		>
			<Card
				className="card-glass-premium flex items-center justify-center"
				style={{
					background: 'var(--color-system-blue-10)',
					borderColor: 'var(--color-system-blue-25)',
					padding: 'var(--spacing-6)',
					aspectRatio: '16/9'
				}}
			>
				<div className="text-center">
					<Building2
						style={{
							width: 'var(--spacing-8)',
							height: 'var(--spacing-8)',
							margin: '0 auto var(--spacing-2)',
							color: 'var(--color-system-blue)'
						}}
					/>
					<p
						style={{
							fontSize: 'var(--font-footnote)',
							fontWeight: 600,
							color: 'var(--color-system-blue-85)',
							marginBottom: 'var(--spacing-1)'
						}}
					>
						Total Properties
					</p>
					<p
						style={{
							fontSize: 'var(--font-title-1)',
							fontWeight: 700,
							color: 'var(--color-label-primary)'
						}}
					>
						{stats?.properties?.total
							?.toString()
							.replace(/\B(?=(\d{3})+(?!\d))/g, ',') || '0'}
					</p>
				</div>
			</Card>
			<Card
				className="card-glass-premium flex items-center justify-center"
				style={{
					background: 'var(--color-system-green-10)',
					borderColor: 'var(--color-system-green-25)',
					padding: 'var(--spacing-6)',
					aspectRatio: '16/9'
				}}
			>
				<div className="text-center">
					<Users
						style={{
							width: 'var(--spacing-8)',
							height: 'var(--spacing-8)',
							margin: '0 auto var(--spacing-2)',
							color: 'var(--color-system-green)'
						}}
					/>
					<p
						style={{
							fontSize: 'var(--font-footnote)',
							fontWeight: 600,
							color: 'var(--color-system-green-85)',
							marginBottom: 'var(--spacing-1)'
						}}
					>
						Active Tenants
					</p>
					<p
						style={{
							fontSize: 'var(--font-title-1)',
							fontWeight: 700,
							color: 'var(--color-label-primary)'
						}}
					>
						{stats?.tenants?.active
							?.toString()
							.replace(/\B(?=(\d{3})+(?!\d))/g, ',') || '0'}
					</p>
				</div>
			</Card>
			<Card
				className="card-glass-premium flex items-center justify-center"
				style={{
					background: 'var(--color-accent-10)',
					borderColor: 'var(--color-accent-25)',
					padding: 'var(--spacing-6)',
					aspectRatio: '16/9'
				}}
			>
				<div className="text-center">
					<DollarSign
						style={{
							width: 'var(--spacing-8)',
							height: 'var(--spacing-8)',
							margin: '0 auto var(--spacing-2)',
							color: 'var(--color-accent-main)'
						}}
					/>
					<p
						style={{
							fontSize: 'var(--font-footnote)',
							fontWeight: 600,
							color: 'var(--color-accent-85)',
							marginBottom: 'var(--spacing-1)'
						}}
					>
						Monthly Revenue
					</p>
					<p
						style={{
							fontSize: 'var(--font-title-1)',
							fontWeight: 700,
							color: 'var(--color-label-primary)'
						}}
					>
						{formatCurrency(stats?.revenue?.monthly || 0)}
					</p>
				</div>
			</Card>
			<Card
				className="card-glass-premium flex items-center justify-center"
				style={{
					background: 'var(--color-system-orange-10)',
					borderColor: 'var(--color-system-orange-25)',
					padding: 'var(--spacing-6)',
					aspectRatio: '16/9'
				}}
			>
				<div className="text-center">
					<Wrench
						style={{
							width: 'var(--spacing-8)',
							height: 'var(--spacing-8)',
							margin: '0 auto var(--spacing-2)',
							color: 'var(--color-system-orange)'
						}}
					/>
					<p
						style={{
							fontSize: 'var(--font-footnote)',
							fontWeight: 600,
							color: 'var(--color-system-orange-85)',
							marginBottom: 'var(--spacing-1)'
						}}
					>
						Maintenance Requests
					</p>
					<p
						style={{
							fontSize: 'var(--font-title-1)',
							fontWeight: 700,
							color: 'var(--color-label-primary)'
						}}
					>
						{stats?.maintenance?.total
							?.toString()
							.replace(/\B(?=(\d{3})+(?!\d))/g, ',') || '0'}
					</p>
				</div>
			</Card>
		</div>
	)
}