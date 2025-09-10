'use client'

import { 
  cn
} from '@/lib/design-system'
import { animated, config, useSpring, useTrail } from '@react-spring/web'
import { Play, User, CreditCard, Wrench, FileText } from 'lucide-react'
import React from 'react'

function FeaturesSectionDemo() {
	const features = [
		{
			title: 'Manage Properties Effectively',
			description:
				'Track occupancy, collect rent, and manage maintenance requests across all your properties.',
			skeleton: <SkeletonOne />,
			className:
				'col-span-1 lg:col-span-4 border-b lg:border-r dark:border-neutral-800'
		},
		{
			title: 'Tenant Management',
			description:
				'Handle tenant applications, leases, and communications in one centralized platform.',
			skeleton: <SkeletonTwo />,
			className: 'border-b col-span-1 lg:col-span-2 dark:border-neutral-800'
		},
		{
			title: 'Financial Dashboard',
			description:
				'Monitor rental income, expenses, and property performance with real-time analytics.',
			skeleton: <SkeletonThree />,
			className: 'col-span-1 lg:col-span-3 lg:border-r  dark:border-neutral-800'
		},
		{
			title: 'Automated Workflows',
			description:
				'Streamline rent collection, lease renewals, and maintenance scheduling with smart automation.',
			skeleton: <SkeletonFour />,
			className: 'col-span-1 lg:col-span-3 border-b lg:border-none'
		}
	]
	return (
		<div className="relative z-20 py-10 lg:py-40 max-w-7xl mx-auto">
			<div className="px-8">
				<h4 className="text-3xl lg:text-5xl lg:leading-tight max-w-5xl mx-auto text-center tracking-tight font-medium text-black dark:text-white">
					Everything you need to manage rental properties
				</h4>

				<p className="text-sm lg:text-base  max-w-2xl  my-4 mx-auto text-neutral-500 text-center font-normal dark:text-neutral-300">
					From tenant screening to rent collection, TenantFlow provides all the
					tools property managers need to streamline their operations and
					maximize returns.
				</p>
			</div>

			<div className="relative ">
				<div className="grid grid-cols-1 lg:grid-cols-6 mt-12 xl:border rounded-md dark:border-neutral-800">
					{features.map(feature => (
						<FeatureCard key={feature.title} className={feature.className}>
							<FeatureTitle>{feature.title}</FeatureTitle>
							<FeatureDescription>{feature.description}</FeatureDescription>
							<div className=" h-full w-full">{feature.skeleton}</div>
						</FeatureCard>
					))}
				</div>
			</div>
		</div>
	)
}

const FeatureCard = ({
	children,
	className
}: {
	children?: React.ReactNode
	className?: string
}) => {
	return (
		<div className={cn(`p-4 sm:p-8 relative overflow-hidden`, className)}>
			{children}
		</div>
	)
}

const FeatureTitle = ({ children }: { children?: React.ReactNode }) => {
	return (
		<p className=" max-w-5xl mx-auto text-left tracking-tight text-black dark:text-white text-xl md:text-2xl md:leading-snug">
			{children}
		</p>
	)
}

const FeatureDescription = ({ children }: { children?: React.ReactNode }) => {
	return (
		<p
			className={cn(
				'text-sm md:text-base  max-w-4xl text-left mx-auto',
				'text-neutral-500 text-center font-normal dark:text-neutral-300',
				'text-left max-w-sm mx-0 md:text-sm my-2'
			)}
		>
			{children}
		</p>
	)
}

export const SkeletonOne = () => {
	const properties = [
		{
			id: 1,
			name: 'Sunset Apartments',
			units: 12,
			occupied: 10,
			rent: '$15,600',
			status: 'Active'
		},
		{
			id: 2,
			name: 'Oak Street Duplex',
			units: 2,
			occupied: 2,
			rent: '$3,400',
			status: 'Active'
		},
		{
			id: 3,
			name: 'Downtown Lofts',
			units: 8,
			occupied: 6,
			rent: '$9,600',
			status: 'Maintenance'
		},
		{
			id: 4,
			name: 'Garden View Condos',
			units: 6,
			occupied: 4,
			rent: '$7,200',
			status: 'Active'
		}
	]

	return (
		<div className="relative flex py-8 px-2 gap-10 h-full">
			<div className="w-full p-5 mx-auto bg-white dark:bg-neutral-900 shadow-2xl group h-full">
				<div className="flex flex-1 w-full h-full flex-col space-y-3">
					<div className="flex justify-between items-center mb-4">
						<h3 className="font-semibold text-gray-900 dark:text-white">
							Property Portfolio
						</h3>
						<div className="text-xs text-gray-500 dark:text-gray-400">
							28 units • 88% occupied
						</div>
					</div>
					<div className="space-y-3">
						{properties.map(property => (
							<div
								key={property.id}
								className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg"
							>
								<div className="flex-1">
									<div className="font-medium text-sm text-gray-900 dark:text-white">
										{property.name}
									</div>
									<div className="text-xs text-gray-500 dark:text-gray-400">
										{property.occupied}/{property.units} units occupied
									</div>
								</div>
								<div className="flex items-center space-x-3">
									<div className="text-right">
										<div className="text-sm font-semibold text-green-600 dark:text-green-400">
											{property.rent}
										</div>
										<div className="text-xs text-gray-500 dark:text-gray-400">
											monthly
										</div>
									</div>
									<span
										className={`px-2 py-1 text-xs rounded-full ${
											property.status === 'Active'
												? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
												: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
										}`}
									>
										{property.status}
									</span>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			<div className="absolute bottom-0 z-40 inset-x-0 h-60 bg-gradient-to-t from-white dark:from-black via-white dark:via-black to-transparent w-full pointer-events-none" />
			<div className="absolute top-0 z-40 inset-x-0 h-60 bg-gradient-to-b from-white dark:from-black via-transparent to-transparent w-full pointer-events-none" />
		</div>
	)
}

export const SkeletonThree = () => {
	const financialData = [
		{ label: 'Monthly Revenue', value: '$36,800', change: '+12%' },
		{ label: 'Operating Expenses', value: '$8,400', change: '-3%' },
		{ label: 'Net Income', value: '$28,400', change: '+15%' }
	]

	return (
		<div className="relative flex gap-10 h-full">
			<div className="w-full mx-auto bg-white dark:bg-neutral-900 p-6 rounded-lg h-full">
				<div className="flex flex-1 w-full h-full flex-col space-y-4">
					<h3 className="font-semibold text-gray-900 dark:text-white">
						Financial Dashboard
					</h3>

					<div className="grid grid-cols-1 gap-4">
						{financialData.map((item, idx) => (
							<div
								key={idx}
								className="p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg"
							>
								<div className="flex justify-between items-center">
									<div>
										<div className="text-xs text-gray-500 dark:text-gray-400">
											{item.label}
										</div>
										<div className="text-lg font-bold text-gray-900 dark:text-white">
											{item.value}
										</div>
									</div>
									<div
										className={`text-sm font-medium ${
											item.change.startsWith('+')
												? 'text-green-600 dark:text-green-400'
												: 'text-red-600 dark:text-red-400'
										}`}
									>
										{item.change}
									</div>
								</div>
							</div>
						))}
					</div>

					<div className="mt-4">
						<div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
							<span>Occupancy Rate</span>
							<span>88%</span>
						</div>
						<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
							<div
								className="bg-blue-500 h-2 rounded-full"
								style={{ width: '88%' }}
							></div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export const SkeletonTwo = () => {
	const tenants = [
		{
			name: 'Sarah Johnson',
			unit: 'Apt 12A',
			status: 'Active',
			lease: '11 months left',
			avatar: 'SJ'
		},
		{
			name: 'Mike Chen',
			unit: 'Apt 8B',
			status: 'Pending',
			lease: 'Application review',
			avatar: 'MC'
		},
		{
			name: 'Emma Davis',
			unit: 'Apt 3C',
			status: 'Active',
			lease: '3 months left',
			avatar: 'ED'
		}
	]

	return (
		<div className="relative flex flex-col items-start p-6 gap-4 h-full overflow-hidden">
			<div className="w-full">
				<h3 className="font-semibold text-gray-900 dark:text-white mb-4">
					Tenant Management
				</h3>
				<div className="space-y-3">
					{tenants.map((tenant, idx) => (
						<div
							key={idx}
							className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg"
						>
							<div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
								{tenant.avatar}
							</div>
							<div className="flex-1">
								<div className="font-medium text-sm text-gray-900 dark:text-white">
									{tenant.name}
								</div>
								<div className="text-xs text-gray-500 dark:text-gray-400">
									{tenant.unit} • {tenant.lease}
								</div>
							</div>
							<span
								className={`px-2 py-1 text-xs rounded-full ${
									tenant.status === 'Active'
										? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
										: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
								}`}
							>
								{tenant.status}
							</span>
						</div>
					))}
				</div>

				<div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
					<div className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
						Quick Actions
					</div>
					<div className="flex gap-2 text-xs">
						<button className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
							Send Notice
						</button>
						<button className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
							Collect Rent
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}

export const SkeletonFour = () => {
	return (
		<div className="h-60 md:h-60  flex flex-col items-center relative bg-transparent dark:bg-transparent mt-10">
			<AutomationFlow className="absolute -right-10 md:-right-10 -bottom-80 md:-bottom-72" />
		</div>
	)
}

export const AutomationFlow = ({ className }: { className?: string }) => {
	const workflowSteps = [
		{ 
			id: 1, 
			title: 'Tenant Application', 
			description: 'Screen & approve',
			x: 80, 
			y: 80, 
			color: 'bg-blue-500',
			icon: User
		},
		{ 
			id: 2, 
			title: 'Automated Rent Collection', 
			description: 'Monthly payments',
			x: 320, 
			y: 80, 
			color: 'bg-green-500',
			icon: CreditCard
		},
		{ 
			id: 3, 
			title: 'Maintenance Requests', 
			description: 'Track & schedule',
			x: 320, 
			y: 200, 
			color: 'bg-orange-500',
			icon: Wrench
		},
		{ 
			id: 4, 
			title: 'Lease Management', 
			description: 'Renewals & notices',
			x: 80, 
			y: 200, 
			color: 'bg-purple-500',
			icon: FileText
		}
	]

	const connections = [
		{ from: 1, to: 2, label: 'Approved' },
		{ from: 2, to: 3, label: 'Issues arise' },
		{ from: 3, to: 4, label: 'Completed' },
		{ from: 4, to: 1, label: 'New cycle' }
	]

	// React Spring prebuilt animations
	const backgroundRings = useTrail(3, {
		from: { opacity: 0, transform: 'rotate(0deg) scale(0.8)' },
		to: { opacity: 1, transform: 'rotate(360deg) scale(1)' },
		config: config.molasses, // Prebuilt slow, smooth config
		loop: true
	})

	const centralHub = useSpring({
		from: { scale: 0, opacity: 0 },
		to: { scale: 1, opacity: 1 },
		config: config.gentle, // Prebuilt smooth config
		delay: 500
	})

	const nodeTrail = useTrail(workflowSteps.length, {
		from: { opacity: 0, scale: 0 },
		to: { opacity: 1, scale: 1 },
		config: config.wobbly, // Prebuilt bouncy config
		delay: 800
	})

	const connectionLines = useTrail(connections.length, {
		from: { strokeDashoffset: 100, opacity: 0 },
		to: { strokeDashoffset: 0, opacity: 0.7 },
		config: config.slow, // Prebuilt deliberate config
		delay: 1500
	})

	const particles = useTrail(8, {
		from: { opacity: 0.3, y: 0 },
		to: async next => {
			while (true) {
				await next({ opacity: 0.8, y: -20 })
				await next({ opacity: 0.3, y: 0 })
			}
		},
		config: config.gentle,
		delay: 2000
	})

	const labels = useTrail(2, {
		from: { opacity: 0, y: 20 },
		to: { opacity: 1, y: 0 },
		config: config.gentle,
		delay: 2500
	})

	return (
		<div className={cn('w-[700px] h-[600px] relative', className)}>
			<div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 to-purple-50/20 dark:from-blue-950/20 dark:to-purple-950/20 rounded-2xl">
				{/* Animated background circles */}
				{backgroundRings.map((style, index) => (
					<animated.div
						key={index}
						className={cn(
							'absolute rounded-full border',
							index === 0 &&
								'inset-0 border-blue-200/30 dark:border-blue-800/30',
							index === 1 &&
								'inset-4 border-green-200/30 dark:border-green-800/30',
							index === 2 &&
								'inset-8 border-purple-200/30 dark:border-purple-800/30'
						)}
						style={{
							...style,
							transform: style.transform.to(
								t => `${t} rotate(${index * 120}deg)`
							)
						}}
					/>
				))}

				{/* Central hub - TenantFlow logo/brand */}
				<animated.div
					className="absolute top-1/2 left-1/2 w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-2xl border-4 border-white/30"
					style={{
						...centralHub,
						transform: centralHub.scale.to(
							s => `translate(-50%, -50%) scale(${s})`
						)
					}}
				>
					<div className="text-center">
						<Play className="w-6 h-6 text-white mx-auto mb-1" />
						<div className="text-xs font-bold text-white">AUTO</div>
					</div>
				</animated.div>

				{/* Workflow Steps */}
				{nodeTrail.map((style, index) => {
					const step = workflowSteps[index]
					if (!step) return null
					const IconComponent = step.icon
					return (
						<animated.div
							key={step.id}
							className="absolute"
							style={{
								...style,
								left: step.x,
								top: step.y,
								transform: style.scale.to(s => `scale(${s})`)
							}}
						>
							<div className="flex flex-col items-center space-y-2">
								<div className={cn(
									'w-16 h-16 rounded-full flex items-center justify-center text-white shadow-xl border-4 border-white/20',
									step.color
								)}>
									<IconComponent className="w-6 h-6" />
								</div>
								<div className="text-center min-w-[120px]">
									<div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
										{step.title}
									</div>
									<div className="text-xs text-gray-600 dark:text-gray-400">
										{step.description}
									</div>
								</div>
							</div>
						</animated.div>
					)
				})}

				{/* Animated connection lines */}
				<svg className="absolute inset-0 w-full h-full pointer-events-none">
					{connectionLines.map((style, index) => {
						const connection = connections[index]
						if (!connection) return null
						const fromStep = workflowSteps.find(n => n.id === connection.from)
						const toStep = workflowSteps.find(n => n.id === connection.to)
						if (!fromStep || !toStep) return null

						return (
							<g key={`${connection.from}-${connection.to}`}>
								<animated.line
									x1={fromStep.x + 60}
									y1={fromStep.y + 32}
									x2={toStep.x + 60}
									y2={toStep.y + 32}
									stroke="url(#gradient)"
									strokeWidth="3"
									strokeDasharray="8,4"
									style={style}
								/>
								{connection.label && (
									<animated.text
										x={(fromStep.x + toStep.x) / 2 + 60}
										y={(fromStep.y + toStep.y) / 2 + 28}
										textAnchor="middle"
										className="fill-gray-600 dark:fill-gray-300 text-xs font-medium"
										style={{ opacity: style.opacity }}
									>
										{connection.label}
									</animated.text>
								)}
							</g>
						)
					})}
					<defs>
						<linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
							<stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
							<stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.8" />
							<stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
						</linearGradient>
					</defs>
				</svg>

				{/* Floating particles */}
				{particles.map((style, index) => (
					<animated.div
						key={index}
						className="absolute w-2 h-2 bg-blue-400/60 rounded-full"
						style={{
							...style,
							left: Math.random() * 500 + 50,
							top: Math.random() * 500 + 50,
							transform: style.y.to(y => `translateY(${y}px)`)
						}}
					/>
				))}

				{/* Labels */}
				<div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
					{labels.map((style, index) => (
						<animated.div
							key={index}
							className={cn(
								index === 0
									? 'text-sm font-medium text-gray-600 dark:text-gray-300'
									: 'text-xs text-gray-500 dark:text-gray-400 mt-1'
							)}
							style={{
								...style,
								transform: style.y.to(y => `translateY(${y}px)`)
							}}
						>
							{index === 0
								? 'Complete Property Management Workflow'
								: 'From tenant screening to lease renewal - all automated'}
						</animated.div>
					))}
				</div>
			</div>
		</div>
	)
}

// Named exports
export { FeaturesSectionDemo as FeaturesSectionDemo3 }
export default FeaturesSectionDemo
