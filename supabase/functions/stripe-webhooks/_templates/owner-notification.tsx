// Owner payment notification email template.
// Brief informational email: "heads-up that money came in."
// Shows tenant name, amount received, property/unit, and payment date.

import * as React from 'npm:react@18.3.1'
import {
  Text,
  Heading,
  Section,
} from 'npm:@react-email/components@0.0.22'
import { EmailLayout } from './email-layout.tsx'

export interface OwnerNotificationProps {
  ownerName: string
  tenantName: string
  amount: string
  propertyAddress: string
  unitNumber: string | null
  paymentDate: string
}

export const OwnerNotification = ({
  ownerName,
  tenantName,
  amount,
  propertyAddress,
  unitNumber,
  paymentDate,
}: OwnerNotificationProps) => {
  const locationText = unitNumber
    ? `${propertyAddress} - ${unitNumber}`
    : propertyAddress

  return (
    <EmailLayout previewText={`Payment received from ${tenantName}`}>
      <Heading style={heading}>Payment Received</Heading>

      <Text style={greeting}>Hi {ownerName},</Text>
      <Text style={paragraph}>
        A rent payment has been received for one of your properties.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailRow}>
          <span style={detailLabel}>Tenant:</span>{' '}
          <span style={detailValue}>{tenantName}</span>
        </Text>
        <Text style={detailRow}>
          <span style={detailLabel}>Amount:</span>{' '}
          <span style={amountValue}>{amount}</span>
        </Text>
        <Text style={detailRow}>
          <span style={detailLabel}>Property:</span>{' '}
          <span style={detailValue}>{locationText}</span>
        </Text>
        <Text style={detailRow}>
          <span style={detailLabel}>Date:</span>{' '}
          <span style={detailValue}>{paymentDate}</span>
        </Text>
      </Section>

      <Text style={closingText}>
        This is a payment confirmation. No action is required.
      </Text>
    </EmailLayout>
  )
}

const heading: React.CSSProperties = {
  color: '#1e3a5f',
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
  backgroundColor: '#f9fafb',
  borderRadius: '6px',
  padding: '16px 20px',
  margin: '0 0 16px 0',
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

const amountValue: React.CSSProperties = {
  color: '#1e3a5f',
  fontWeight: '700',
  fontSize: '16px',
}

const closingText: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0',
}
