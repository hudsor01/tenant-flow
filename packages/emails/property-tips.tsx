import * as React from 'react'
import {
	Button,
	Heading,
	Link,
	Section,
	Text
} from '@react-email/components'
import BaseEmailTemplate from './base-email-template'

interface PropertyTipsEmailProps {
	firstName?: string
	tipCategory?:
		| 'maintenance'
		| 'financial'
		| 'tenant-relations'
		| 'legal'
		| 'marketing'
	seasonalFocus?: 'spring' | 'summer' | 'fall' | 'winter'
	propertyCount?: number
}

export default function PropertyTipsEmail({
	firstName = 'Property Manager',
	tipCategory = 'maintenance',
	seasonalFocus = 'spring',
	propertyCount = 1
}: PropertyTipsEmailProps) {
	const getCategoryData = () => {
		switch (tipCategory) {
			case 'maintenance':
				return {
					emoji: '🔧',
					title: 'Essential Maintenance Tips',
					subtitle: 'Keep your properties in top condition',
					color: 'blue'
				}
			case 'financial':
				return {
					emoji: '💰',
					title: 'Financial Management Strategies',
					subtitle: 'Maximize your rental income',
					color: 'green'
				}
			case 'tenant-relations':
				return {
					emoji: '🤝',
					title: 'Tenant Relationship Excellence',
					subtitle: 'Happy tenants = stable income',
					color: 'purple'
				}
			case 'legal':
				return {
					emoji: '⚖️',
					title: 'Legal Compliance Guide',
					subtitle: 'Stay protected and compliant',
					color: 'red'
				}
			case 'marketing':
				return {
					emoji: '📢',
					title: 'Property Marketing Mastery',
					subtitle: 'Fill vacancies faster',
					color: 'orange'
				}
			default:
				return {
					emoji: '🏠',
					title: 'Property Management Tips',
					subtitle: 'Expert advice for landlords',
					color: 'blue'
				}
		}
	}

	const getSeasonalTips = () => {
		const seasonalData = {
			spring: {
				title: 'Spring Property Preparation',
				tips: [
					{
						icon: '🌱',
						title: 'HVAC Spring Cleaning',
						description:
							'Schedule  HVAC cleaning and filter replacements before summer heat.',
						action: 'Spring cleaning increases efficiency by 15% and extends equipment life.',
						priority: 'High'
					},
					{
						icon: '🏡',
						title: 'Exterior Inspection',
						description:
							'Check for winter damage on roofs, gutters, and exterior walls.',
						action: 'Early repairs prevent costly water damage during spring rains.',
						priority: 'High'
					},
					{
						icon: '🌿',
						title: 'Landscaping Plan',
						description:
							'Plan landscaping improvements to boost curb appeal for spring renters.',
						action: 'Good landscaping can increase property value by 5-10%.',
						priority: 'Medium'
					}
				]
			},
			summer: {
				title: 'Summer Property Care',
				tips: [
					{
						icon: '❄️',
						title: 'AC System Optimization',
						description:
							'Ensure air conditioning systems are running efficiently during peak season.',
						action: 'Regular maintenance prevents 80% of AC emergency calls.',
						priority: 'High'
					},
					{
						icon: '💧',
						title: 'Plumbing Check',
						description:
							'Inspect sprinkler systems and outdoor plumbing for leaks.',
						action: 'Early leak detection saves thousands in water damage.',
						priority: 'High'
					},
					{
						icon: '🌞',
						title: 'Energy Efficiency',
						description:
							'Install programmable thermostats and energy-efficient lighting.',
						action: 'Energy improvements reduce utility costs by 20-30%.',
						priority: 'Medium'
					}
				]
			},
			fall: {
				title: 'Fall Preparation Checklist',
				tips: [
					{
						icon: '🍂',
						title: 'Gutter Maintenance',
						description:
							'Clean gutters and downspouts before heavy rains and snow.',
						action: 'Proper drainage prevents foundation and roof damage.',
						priority: 'High'
					},
					{
						icon: '🔥',
						title: 'Heating System Prep',
						description:
							'Service heating systems and chimney inspections before winter.',
						action: 'Preventive maintenance reduces emergency repair costs by 60%.',
						priority: 'High'
					},
					{
						icon: '🌡️',
						title: 'Weatherproofing',
						description:
							'Seal windows, doors, and any air leaks to improve energy efficiency.',
						action: 'Proper sealing reduces heating costs by 15-25%.',
						priority: 'Medium'
					}
				]
			},
			winter: {
				title: 'Winter Protection Strategy',
				tips: [
					{
						icon: '🧊',
						title: 'Freeze Prevention',
						description:
							'Insulate pipes and prepare properties for freezing temperatures.',
						action: 'Pipe insulation prevents 90% of freeze-related damage.',
						priority: 'High'
					},
					{
						icon: '❄️',
						title: 'Snow Removal Plan',
						description:
							'Establish clear snow removal protocols and emergency contacts.',
						action: 'Quick snow removal prevents slip-and-fall liability.',
						priority: 'High'
					},
					{
						icon: '🏠',
						title: 'Emergency Preparedness',
						description:
							'Ensure tenants know emergency procedures and contact information.',
						action: 'Prepared tenants prevent minor issues from becoming major problems.',
						priority: 'Medium'
					}
				]
			}
		}
		return seasonalData[seasonalFocus]
	}

	const categoryData = getCategoryData()
	const seasonalData = getSeasonalTips()

	const industryStats = [
		'💡 Proactive maintenance costs 60% less than reactive repairs',
		'📊 Properties with regular maintenance retain 95% of their value',
		'⏰ Scheduled maintenance reduces tenant complaints by 70%',
		'💰 Energy-efficient upgrades pay for themselves within 2-3 years'
	]

	return (
		<BaseEmailTemplate
			previewText={`${categoryData.title} - ${seasonalData.title} Tips from TenantFlow`}
			footerMessage="Keep your properties profitable and well-maintained"
			footerSignature="The TenantFlow Property Management Team"
			unsubscribeText="Want different tips?"
		>
							<div className="mb-6 text-center">
								<div className="mb-3 text-4xl">
									{categoryData.emoji}
								</div>
								<Heading className="mb-2 text-2xl font-bold text-gray-800">
									{categoryData.title}
								</Heading>
								<Text className="text-lg text-gray-600">
									{categoryData.subtitle}
								</Text>
							</div>

							<Text className="mb-6 text-gray-600">
								Hi {firstName}, here are this month's expert
								tips to help you manage your{' '}
								{propertyCount > 1 ? 'properties' : 'property'}{' '}
								more effectively.
							</Text>

							{/* Seasonal Focus */}
							<Section
								className={`bg-${categoryData.color}-50 border-l-4 border-${categoryData.color}-500 mb-6 rounded-r-lg p-6`}
							>
								<Heading
									className={`text-lg font-semibold text-${categoryData.color}-800 mb-3`}
								>
									🗓️ {seasonalData.title}
								</Heading>
								<Text
									className={`text-${categoryData.color}-700`}
								>
									Take advantage of the season with these
									timely property management strategies.
								</Text>
							</Section>

							{/* Main Tips */}
							<Section className="mb-6">
								<Heading className="mb-4 text-xl font-semibold text-gray-800">
									🎯 This Month's Action Items
								</Heading>

								<div className="space-y-6">
									{seasonalData.tips.map((tip, index) => (
										<div
											key={index}
											className="rounded-lg border border-gray-200 bg-gray-50 p-6"
										>
											<div className="flex items-start gap-4">
												<div className="text-3xl">
													{tip.icon}
												</div>
												<div className="flex-1">
													<div className="mb-2 flex items-center gap-3">
														<Heading className="text-lg font-semibold text-gray-800">
															{tip.title}
														</Heading>
														<span
															className={`rounded px-2 py-1 text-xs font-medium ${
																tip.priority ===
																'High'
																	? 'bg-red-100 text-red-800'
																	: 'bg-yellow-100 text-yellow-800'
															}`}
														>
															{tip.priority}
														</span>
													</div>
													<Text className="mb-3 text-gray-700">
														{tip.description}
													</Text>
													<div className="rounded border-l-3 border-blue-400 bg-white p-3">
														<Text className="text-sm font-medium text-blue-800">
															💡 Pro Tip:{' '}
															{tip.action}
														</Text>
													</div>
												</div>
											</div>
										</div>
									))}
								</div>
							</Section>

							{/* Industry Statistics */}
							<Section className="mb-6 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
								<Heading className="mb-4 text-lg font-semibold text-blue-800">
									📈 Industry Insights
								</Heading>
								<div className="space-y-2">
									{industryStats.map((stat, index) => (
										<Text
											key={index}
											className="text-sm text-blue-700"
										>
											{stat}
										</Text>
									))}
								</div>
							</Section>

							{/* Tools & Resources */}
							<Section className="mb-6">
								<Heading className="mb-4 text-lg font-semibold text-gray-800">
									🛠️ Helpful Resources
								</Heading>

								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<div className="rounded-lg border border-green-200 bg-green-50 p-4">
										<Text className="mb-2 font-semibold text-green-800">
											📋 Maintenance Checklist
										</Text>
										<Text className="mb-3 text-sm text-green-700">
											Seasonal maintenance templates to
											keep your properties in top shape.
										</Text>
										<Button
											href="https://tenantflow.app/resources/maintenance-checklist?source=tips_email"
											className="w-full rounded bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
										>
											Download Checklist
										</Button>
									</div>

									<div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
										<Text className="mb-2 font-semibold text-purple-800">
											📞 Vendor Directory
										</Text>
										<Text className="mb-3 text-sm text-purple-700">
											Find trusted contractors and service
											providers in your area.
										</Text>
										<Button
											href="https://tenantflow.app/vendors?source=tips_email"
											className="w-full rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
										>
											Find Vendors
										</Button>
									</div>
								</div>
							</Section>

							{/* Implementation in TenantFlow */}
							<Section className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-6">
								<Heading className="mb-3 text-lg font-semibold text-blue-800">
									🚀 Track This in TenantFlow
								</Heading>
								<Text className="mb-4 text-blue-700">
									Use TenantFlow's maintenance tracking to
									implement these tips:
								</Text>
								<ul className="mb-4 space-y-1 text-sm text-blue-700">
									<li>
										• Schedule recurring maintenance tasks
									</li>
									<li>
										• Track vendor contacts and service
										history
									</li>
									<li>
										• Set up automated reminders for
										seasonal tasks
									</li>
									<li>• Monitor maintenance costs and ROI</li>
								</ul>
								<Button
									href="https://tenantflow.app/maintenance?source=tips_email"
									className="rounded bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700"
								>
									Open Maintenance Dashboard
								</Button>
							</Section>

							{/* Next Month Preview */}
							<Section className="rounded-lg bg-gray-50 p-4">
								<Text className="mb-2 text-gray-600">
									<strong>Next Month:</strong>
								</Text>
								<Text className="mb-0 text-sm text-gray-600">
									We'll cover tenant retention strategies and
									lease renewal best practices. Stay tuned!
								</Text>
							</Section>
		</BaseEmailTemplate>
	)
}
