import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
} from '@react-email/components'

interface PropertyTipsEmailProps {
  firstName?: string
  tipCategory?: 'maintenance' | 'financial' | 'tenant-relations' | 'legal' | 'marketing'
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
            description: 'Schedule professional HVAC cleaning and filter replacements before summer heat.',
            action: 'Spring cleaning increases efficiency by 15% and extends equipment life.',
            priority: 'High'
          },
          {
            icon: '🏡',
            title: 'Exterior Inspection',
            description: 'Check for winter damage on roofs, gutters, and exterior walls.',
            action: 'Early repairs prevent costly water damage during spring rains.',
            priority: 'High'
          },
          {
            icon: '🌿',
            title: 'Landscaping Plan',
            description: 'Plan landscaping improvements to boost curb appeal for spring renters.',
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
            description: 'Ensure air conditioning systems are running efficiently during peak season.',
            action: 'Regular maintenance prevents 80% of AC emergency calls.',
            priority: 'High'
          },
          {
            icon: '💧',
            title: 'Plumbing Check',
            description: 'Inspect sprinkler systems and outdoor plumbing for leaks.',
            action: 'Early leak detection saves thousands in water damage.',
            priority: 'High'
          },
          {
            icon: '🌞',
            title: 'Energy Efficiency',
            description: 'Install programmable thermostats and energy-efficient lighting.',
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
            description: 'Clean gutters and downspouts before heavy rains and snow.',
            action: 'Proper drainage prevents foundation and roof damage.',
            priority: 'High'
          },
          {
            icon: '🔥',
            title: 'Heating System Prep',
            description: 'Service heating systems and chimney inspections before winter.',
            action: 'Preventive maintenance reduces emergency repair costs by 60%.',
            priority: 'High'
          },
          {
            icon: '🌡️',
            title: 'Weatherproofing',
            description: 'Seal windows, doors, and any air leaks to improve energy efficiency.',
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
            description: 'Insulate pipes and prepare properties for freezing temperatures.',
            action: 'Pipe insulation prevents 90% of freeze-related damage.',
            priority: 'High'
          },
          {
            icon: '❄️',
            title: 'Snow Removal Plan',
            description: 'Establish clear snow removal protocols and emergency contacts.',
            action: 'Quick snow removal prevents slip-and-fall liability.',
            priority: 'High'
          },
          {
            icon: '🏠',
            title: 'Emergency Preparedness',
            description: 'Ensure tenants know emergency procedures and contact information.',
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
    <Html>
      <Head />
      <Preview>{categoryData.title} - {seasonalData.title} Tips from TenantFlow</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto py-8 px-4 max-w-2xl">
            {/* Header */}
            <Section className="bg-white rounded-t-lg px-8 py-6 border-b border-gray-200">
              <Img
                src="https://tenantflow.com/logo-email.png"
                width="180"
                height="60"
                alt="TenantFlow"
                className="mx-auto"
              />
            </Section>

            {/* Main Content */}
            <Section className="bg-white px-8 py-6">
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">{categoryData.emoji}</div>
                <Heading className="text-2xl font-bold text-gray-800 mb-2">
                  {categoryData.title}
                </Heading>
                <Text className="text-gray-600 text-lg">
                  {categoryData.subtitle}
                </Text>
              </div>
              
              <Text className="text-gray-600 mb-6">
                Hi {firstName}, here are this month's expert tips to help you manage your {propertyCount > 1 ? 'properties' : 'property'} more effectively.
              </Text>

              {/* Seasonal Focus */}
              <Section className={`bg-${categoryData.color}-50 border-l-4 border-${categoryData.color}-500 p-6 mb-6 rounded-r-lg`}>
                <Heading className={`text-lg font-semibold text-${categoryData.color}-800 mb-3`}>
                  🗓️ {seasonalData.title}
                </Heading>
                <Text className={`text-${categoryData.color}-700`}>
                  Take advantage of the season with these timely property management strategies.
                </Text>
              </Section>

              {/* Main Tips */}
              <Section className="mb-6">
                <Heading className="text-xl font-semibold text-gray-800 mb-4">
                  🎯 This Month's Action Items
                </Heading>
                
                <div className="space-y-6">
                  {seasonalData.tips.map((tip, index) => (
                    <div key={index} className="bg-gray-50 border border-gray-200 p-6 rounded-lg">
                      <div className="flex items-start gap-4">
                        <div className="text-3xl">{tip.icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Heading className="text-lg font-semibold text-gray-800">
                              {tip.title}
                            </Heading>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              tip.priority === 'High' 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {tip.priority}
                            </span>
                          </div>
                          <Text className="text-gray-700 mb-3">
                            {tip.description}
                          </Text>
                          <div className="bg-white p-3 rounded border-l-3 border-blue-400">
                            <Text className="text-blue-800 font-medium text-sm">
                              💡 Pro Tip: {tip.action}
                            </Text>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Industry Statistics */}
              <Section className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-6 mb-6 rounded-lg">
                <Heading className="text-lg font-semibold text-blue-800 mb-4">
                  📈 Industry Insights
                </Heading>
                <div className="space-y-2">
                  {industryStats.map((stat, index) => (
                    <Text key={index} className="text-blue-700 text-sm">
                      {stat}
                    </Text>
                  ))}
                </div>
              </Section>

              {/* Tools & Resources */}
              <Section className="mb-6">
                <Heading className="text-lg font-semibold text-gray-800 mb-4">
                  🛠️ Helpful Resources
                </Heading>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <Text className="font-semibold text-green-800 mb-2">
                      📋 Maintenance Checklist
                    </Text>
                    <Text className="text-green-700 text-sm mb-3">
                      Seasonal maintenance templates to keep your properties in top shape.
                    </Text>
                    <Button
                      href="https://tenantflow.com/resources/maintenance-checklist?source=tips_email"
                      className="bg-green-600 text-white px-4 py-2 rounded font-medium hover:bg-green-700 transition-colors text-sm w-full"
                    >
                      Download Checklist
                    </Button>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                    <Text className="font-semibold text-purple-800 mb-2">
                      📞 Vendor Directory
                    </Text>
                    <Text className="text-purple-700 text-sm mb-3">
                      Find trusted contractors and service providers in your area.
                    </Text>
                    <Button
                      href="https://tenantflow.com/vendors?source=tips_email"
                      className="bg-purple-600 text-white px-4 py-2 rounded font-medium hover:bg-purple-700 transition-colors text-sm w-full"
                    >
                      Find Vendors
                    </Button>
                  </div>
                </div>
              </Section>

              {/* Implementation in TenantFlow */}
              <Section className="bg-blue-50 border border-blue-200 p-6 mb-6 rounded-lg">
                <Heading className="text-lg font-semibold text-blue-800 mb-3">
                  🚀 Track This in TenantFlow
                </Heading>
                <Text className="text-blue-700 mb-4">
                  Use TenantFlow's maintenance tracking to implement these tips:
                </Text>
                <ul className="text-blue-700 text-sm space-y-1 mb-4">
                  <li>• Schedule recurring maintenance tasks</li>
                  <li>• Track vendor contacts and service history</li>
                  <li>• Set up automated reminders for seasonal tasks</li>
                  <li>• Monitor maintenance costs and ROI</li>
                </ul>
                <Button
                  href="https://tenantflow.com/maintenance?source=tips_email"
                  className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700 transition-colors"
                >
                  Open Maintenance Dashboard
                </Button>
              </Section>

              {/* Next Month Preview */}
              <Section className="bg-gray-50 p-4 rounded-lg">
                <Text className="text-gray-600 mb-2">
                  <strong>Next Month:</strong>
                </Text>
                <Text className="text-gray-600 text-sm mb-0">
                  We'll cover tenant retention strategies and lease renewal best practices. Stay tuned!
                </Text>
              </Section>
            </Section>

            {/* Footer */}
            <Section className="bg-gray-100 px-8 py-6 rounded-b-lg text-center">
              <Text className="text-gray-500 text-sm mb-2">
                Keep your properties profitable and well-maintained,<br />
                The TenantFlow Property Management Team
              </Text>
              <Hr className="border-gray-300 my-4" />
              <Text className="text-gray-400 text-xs">
                Want different tips?{' '}
                <Link href="https://tenantflow.com/email-preferences" className="text-gray-400 underline">
                  Update preferences
                </Link>{' '}
                |{' '}
                <Link href="https://tenantflow.com/unsubscribe" className="text-gray-400 underline">
                  Unsubscribe
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}