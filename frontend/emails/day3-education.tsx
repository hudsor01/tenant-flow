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

interface Day3EducationEmailProps {
  firstName?: string
  propertyCount?: number
  lastLogin?: string
}

export default function Day3EducationEmail({
  firstName = 'Property Manager',
  propertyCount = 0,
  lastLogin = 'recently'
}: Day3EducationEmailProps) {
  const getTips = () => {
    if (propertyCount === 0) {
      return [
        {
          icon: '🏠',
          title: 'Add Your First Property',
          description: 'Start by adding your rental property details - address, type, and basic information.',
          actionText: 'Add Property',
          actionUrl: 'https://tenantflow.com/properties/new?source=day3_email'
        },
        {
          icon: '📋',
          title: 'Create Unit Listings',
          description: 'Set up individual units with rent amounts, bedrooms, and amenities.',
          actionText: 'Learn More',
          actionUrl: 'https://tenantflow.com/help/units?source=day3_email'
        },
        {
          icon: '👥',
          title: 'Invite Your First Tenant',
          description: 'Send secure invitations to tenants and streamline your onboarding process.',
          actionText: 'View Guide',
          actionUrl: 'https://tenantflow.com/help/tenants?source=day3_email'
        }
      ]
    } else if (propertyCount <= 3) {
      return [
        {
          icon: '💰',
          title: 'Automate Rent Collection',
          description: 'Set up automatic rent reminders and reduce late payments by 40%.',
          actionText: 'Setup Automation',
          actionUrl: 'https://tenantflow.com/payments/setup?source=day3_email'
        },
        {
          icon: '📊',
          title: 'Track Your Finances',
          description: 'Monitor income, expenses, and profitability across all your properties.',
          actionText: 'View Analytics',
          actionUrl: 'https://tenantflow.com/analytics?source=day3_email'
        },
        {
          icon: '🔧',
          title: 'Maintenance Management',
          description: 'Create maintenance workflows and track repair requests efficiently.',
          actionText: 'Get Started',
          actionUrl: 'https://tenantflow.com/maintenance?source=day3_email'
        }
      ]
    } else {
      return [
        {
          icon: '📈',
          title: 'Scale Your Portfolio',
          description: 'Advanced reporting and bulk operations for growing property portfolios.',
          actionText: 'Explore Enterprise',
          actionUrl: 'https://tenantflow.com/enterprise?source=day3_email'
        },
        {
          icon: '🤖',
          title: 'Advanced Automation',
          description: 'Implement smart workflows for lease renewals and tenant communications.',
          actionText: 'Setup Workflows',
          actionUrl: 'https://tenantflow.com/automation?source=day3_email'
        },
        {
          icon: '📱',
          title: 'Mobile Management',
          description: 'Manage properties on-the-go with our mobile-optimized interface.',
          actionText: 'Learn More',
          actionUrl: 'https://tenantflow.com/help/mobile?source=day3_email'
        }
      ]
    }
  }

  const tips = getTips()

  return (
    <Html>
      <Head />
      <Preview>Day 3: Advanced Property Management Strategies - TenantFlow</Preview>
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
              <Heading className="text-2xl font-bold text-gray-800 mb-4">
                Day 3: Advanced Strategies, {firstName} 📈
              </Heading>
              
              <Text className="text-gray-600 text-lg mb-6">
                Ready to take your property management to the next level? Here are personalized strategies based on your current setup.
              </Text>

              {/* Progress Indicator */}
              <Section className="bg-blue-50 border border-blue-200 p-6 mb-6 rounded-lg">
                <Text className="text-blue-800 font-semibold mb-2">
                  📊 Your Progress
                </Text>
                <Text className="text-blue-700 mb-2">
                  Properties: {propertyCount > 0 ? `${propertyCount} active` : 'Ready to start'}
                </Text>
                <Text className="text-blue-700 mb-0">
                  Last activity: {lastLogin}
                </Text>
              </Section>

              {/* Tips Section */}
              <Heading className="text-xl font-semibold text-gray-800 mb-4">
                🎯 Recommended Next Steps
              </Heading>

              {tips.map((tip, index) => (
                <Section key={index} className="bg-gray-50 border border-gray-200 p-6 mb-4 rounded-lg">
                  <div className="flex items-start gap-4">
                    <div className="text-2xl">{tip.icon}</div>
                    <div className="flex-1">
                      <Heading className="text-lg font-semibold text-gray-800 mb-2">
                        {tip.title}
                      </Heading>
                      <Text className="text-gray-600 mb-4">
                        {tip.description}
                      </Text>
                      <Button
                        href={tip.actionUrl}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        {tip.actionText}
                      </Button>
                    </div>
                  </div>
                </Section>
              ))}

              {/* Quick Win Section */}
              <Section className="bg-green-50 border-l-4 border-green-500 p-6 mb-6 rounded-r-lg">
                <Heading className="text-lg font-semibold text-green-800 mb-2">
                  💡 Quick Win This Week
                </Heading>
                <Text className="text-green-700 mb-4">
                  {propertyCount === 0 
                    ? "Add your first property and see how TenantFlow organizes everything automatically."
                    : "Set up automated rent reminders to reduce your late payment rate by 40%."
                  }
                </Text>
                <Button
                  href={propertyCount === 0 
                    ? "https://tenantflow.com/properties/new?source=day3_quickwin"
                    : "https://tenantflow.com/payments/automation?source=day3_quickwin"
                  }
                  className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  {propertyCount === 0 ? "Add Property" : "Setup Automation"}
                </Button>
              </Section>

              {/* Industry Insights */}
              <Section className="border-t border-gray-200 pt-6">
                <Heading className="text-lg font-semibold text-gray-800 mb-3">
                  📚 Industry Insights
                </Heading>
                <Text className="text-gray-600 mb-2">
                  📈 <strong>Market Trend:</strong> Digital rent collection adoption increased 67% in 2024
                </Text>
                <Text className="text-gray-600 mb-2">
                  ⏰ <strong>Time Savings:</strong> Automated workflows save property managers 15+ hours per week
                </Text>
                <Text className="text-gray-600 mb-4">
                  💼 <strong>Best Practice:</strong> Proactive maintenance reduces repair costs by 30%
                </Text>
              </Section>

              {/* What's Coming */}
              <Section className="bg-gray-50 p-4 rounded-lg">
                <Text className="text-gray-600 mb-2">
                  <strong>Coming up:</strong>
                </Text>
                <Text className="text-gray-600 mb-0">
                  🎯 <strong>Day 7:</strong> Personalized demo based on your specific needs and questions
                </Text>
              </Section>
            </Section>

            {/* Footer */}
            <Section className="bg-gray-100 px-8 py-6 rounded-b-lg text-center">
              <Text className="text-gray-500 text-sm mb-2">
                Questions? Reply to this email - we read every message!<br />
                The TenantFlow Team
              </Text>
              <Hr className="border-gray-300 my-4" />
              <Text className="text-gray-400 text-xs">
                You're receiving this as part of your TenantFlow onboarding series.{' '}
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