import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text
} from '@react-email/components'


interface PaymentFailedEmailProps {
  customerEmail: string
  amount: number
  currency: string
  attemptCount: number
  invoiceUrl: string | null
  isLastAttempt: boolean
}

export const PaymentFailedEmail = ({
  customerEmail: _customerEmail,
  amount,
  currency,
  attemptCount,
  invoiceUrl,
  isLastAttempt
}: PaymentFailedEmailProps) => {
  const formattedAmount = (amount / 100).toFixed(2)
  const urgencyColor = isLastAttempt ? '#dc3545' : '#fd7e14'

  return (
    <Html>
      <Head />
      <Preview>
        {isLastAttempt 
          ? 'URGENT: Final payment attempt failed - Action required'
          : 'Payment failed - Please update your payment method'
        }
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>TenantFlow</Heading>
            <div style={{
              ...badge,
              backgroundColor: urgencyColor
            }}>
              {isLastAttempt ? 'URGENT: Final Payment Attempt Failed' : 'Payment Failed'}
            </div>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Heading style={h2}>Payment Processing Failed</Heading>
            
            <Text style={text}>
              We were unable to process your payment for your TenantFlow subscription.
            </Text>

            <Section style={paymentDetails}>
              <Text style={detailsTitle}><strong>Payment Details:</strong></Text>
              <Text style={details}>
                Amount: <strong>{currency.toUpperCase()} {formattedAmount}</strong><br />
                Attempt: {attemptCount} of 3<br />
              </Text>
            </Section>

            {isLastAttempt ? (
              <Section style={urgentNotice}>
                <Text style={urgentText}>
                  <strong>Important Notice:</strong>
                </Text>
                <Text style={urgentText}>
                  This was your final payment attempt. Your subscription will be canceled 
                  if payment is not received within 24 hours. Please update your payment 
                  method immediately to avoid service interruption.
                </Text>
              </Section>
            ) : (
              <Text style={text}>
                We will automatically retry the payment in 24 hours. Please ensure your 
                payment method is up to date to avoid service interruption.
              </Text>
            )}

            <Section style={buttonContainer}>
              <Button
                style={button}
                href={`${process.env.FRONTEND_URL}/billing`}
              >
                Update Payment Method
              </Button>
            </Section>

            {invoiceUrl && (
              <Section style={linkContainer}>
                <Link href={invoiceUrl} style={link}>
                  View Invoice Details →
                </Link>
              </Section>
            )}
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              If you believe this is an error or need assistance, please contact 
              support at support@tenantflow.app
            </Text>
            <Text style={footerText}>
              Thank you for using TenantFlow.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default PaymentFailedEmail

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

const badge = {
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

const paymentDetails = {
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

const urgentNotice = {
  backgroundColor: '#fff3cd',
  border: '1px solid #ffeaa7',
  padding: '15px',
  borderRadius: '4px',
  margin: '20px 0'
}

const urgentText = {
  color: '#856404',
  margin: '10px 0 0 0',
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

const linkContainer = {
  textAlign: 'center' as const,
  margin: '20px 0'
}

const link = {
  color: '#007bff',
  textDecoration: 'none',
  fontSize: '14px'
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