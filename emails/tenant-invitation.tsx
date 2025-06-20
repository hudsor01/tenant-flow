import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Hr,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components'

interface TenantInvitationEmailProps {
  tenantName: string
  propertyName: string
  propertyAddress: string
  landlordName: string
  invitationUrl: string
  expiresAt: string
}

export default function TenantInvitationEmail({
  tenantName,
  propertyName,
  propertyAddress,
  landlordName,
  invitationUrl,
  expiresAt,
}: TenantInvitationEmailProps) {
  const previewText = `${landlordName} has invited you to access your tenant portal for ${propertyName}`
  
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white font-sans">
          <Container className="mx-auto p-5 max-w-xl">
            {/* Header */}
            <Section className="bg-gradient-to-r from-green-500 to-green-600 rounded-t-lg p-8 text-center">
              <Heading className="text-white text-3xl font-bold m-0">
                TenantFlow
              </Heading>
              <Text className="text-green-100 text-sm mt-2">
                Property Management Made Simple
              </Text>
            </Section>

            {/* Main Content */}
            <Section className="bg-white border-x border-b border-gray-200 rounded-b-lg p-8">
              <Heading className="text-2xl font-semibold text-gray-900 mb-4">
                Welcome to Your Tenant Portal
              </Heading>

              <Text className="text-gray-700 text-base mb-4">
                Hi {tenantName},
              </Text>

              <Text className="text-gray-700 text-base mb-4">
                {landlordName} has invited you to access your tenant portal for{' '}
                <span className="font-semibold text-gray-900">{propertyName}</span> located at {propertyAddress}.
              </Text>

              <Text className="text-gray-700 text-base mb-4">
                Through your tenant portal, you'll be able to:
              </Text>

              <ul className="text-gray-700 text-base mb-6 ml-6">
                <li className="mb-2">✓ View your lease agreement and important documents</li>
                <li className="mb-2">✓ Track payment history and upcoming rent payments</li>
                <li className="mb-2">✓ Submit maintenance requests</li>
                <li className="mb-2">✓ Receive important notifications from your landlord</li>
                <li className="mb-2">✓ Update your contact information</li>
              </ul>

              <Section className="text-center my-8">
                <Button
                  href={invitationUrl}
                  className="bg-green-600 text-white font-semibold py-3 px-6 rounded-lg inline-block"
                >
                  Accept Invitation & Access Portal
                </Button>
              </Section>

              <Text className="text-gray-600 text-sm mb-4">
                This invitation will expire on{' '}
                <span className="font-semibold">{new Date(expiresAt).toLocaleDateString()}</span>.
                If you don't accept by then, please contact {landlordName} for a new invitation.
              </Text>

              <Hr className="border-gray-200 my-6" />

              <Text className="text-gray-500 text-sm">
                If you have any questions about this invitation, please contact {landlordName} directly.
              </Text>
              
              <Text className="text-gray-500 text-sm mt-4">
                If the button above doesn't work, you can copy and paste this link into your browser:
              </Text>
              
              <Link href={invitationUrl} className="text-green-600 text-sm underline break-all">
                {invitationUrl}
              </Link>
            </Section>

            {/* Footer */}
            <Section className="text-center mt-8">
              <Text className="text-gray-400 text-xs">
                This email was sent by TenantFlow on behalf of {landlordName}.
              </Text>
              <Text className="text-gray-400 text-xs mt-2">
                © 2025 TenantFlow. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}