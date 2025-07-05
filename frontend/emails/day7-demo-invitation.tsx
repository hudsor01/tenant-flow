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

interface Day7DemoEmailProps {
  firstName?: string
  propertyCount?: number
  completedActions?: string[]
  timeZone?: string
}

export default function Day7DemoEmail({
  firstName = 'Property Manager',
  propertyCount = 0,
  completedActions = [],
  timeZone = 'America/New_York'
}: Day7DemoEmailProps) {
  const getPersonalizedDemo = () => {
    if (propertyCount === 0) {
      return {
        title: 'Getting Started Demo',
        description: 'Perfect for first-time setup - we\'ll walk through adding properties, creating units, and inviting your first tenants.',
        duration: '15 minutes',
        features: [
          'Property setup walkthrough',
          'Tenant invitation process',
          'Basic rent collection setup',
          'Q&A for your specific needs'
        ]
      }
    } else if (propertyCount <= 5) {
      return {
        title: 'Growth & Automation Demo',
        description: 'Ideal for growing portfolios - focus on automation, advanced features, and scaling your operations.',
        duration: '20 minutes',
        features: [
          'Advanced automation setup',
          'Financial reporting deep dive',
          'Maintenance workflow optimization',
          'Multi-property management tips'
        ]
      }
    } else {
      return {
        title: 'Enterprise Portfolio Demo',
        description: 'Designed for serious investors - enterprise features, bulk operations, and advanced analytics.',
        duration: '30 minutes',
        features: [
          'Enterprise dashboard overview',
          'Bulk operations and workflows',
          'Advanced analytics and reporting',
          'Custom integrations discussion'
        ]
      }
    }
  }

  const demo = getPersonalizedDemo()
  const completionRate = Math.round((completedActions.length / 8) * 100)

  return (
    <Html>
      <Head />
      <Preview>Day 7: Your Personalized TenantFlow Demo Invitation</Preview>
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
                Ready for Your Personal Demo, {firstName}? 🎯
              </Heading>
              
              <Text className="text-gray-600 text-lg mb-6">
                You've been exploring TenantFlow for a week now. Let's have a personalized conversation about your specific property management goals.
              </Text>

              {/* Progress Summary */}
              <Section className="bg-blue-50 border border-blue-200 p-6 mb-6 rounded-lg">
                <Heading className="text-lg font-semibold text-blue-800 mb-3">
                  📊 Your Week 1 Progress
                </Heading>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Text className="text-blue-700 font-medium mb-1">Properties Added</Text>
                    <Text className="text-2xl font-bold text-blue-800">{propertyCount}</Text>
                  </div>
                  <div>
                    <Text className="text-blue-700 font-medium mb-1">Setup Complete</Text>
                    <Text className="text-2xl font-bold text-blue-800">{completionRate}%</Text>
                  </div>
                </div>
                {completedActions.length > 0 && (
                  <Text className="text-blue-700 mt-3 text-sm">
                    ✅ Completed: {completedActions.join(', ')}
                  </Text>
                )}
              </Section>

              {/* Personalized Demo */}
              <Section className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 p-6 mb-6 rounded-lg">
                <Heading className="text-xl font-semibold text-purple-800 mb-3">
                  🎥 {demo.title}
                </Heading>
                <Text className="text-purple-700 mb-4">
                  {demo.description}
                </Text>
                
                <div className="bg-white p-4 rounded-lg mb-4">
                  <Text className="font-semibold text-gray-800 mb-2">
                    What we'll cover ({demo.duration}):
                  </Text>
                  {demo.features.map((feature, index) => (
                    <Text key={index} className="text-gray-600 mb-1">
                      • {feature}
                    </Text>
                  ))}
                </div>

                <Button
                  href="https://tenantflow.com/book-demo?source=day7_email&type=personalized"
                  className="bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors w-full text-center"
                >
                  Book My Personal Demo
                </Button>
              </Section>

              {/* Alternative Options */}
              <Section className="mb-6">
                <Heading className="text-lg font-semibold text-gray-800 mb-4">
                  🕐 Prefer a Different Format?
                </Heading>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <Text className="font-semibold text-green-800 mb-2">
                      📞 Quick Call (10 min)
                    </Text>
                    <Text className="text-green-700 text-sm mb-3">
                      Just want to ask a few questions? Let's have a quick chat.
                    </Text>
                    <Button
                      href="https://tenantflow.com/book-call?source=day7_email"
                      className="bg-green-600 text-white px-4 py-2 rounded font-medium hover:bg-green-700 transition-colors text-sm"
                    >
                      Schedule Call
                    </Button>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                    <Text className="font-semibold text-orange-800 mb-2">
                      📺 Self-Guided Tour
                    </Text>
                    <Text className="text-orange-700 text-sm mb-3">
                      Explore at your own pace with our interactive product tour.
                    </Text>
                    <Button
                      href="https://tenantflow.com/product-tour?source=day7_email"
                      className="bg-orange-600 text-white px-4 py-2 rounded font-medium hover:bg-orange-700 transition-colors text-sm"
                    >
                      Start Tour
                    </Button>
                  </div>
                </div>
              </Section>

              {/* Social Proof */}
              <Section className="bg-gray-50 p-6 rounded-lg mb-6">
                <Heading className="text-lg font-semibold text-gray-800 mb-4">
                  💬 What Other Property Managers Say
                </Heading>
                
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
                    <Text className="text-gray-700 mb-2">
                      "The demo showed me exactly how to save 10+ hours per week. Best investment I've made for my rental business."
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      — Sarah M., 12 properties
                    </Text>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border-l-4 border-green-500">
                    <Text className="text-gray-700 mb-2">
                      "The personalized setup recommendations were spot-on. Within a week, my rent collection improved dramatically."
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      — Mike R., 3 properties
                    </Text>
                  </div>
                </div>
              </Section>

              {/* Time Zone Note */}
              <Section className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
                <Text className="text-yellow-800 text-sm">
                  ⏰ <strong>Note:</strong> All demo times will be shown in your local time zone ({timeZone}). 
                  We offer flexible scheduling including evenings and weekends.
                </Text>
              </Section>

              {/* No Demo Option */}
              <Section className="text-center">
                <Text className="text-gray-600 text-sm mb-2">
                  Not ready for a demo yet? No problem!
                </Text>
                <Link
                  href="https://tenantflow.com/help/getting-started?source=day7_email"
                  className="text-blue-600 underline text-sm"
                >
                  Continue with self-service resources
                </Link>
              </Section>
            </Section>

            {/* Footer */}
            <Section className="bg-gray-100 px-8 py-6 rounded-b-lg text-center">
              <Text className="text-gray-500 text-sm mb-2">
                Questions? Reply to this email or text us at (555) 123-4567<br />
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