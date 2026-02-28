// Autopay payment failure notification email template.
// Sent to tenant when their automatic rent payment fails (card declined, insufficient funds, etc.).
// Includes amount, property, failure reason, and a CTA to pay manually.
// Uses the same branded layout as other TenantFlow transactional emails.

import * as React from 'npm:react@18.3.1'
import {
  Text,
  Heading,
  Section,
  Link,
} from 'npm:@react-email/components@0.0.22'
import { EmailLayout } from './email-layout.tsx'

export interface AutopayFailedProps {
  tenantName: string
  amount: string
  propertyAddress: string
  unitNumber: string | null
  periodMonth: string
  periodYear: string
  paymentMethodLast4: string | null
  failureReason: string | null
  manualPaymentUrl: string
}

export const AutopayFailed = ({
  tenantName,
  amount,
  propertyAddress,
  unitNumber,
  periodMonth,
  periodYear,
  paymentMethodLast4,
  failureReason,
  manualPaymentUrl,
}: AutopayFailedProps) => {
  const locationText = unitNumber
    ? `${propertyAddress} - ${unitNumber}`
    : propertyAddress

  return (
    <EmailLayout previewText={`Autopay Failed - ${periodMonth} ${periodYear}`}>
      <Heading style={heading}>Autopay Payment Failed</Heading>

      <Text style={greeting}>Hi {tenantName},</Text>
      <Text style={paragraph}>
        Your automatic rent payment could not be processed. Please review the details below
        and take action to avoid late fees.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailRow}>
          <span style={detailLabel}>Amount:</span>{' '}
          <span style={detailValue}>{amount}</span>
        </Text>
        <Text style={detailRow}>
          <span style={detailLabel}>Property:</span>{' '}
          <span style={detailValue}>{locationText}</span>
        </Text>
        <Text style={detailRow}>
          <span style={detailLabel}>Period:</span>{' '}
          <span style={detailValue}>{periodMonth} {periodYear}</span>
        </Text>
        {paymentMethodLast4 ? (
          <Text style={detailRow}>
            <span style={detailLabel}>Card:</span>{' '}
            <span style={detailValue}>Ending in {paymentMethodLast4}</span>
          </Text>
        ) : null}
        {failureReason ? (
          <Text style={detailRow}>
            <span style={detailLabel}>Reason:</span>{' '}
            <span style={failureValue}>{failureReason}</span>
          </Text>
        ) : null}
      </Section>

      <Section style={ctaSection}>
        <Link href={manualPaymentUrl} style={ctaButton}>
          Pay Manually
        </Link>
      </Section>

      <Text style={retryNote}>
        We will automatically retry your payment over the next few days.
        If the issue persists, please update your payment method or pay manually
        using the link above.
      </Text>
    </EmailLayout>
  )
}

const heading: React.CSSProperties = {
  color: '#dc2626',
  fontSize: '20px',
  fontWeight: '600',
  margin: '16px 0 8px 0',
}

const greeting: React.CSSProperties = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 8px 0',
}

const paragraph: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 16px 0',
}

const detailsBox: React.CSSProperties = {
  backgroundColor: '#fef2f2',
  borderRadius: '6px',
  padding: '16px 20px',
  margin: '0 0 16px 0',
  border: '1px solid #fecaca',
}

const detailRow: React.CSSProperties = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '28px',
  margin: '0',
}

const detailLabel: React.CSSProperties = {
  color: '#6b7280',
  fontWeight: '400',
}

const detailValue: React.CSSProperties = {
  color: '#374151',
  fontWeight: '500',
}

const failureValue: React.CSSProperties = {
  color: '#dc2626',
  fontWeight: '500',
}

const ctaSection: React.CSSProperties = {
  textAlign: 'center' as const,
  margin: '24px 0',
}

const ctaButton: React.CSSProperties = {
  backgroundColor: '#1e3a5f',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '14px',
  fontWeight: '600',
  padding: '12px 32px',
  textDecoration: 'none',
}

const retryNote: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0',
  fontStyle: 'italic',
}
