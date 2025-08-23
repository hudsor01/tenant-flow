import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text
} from '@react-email/components'
import * as React from 'react'

interface SubscriptionCanceledEmailProps {
  customerEmail: string
  subscriptionId: string
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: Date | null
}

export const SubscriptionCanceledEmail = ({
  customerEmail: _customerEmail,
  subscriptionId,
  cancelAtPeriodEnd,
  currentPeriodEnd
}: SubscriptionCanceledEmailProps) => {
  const endDateFormatted = currentPeriodEnd ? currentPeriodEnd.toLocaleDateString() : 'immediately'

  return (
    <Html>
      <Head />
      <Preview>
        Your TenantFlow Subscription Has Been Canceled
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>TenantFlow</Heading>
            <div style={canceledBadge}>
              Subscription Canceled
            </div>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Heading style={h2}>Your Subscription Has Been Canceled</Heading>
            
            <Text style={text}>
              We're sorry to see you go. Your TenantFlow subscription has been canceled.
            </Text>

            <Section style={cancellationDetails}>
              <Text style={detailsTitle}><strong>Cancellation Details:</strong></Text>
              <Text style={details}>
                Subscription ID: {subscriptionId}<br />
                {cancelAtPeriodEnd ? (
                  <>
                    Access Until: <strong>{endDateFormatted}</strong><br />
                    <small style={smallText}>You will continue to have full access until this date.</small>
                  </>
                ) : (
                  <>
                    Status: <strong>Immediately Canceled</strong><br />
                    <small style={smallText}>Your access has been terminated.</small>
                  </>
                )}
              </Text>
            </Section>

            {cancelAtPeriodEnd && (
              <Text style={text}>
                You can continue using all TenantFlow features until {endDateFormatted}. 
                After this date, your account will be downgraded to the free plan.
              </Text>
            )}

            <Section style={comeBackNotice}>
              <Text style={comeBackTitle}><strong>Want to Come Back?</strong></Text>
              <Text style={comeBackText}>
                You can reactivate your subscription at any time from your billing dashboard. 
                All your data has been preserved.
              </Text>
            </Section>

            <Section style={buttonContainer}>
              <Button
                style={button}
                href={`${process.env.FRONTEND_URL}/billing`}
              >
                Manage Subscription
              </Button>
            </Section>
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              We'd love to hear your feedback about why you're leaving. Please reply to 
              this email or contact us at support@tenantflow.app
            </Text>
            <Text style={footerText}>
              Thank you for being a TenantFlow customer.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default SubscriptionCanceledEmail

// Styles
const main = {
  fontFamily: 'Arial, sans-serif',
  lineHeight: '1.6',
  color: '#333',
  backgroundColor: '#f8f9fa'
}

const container = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '20px'
}

const header = {
  backgroundColor: '#f8f9fa',
  padding: '20px',
  borderRadius: '8px',
  marginBottom: '20px'
}

const h1 = {
  color: '#2c3e50',
  margin: '0 0 10px 0',
  fontSize: '24px'
}

const h2 = {
  color: '#2c3e50',
  marginBottom: '20px',
  fontSize: '20px'
}

const canceledBadge = {
  backgroundColor: '#6c757d',
  color: 'white',
  padding: '8px 12px',
  borderRadius: '4px',
  display: 'inline-block',
  fontWeight: 'bold',
  fontSize: '14px'
}

const content = {
  backgroundColor: '#fff',
  border: '1px solid #e9ecef',
  borderRadius: '8px',
  padding: '20px',
  marginBottom: '20px'
}

const text = {
  margin: '16px 0',
  fontSize: '16px'
}

const cancellationDetails = {
  backgroundColor: '#f8f9fa',
  padding: '15px',
  borderRadius: '4px',
  margin: '15px 0'
}

const detailsTitle = {
  margin: '0 0 10px 0',
  fontSize: '16px'
}

const details = {
  margin: '0',
  fontSize: '16px'
}

const smallText = {
  color: '#6c757d',
  fontSize: '14px'
}

const comeBackNotice = {
  backgroundColor: '#e7f3ff',
  border: '1px solid #b3d9ff',
  padding: '15px',
  borderRadius: '4px',
  margin: '20px 0'
}

const comeBackTitle = {
  margin: '0 0 10px 0',
  fontSize: '16px'
}

const comeBackText = {
  margin: '0',
  fontSize: '16px'
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0'
}

const button = {
  backgroundColor: '#007bff',
  color: 'white',
  padding: '12px 24px',
  textDecoration: 'none',
  borderRadius: '4px',
  display: 'inline-block',
  fontWeight: 'bold'
}

const hr = {
  borderColor: '#e9ecef',
  margin: '30px 0'
}

const footer = {
  fontSize: '14px',
  color: '#6c757d'
}

const footerText = {
  margin: '8px 0'
}