'use client'

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { DollarSign, Building, Users, Wrench, FileText, TrendingUp, Home, Calendar } from 'lucide-react'
import type { MetricConfig, PageType } from '@repo/shared/types/frontend'

const getPageTypeFromPath = (pathname: string): PageType => {
	if (pathname.includes('/properties')) return 'properties'
	if (pathname.includes('/leases')) return 'leases'
	if (pathname.includes('/tenants')) return 'tenants'
	if (pathname.includes('/maintenance')) return 'maintenance'
	if (pathname.includes('/manage') || pathname.includes('/tenant')) return 'dashboard'
	return 'unknown'
}

const generateSparklineData = (baseValue: number, variance: number = 0.1): Array<{ value: number; period: string }> => {
	const periods = ['6 months ago', '5 months ago', '4 months ago', '3 months ago', '2 months ago', 'Last month', 'This month']
	return periods.map((period) => ({
		value: Math.round(baseValue + (Math.random() - 0.5) * baseValue * variance),
		period
	}))
}

const metricsConfig: Record<PageType, MetricConfig[]> = {
	dashboard: [
		{
			title: 'Total Revenue',
			value: '$152,000',
			description: 'Monthly recurring revenue',
			change: { value: '+12.5%', trend: 'up', period: 'vs last month' },
			sparkline: generateSparklineData(152000),
			icon: DollarSign,
			colorVariant: 'revenue'
		},
		{
			title: 'Active Properties',
			value: 45,
			description: 'Properties under management',
			change: { value: '+8.2%', trend: 'up', period: 'vs last month' },
			progress: { current: 45, target: 50, label: 'goal' },
			icon: Building,
			colorVariant: 'property'
		},
		{
			title: 'Occupancy Rate',
			value: '94%',
			description: 'Current occupancy percentage',
			change: { value: '-2.1%', trend: 'down', period: 'vs last month' },
			sparkline: generateSparklineData(94),
			icon: TrendingUp,
			colorVariant: 'warning'
		},
		{
			title: 'Total Tenants',
			value: 287,
			description: 'Active tenants across portfolio',
			change: { value: '+5.3%', trend: 'up', period: 'vs last month' },
			icon: Users,
			colorVariant: 'info'
		}
	],
	properties: [
		{
			title: 'Total Properties',
			value: 45,
			description: 'Properties in portfolio',
			change: { value: '+3', trend: 'up', period: 'this month' },
			progress: { current: 45, target: 50, label: 'target' },
			icon: Building,
			colorVariant: 'primary'
		},
		{
			title: 'Property Value',
			value: '$12.5M',
			description: 'Total portfolio value',
			change: { value: '+8.2%', trend: 'up', period: 'vs last quarter' },
			sparkline: generateSparklineData(12500000),
			icon: TrendingUp,
			colorVariant: 'success'
		},
		{
			title: 'Vacant Units',
			value: 23,
			description: 'Units available for rent',
			change: { value: '-5', trend: 'down', period: 'this week' },
			icon: Home,
			colorVariant: 'warning'
		},
		{
			title: 'Average Rent',
			value: '$1,850',
			description: 'Average monthly rent',
			change: { value: '+2.3%', trend: 'up', period: 'vs last year' },
			sparkline: generateSparklineData(1850),
			icon: DollarSign,
			colorVariant: 'revenue'
		}
	],
	leases: [
		{
			title: 'Active Leases',
			value: 287,
			description: 'Currently active lease agreements',
			change: { value: '+12', trend: 'up', period: 'this month' },
			progress: { current: 287, target: 300, label: 'capacity' },
			icon: FileText,
			colorVariant: 'primary'
		},
		{
			title: 'Expiring Soon',
			value: 18,
			description: 'Leases expiring in 30 days',
			change: { value: '+3', trend: 'up', period: 'vs last month' },
			icon: Calendar,
			colorVariant: 'warning'
		},
		{
			title: 'Renewal Rate',
			value: '89%',
			description: 'Tenant renewal percentage',
			change: { value: '+4.1%', trend: 'up', period: 'vs last year' },
			sparkline: generateSparklineData(89),
			icon: TrendingUp,
			colorVariant: 'success'
		},
		{
			title: 'Lease Revenue',
			value: '$143,500',
			description: 'Monthly lease income',
			change: { value: '+6.7%', trend: 'up', period: 'vs last month' },
			sparkline: generateSparklineData(143500),
			icon: DollarSign,
			colorVariant: 'revenue'
		}
	],
	tenants: [
		{
			title: 'Total Tenants',
			value: 287,
			description: 'Active tenants in portfolio',
			change: { value: '+15', trend: 'up', period: 'this month' },
			progress: { current: 287, target: 320, label: 'max capacity' },
			icon: Users,
			colorVariant: 'primary'
		},
		{
			title: 'New Tenants',
			value: 24,
			description: 'New tenants this month',
			change: { value: '+8', trend: 'up', period: 'vs last month' },
			icon: Users,
			colorVariant: 'success'
		},
		{
			title: 'Satisfaction Rate',
			value: '4.6/5',
			description: 'Average tenant satisfaction',
			change: { value: '+0.2', trend: 'up', period: 'vs last quarter' },
			sparkline: generateSparklineData(4.6, 0.05),
			icon: TrendingUp,
			colorVariant: 'info'
		},
		{
			title: 'Average Stay',
			value: '2.3 years',
			description: 'Average tenant duration',
			change: { value: '+3 months', trend: 'up', period: 'vs last year' },
			icon: Calendar,
			colorVariant: 'neutral'
		}
	],
	maintenance: [
		{
			title: 'Open Requests',
			value: 23,
			description: 'Active maintenance requests',
			change: { value: '-8', trend: 'down', period: 'vs last week' },
			progress: { current: 23, target: 0, label: 'target' },
			icon: Wrench,
			colorVariant: 'warning'
		},
		{
			title: 'Avg Response Time',
			value: '4.2 hours',
			description: 'Average response time',
			change: { value: '-1.3h', trend: 'down', period: 'vs last month' },
			sparkline: generateSparklineData(4.2, 0.2),
			icon: TrendingUp,
			colorVariant: 'success'
		},
		{
			title: 'Monthly Cost',
			value: '$8,500',
			description: 'Maintenance expenses this month',
			change: { value: '+12%', trend: 'up', period: 'vs last month' },
			sparkline: generateSparklineData(8500),
			icon: DollarSign,
			colorVariant: 'revenue'
		},
		{
			title: 'Completion Rate',
			value: '96%',
			description: 'Requests completed on time',
			change: { value: '+2%', trend: 'up', period: 'vs last quarter' },
			icon: TrendingUp,
			colorVariant: 'info'
		}
	],
	unknown: [
		{
			title: 'Total Revenue',
			value: '$152,000',
			description: 'Monthly recurring revenue',
			change: { value: '+12.5%', trend: 'up', period: 'vs last month' },
			icon: DollarSign,
			colorVariant: 'revenue'
		}
	]
}

export const useContextualMetrics = () => {
	const pathname = usePathname()

	const currentPage = useMemo(() => getPageTypeFromPath(pathname), [pathname])

	const metrics = useMemo(() => {
		return metricsConfig[currentPage] || metricsConfig.dashboard
	}, [currentPage])

	return {
		metrics,
		currentPage,
		pageTitle: currentPage.charAt(0).toUpperCase() + currentPage.slice(1)
	}
}

export default useContextualMetrics