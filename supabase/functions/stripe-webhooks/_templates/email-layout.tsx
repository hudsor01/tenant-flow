// Shared branded email layout for TenantFlow transactional emails.
// Wraps all email templates with consistent header, container, and footer.
// Uses React Email components with npm: protocol imports for Deno compatibility.

import * as React from 'npm:react@18.3.1'
import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Heading,
  Hr,
  Link,
  Preview,
} from 'npm:@react-email/components@0.0.22'

interface EmailLayoutProps {
  children: React.ReactNode
  previewText: string
}

export const EmailLayout = ({ children, previewText }: EmailLayoutProps) => (
  <Html lang="en">
    <Head />
    <Preview>{previewText}</Preview>
    <Body style={body}>
      <Container style={container}>
        <Heading style={brandHeader}>TenantFlow</Heading>
        <Hr style={divider} />
        {children}
        <Hr style={divider} />
        <Text style={footer}>
          This is an automated email from TenantFlow. Please do not reply to this message.
        </Text>
        <Text style={footer}>
          Need help?{' '}
          <Link href="https://tenantflow.app/support" style={footerLink}>
            Visit our support center
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

const body: React.CSSProperties = {
  backgroundColor: '#f6f6f6',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  margin: '0',
  padding: '0',
}

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  margin: '40px auto',
  maxWidth: '560px',
  padding: '32px 40px',
}

const brandHeader: React.CSSProperties = {
  color: '#1e3a5f',
  fontSize: '24px',
  fontWeight: '700',
  letterSpacing: '-0.5px',
  margin: '0 0 16px 0',
  padding: '0',
}

const divider: React.CSSProperties = {
  borderColor: '#e5e7eb',
  borderWidth: '1px 0 0 0',
  margin: '16px 0',
}

const footer: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '4px 0',
}

const footerLink: React.CSSProperties = {
  color: '#6b7280',
  textDecoration: 'underline',
}
