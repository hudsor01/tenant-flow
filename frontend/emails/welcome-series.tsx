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

interface WelcomeEmailProps {
  firstName?: string
  companySize?: 'small' | 'medium' | 'large'
  source?: string
}

export default function WelcomeEmail({
  firstName = 'Property Manager',
  companySize = 'medium',
  source = 'website'
}: WelcomeEmailProps) {
  const getPersonalizedContent = () => {
    switch (companySize) {
      case 'small':
        return {
          tip: 'Start with digitizing your lease agreements to save 5+ hours per tenant onboarding.',
          feature: 'Automated lease generation',
          savings: 'Save 10+ hours per week'
        }
      case 'large':
        return {
          tip: 'Implement bulk tenant communication to streamline your property management workflow.',
          feature: 'Enterprise tenant management dashboard',
          savings: 'Save 20+ hours per week'
        }
      default:
        return {
          tip: 'Automate your rent collection to reduce late payments by up to 40%.',
          feature: 'Smart rent collection system',
          savings: 'Save 15+ hours per week'
        }
    }
  }

  const content = getPersonalizedContent()

  return (
    <Html>
      <Head />
      <Preview>Welcome to TenantFlow - Your Property Management Journey Starts Here</Preview>
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
                Welcome to TenantFlow, {firstName}! 🏠
              </Heading>
              
              <Text className="text-gray-600 text-lg mb-6">
                Thank you for joining thousands of property managers who trust TenantFlow to streamline their operations.
              </Text>

              {/* Personalized Tip */}
              <Section className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-6 rounded-r-lg">
                <Heading className="text-lg font-semibold text-blue-800 mb-2">
                  💡 Quick Win for You
                </Heading>
                <Text className="text-blue-700 mb-0">
                  {content.tip}
                </Text>
              </Section>

              {/* Feature Highlight */}
              <Section className="mb-6">
                <Heading className="text-xl font-semibold text-gray-800 mb-3">
                  What's Next?
                </Heading>
                <Text className="text-gray-600 mb-4">
                  Get started with our {content.feature} and begin experiencing the TenantFlow difference:
                </Text>
                
                <Section className="bg-green-50 p-4 rounded-lg mb-4">
                  <Text className="font-semibold text-green-800 mb-2">
                    ⭐ {content.savings} with automation
                  </Text>
                  <Text className="text-green-700 mb-0">
                    Join property managers who've transformed their workflow
                  </Text>
                </Section>
              </Section>

              {/* CTA Button */}
              <Section className="text-center mb-6">
                <Button
                  href="https://tenantflow.com/dashboard?source=welcome_email"
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Access Your Dashboard
                </Button>
              </Section>

              {/* What to Expect */}
              <Section className="border-t border-gray-200 pt-6">
                <Heading className="text-lg font-semibold text-gray-800 mb-3">
                  What to Expect Next
                </Heading>
                <Text className="text-gray-600 mb-2">
                  📧 <strong>Day 3:</strong> Advanced property management strategies
                </Text>
                <Text className="text-gray-600 mb-2">
                  🎯 <strong>Day 7:</strong> Personalized demo invitation
                </Text>
                <Text className="text-gray-600 mb-4">
                  💼 <strong>Ongoing:</strong> Weekly tips and industry insights
                </Text>
              </Section>

              {/* Support */}
              <Section className="bg-gray-50 p-4 rounded-lg">
                <Text className="text-gray-600 mb-2">
                  <strong>Need help getting started?</strong>
                </Text>
                <Text className="text-gray-600 mb-0">
                  Reply to this email or visit our{' '}
                  <Link href="https://tenantflow.com/help" className="text-blue-600 underline">
                    Help Center
                  </Link>{' '}
                  for instant support.
                </Text>
              </Section>
            </Section>

            {/* Footer */}
            <Section className="bg-gray-100 px-8 py-6 rounded-b-lg text-center">
              <Text className="text-gray-500 text-sm mb-2">
                Best regards,<br />
                The TenantFlow Team
              </Text>
              <Hr className="border-gray-300 my-4" />
              <Text className="text-gray-400 text-xs">
                You're receiving this because you signed up for TenantFlow from {source}.{' '}
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