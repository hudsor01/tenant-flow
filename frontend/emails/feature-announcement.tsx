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

interface FeatureAnnouncementEmailProps {
  firstName?: string
  featureName?: string
  featureDescription?: string
  featureImage?: string
  betaAccess?: boolean
  releaseDate?: string
}

export default function FeatureAnnouncementEmail({
  firstName = 'Property Manager',
  featureName = 'Smart Maintenance Scheduling',
  featureDescription = 'AI-powered maintenance scheduling that predicts optimal service times and reduces tenant disruptions by 60%.',
  featureImage = 'https://tenantflow.com/features/maintenance-ai.png',
  betaAccess = false,
  releaseDate = 'This Week'
}: FeatureAnnouncementEmailProps) {
  
  const benefits = [
    {
      icon: '🤖',
      title: 'AI-Powered Scheduling',
      description: 'Automatically optimize maintenance windows based on tenant preferences and historical data.'
    },
    {
      icon: '📱',
      title: 'Instant Notifications',
      description: 'Real-time updates keep tenants informed and reduce complaints by 40%.'
    },
    {
      icon: '⏰',
      title: 'Time Savings',
      description: 'Reduce coordination time by 75% with automated scheduling and confirmations.'
    },
    {
      icon: '📊',
      title: 'Smart Analytics',
      description: 'Track completion rates, tenant satisfaction, and cost optimization insights.'
    }
  ]

  return (
    <Html>
      <Head />
      <Preview>🚀 NEW: {featureName} - Now Available in TenantFlow</Preview>
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
              {/* Beta Badge */}
              {betaAccess && (
                <Section className="text-center mb-6">
                  <div className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                    🌟 EXCLUSIVE BETA ACCESS
                  </div>
                </Section>
              )}

              <Heading className="text-3xl font-bold text-gray-800 mb-4 text-center">
                🚀 Introducing {featureName}
              </Heading>
              
              <Text className="text-gray-600 text-lg mb-6 text-center">
                Hey {firstName}, we're excited to share our latest innovation that will transform how you handle property maintenance.
              </Text>

              {/* Feature Image */}
              <Section className="mb-6 text-center">
                <Img
                  src={featureImage}
                  width="500"
                  height="300"
                  alt={featureName}
                  className="rounded-lg border border-gray-200 mx-auto"
                />
              </Section>

              {/* Feature Description */}
              <Section className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-6 rounded-r-lg">
                <Text className="text-blue-800 text-lg font-medium mb-3">
                  What's New?
                </Text>
                <Text className="text-blue-700 mb-0">
                  {featureDescription}
                </Text>
              </Section>

              {/* Key Benefits */}
              <Section className="mb-6">
                <Heading className="text-xl font-semibold text-gray-800 mb-4">
                  🎯 Key Benefits
                </Heading>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{benefit.icon}</div>
                        <div>
                          <Text className="font-semibold text-gray-800 mb-1">
                            {benefit.title}
                          </Text>
                          <Text className="text-gray-600 text-sm mb-0">
                            {benefit.description}
                          </Text>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Call to Action */}
              <Section className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 p-6 mb-6 rounded-lg text-center">
                <Heading className="text-xl font-semibold text-gray-800 mb-3">
                  {betaAccess ? '🎉 You\'re Invited to Beta!' : `🚀 Available ${releaseDate}`}
                </Heading>
                <Text className="text-gray-600 mb-4">
                  {betaAccess 
                    ? 'As a valued TenantFlow user, you get exclusive early access to test this feature before the public release.'
                    : 'Ready to revolutionize your maintenance workflow? Get started with Smart Maintenance Scheduling now.'
                  }
                </Text>
                
                <Button
                  href={betaAccess 
                    ? "https://tenantflow.com/beta/maintenance-scheduling?source=announcement_email"
                    : "https://tenantflow.com/features/maintenance-scheduling?source=announcement_email"
                  }
                  className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  {betaAccess ? 'Join Beta Program' : 'Try It Now'}
                </Button>
              </Section>

              {/* How It Works */}
              <Section className="mb-6">
                <Heading className="text-lg font-semibold text-gray-800 mb-4">
                  🔄 How It Works
                </Heading>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">1</div>
                    <div>
                      <Text className="font-medium text-gray-800">Create Maintenance Request</Text>
                      <Text className="text-gray-600 text-sm">Log maintenance needs through your dashboard or tenant portal</Text>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">2</div>
                    <div>
                      <Text className="font-medium text-gray-800">AI Optimizes Scheduling</Text>
                      <Text className="text-gray-600 text-sm">Our AI analyzes tenant preferences, urgency, and availability</Text>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">3</div>
                    <div>
                      <Text className="font-medium text-gray-800">Automatic Coordination</Text>
                      <Text className="text-gray-600 text-sm">Tenants and service providers receive notifications and confirmations</Text>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">4</div>
                    <div>
                      <Text className="font-medium text-gray-800">Track & Optimize</Text>
                      <Text className="text-gray-600 text-sm">Monitor completion and gather feedback for continuous improvement</Text>
                    </div>
                  </div>
                </div>
              </Section>

              {/* Early Feedback */}
              {betaAccess && (
                <Section className="bg-purple-50 border border-purple-200 p-6 mb-6 rounded-lg">
                  <Heading className="text-lg font-semibold text-purple-800 mb-3">
                    🗣️ Help Shape the Future
                  </Heading>
                  <Text className="text-purple-700 mb-4">
                    Your feedback during the beta period is invaluable. We'll use your insights to refine the feature before the public launch.
                  </Text>
                  <Text className="text-purple-700 text-sm mb-0">
                    💎 Beta participants get 3 months free access to premium features as a thank you!
                  </Text>
                </Section>
              )}

              {/* Help & Support */}
              <Section className="bg-gray-50 p-4 rounded-lg">
                <Text className="text-gray-600 mb-2">
                  <strong>Need Help Getting Started?</strong>
                </Text>
                <Text className="text-gray-600 mb-2">
                  📚 <Link href="https://tenantflow.com/help/maintenance-scheduling" className="text-blue-600 underline">
                    View Documentation
                  </Link>
                </Text>
                <Text className="text-gray-600 mb-0">
                  💬 <Link href="https://tenantflow.com/support" className="text-blue-600 underline">
                    Contact Support
                  </Link>
                </Text>
              </Section>
            </Section>

            {/* Footer */}
            <Section className="bg-gray-100 px-8 py-6 rounded-b-lg text-center">
              <Text className="text-gray-500 text-sm mb-2">
                Keep innovating with property management,<br />
                The TenantFlow Product Team
              </Text>
              <Hr className="border-gray-300 my-4" />
              <Text className="text-gray-400 text-xs">
                You're receiving this because you're a TenantFlow user.{' '}
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