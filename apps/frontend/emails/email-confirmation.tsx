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

interface EmailConfirmationProps {
  confirmationUrl: string
  email?: string
  name?: string
}

export default function EmailConfirmation({
  confirmationUrl,
  email = '',
  name = ''
}: EmailConfirmationProps) {
  const previewText = 'Confirm your TenantFlow account'

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto py-8 px-4 max-w-xl">
            {/* Header */}
            <Section className="bg-white rounded-t-lg px-8 py-6 border-b border-gray-100">
              <div className="flex items-center">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-700 rounded-md mr-3"></div>
                <Text className="text-lg font-semibold text-gray-900 m-0">
                  TenantFlow
                </Text>
              </div>
            </Section>

            {/* Main Content */}
            <Section className="bg-white px-8 py-8">
              <Heading className="text-2xl font-semibold text-gray-900 mb-2">
                Confirm your account
              </Heading>
              <Text className="text-gray-600 text-base leading-relaxed">
                {name ? `Hi ${name},` : 'Welcome to TenantFlow!'} Please confirm your email address to get started with your property management journey.
              </Text>

              {/* CTA Button */}
              <Section className="text-center my-8">
                <Button
                  href={confirmationUrl}
                  className="bg-emerald-500 text-white font-semibold px-6 py-3 rounded-lg no-underline inline-block"
                >
                  Confirm Email Address
                </Button>
              </Section>

              {/* Alternative Link */}
              <Section className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <Text className="text-sm text-gray-600 text-center mb-2">
                  If the button doesn't work, copy and paste this link:
                </Text>
                <Text className="text-xs font-mono bg-white p-2 rounded border border-gray-300 break-all text-center text-emerald-600">
                  {confirmationUrl}
                </Text>
              </Section>

              {/* Security Notice */}
              <Section className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
                <div className="flex items-start">
                  <Text className="text-amber-600 mr-3 mt-0">⚠️</Text>
                  <div>
                    <Text className="font-semibold text-amber-900 text-sm mb-1 mt-0">
                      Security Notice
                    </Text>
                    <Text className="text-amber-700 text-sm leading-relaxed m-0">
                      This confirmation link will expire for your security. If you didn't create this account, you can safely ignore this email.
                    </Text>
                  </div>
                </div>
              </Section>

              {/* What's Next Section */}
              <Section className="mt-8">
                <Heading className="text-lg font-semibold text-gray-900 mb-3">
                  What happens next?
                </Heading>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <Text className="text-emerald-500 mr-3 mt-0">✓</Text>
                    <Text className="text-gray-600 text-sm m-0">
                      Start your 14-day free trial with full access
                    </Text>
                  </div>
                  <div className="flex items-start">
                    <Text className="text-emerald-500 mr-3 mt-0">✓</Text>
                    <Text className="text-gray-600 text-sm m-0">
                      Add your first property and tenants
                    </Text>
                  </div>
                  <div className="flex items-start">
                    <Text className="text-emerald-500 mr-3 mt-0">✓</Text>
                    <Text className="text-gray-600 text-sm m-0">
                      Explore automated rent collection and maintenance tracking
                    </Text>
                  </div>
                </div>
              </Section>
            </Section>

            {/* Footer */}
            <Section className="bg-gray-50 rounded-b-lg px-8 py-6 text-center border-t border-gray-100">
              <Text className="text-gray-600 text-sm mb-1">
                © 2025 TenantFlow. All rights reserved.
              </Text>
              <Text className="text-gray-500 text-xs m-0">
                Need help? Contact support at{' '}
                <Link href="mailto:support@tenantflow.app" className="text-blue-500 no-underline">
                  support@tenantflow.app
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

// Email preview for development
EmailConfirmation.PreviewProps = {
  confirmationUrl: 'https://tenantflow.app/auth/confirm?token=123456789',
  email: 'john.doe@tenantflow.app',
  name: 'John'
} as EmailConfirmationPropstenantflow.app