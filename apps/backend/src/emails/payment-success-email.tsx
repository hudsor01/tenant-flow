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
import * as React from 'react'

interface PaymentSuccessEmailProps {
  customerEmail: string
  amount: number
  currency: string
  invoiceUrl: string | null
  invoicePdf: string | null
}

export const PaymentSuccessEmail = ({
  customerEmail: _customerEmail,
  amount,
  currency,
  invoiceUrl,
  invoicePdf
}: PaymentSuccessEmailProps) => {
  const formattedAmount = (amount / 100).toFixed(2)

  return (
    <Html>
      <Head />
      <Preview>
        Payment Receipt - {currency.toUpperCase()} {formattedAmount}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>TenantFlow</Heading>
            <div style={successBadge}>
              Payment Successful
            </div>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Heading style={h2}>Thank You for Your Payment</Heading>
            
            <Text style={text}>
              Your payment has been successfully processed.
            </Text>

            <Section style={paymentDetails}>
              <Text style={detailsTitle}><strong>Payment Details:</strong></Text>
              <Text style={details}>
                Amount Paid: <strong>{currency.toUpperCase()} {formattedAmount}</strong><br />
                Date: {new Date().toLocaleDateString()}<br />
              </Text>
            </Section>

            <Text style={text}>
              Your subscription is active and all features are available for use.
            </Text>

            {(invoiceUrl ?? invoicePdf) && (
              <Section style={buttonContainer}>
                {invoiceUrl && (
                  <Button
                    style={button}
                    href={invoiceUrl}
                  >
                    View Invoice
                  </Button>
                )}
                {invoicePdf && (
                  <Button
                    style={secondaryButton}
                    href={invoicePdf}
                  >
                    Download PDF
                  </Button>
                )}
              </Section>
            )}
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              This receipt is for your records. No action is required.
            </Text>
            <Text style={footerText}>
              If you have any questions about your subscription, please visit your{' '}
              <Link href={`${process.env.FRONTEND_URL}/billing`} style={link}>
                billing dashboard
              </Link>{' '}
              or contact support at support@tenantflow.app
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default PaymentSuccessEmail

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

const successBadge = {
  backgroundColor: '#28a745',
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

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0'
}

const button = {
  backgroundColor: '#007bff',
  color: 'white',
  padding: '10px 20px',
  textDecoration: 'none',
  borderRadius: '4px',
  display: 'inline-block',
  margin: '0 5px'
}

const secondaryButton = {
  backgroundColor: '#6c757d',
  color: 'white',
  padding: '10px 20px',
  textDecoration: 'none',
  borderRadius: '4px',
  display: 'inline-block',
  margin: '0 5px'
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

const link = {
  color: '#007bff'
}