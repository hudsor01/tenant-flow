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

interface MaintenanceRequestEmailProps {
  recipientEmail: string
  title: string
  propertyName: string
  unitNumber: string
  description: string
  priority: 'EMERGENCY' | 'HIGH' | 'MEDIUM' | 'LOW'
  actionUrl?: string
}

export const MaintenanceRequestEmail = ({
  recipientEmail: _recipientEmail,
  title,
  propertyName,
  unitNumber,
  description,
  priority,
  actionUrl
}: MaintenanceRequestEmailProps) => {
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'EMERGENCY': return '#dc3545' // Red
      case 'HIGH': return '#fd7e14' // Orange
      case 'MEDIUM': return '#ffc107' // Yellow
      case 'LOW': return '#28a745' // Green
      default: return '#6c757d' // Gray
    }
  }

  const urgencyText = priority === 'EMERGENCY' ? 'URGENT: ' : ''
  const priorityColor = getPriorityColor(priority)

  return (
    <Html>
      <Head />
      <Preview>
        {urgencyText}Maintenance Request: {title} - {propertyName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>TenantFlow</Heading>
            <div style={{
              ...priorityBadge,
              backgroundColor: priorityColor
            }}>
              {urgencyText}{priority} Priority
            </div>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Heading style={h2}>New Maintenance Request</Heading>
            
            <Section style={requestCard}>
              <Heading style={h3}>{title}</Heading>
              
              <Section style={requestDetails}>
                <Text style={detailsText}>
                  <strong>Property:</strong> {propertyName}<br />
                  <strong>Unit:</strong> {unitNumber}<br />
                  <strong>Priority:</strong> <span style={{ color: priorityColor, fontWeight: 'bold' }}>{priority}</span>
                </Text>
              </Section>
              
              <Section style={descriptionBox}>
                <Text style={descriptionTitle}><strong>Description:</strong></Text>
                <Text style={descriptionText}>{description}</Text>
              </Section>
            </Section>

            {actionUrl && (
              <Section style={buttonContainer}>
                <Button
                  style={button}
                  href={actionUrl}
                >
                  View Request Details
                </Button>
              </Section>
            )}
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              This notification was sent from your TenantFlow property management system.
            </Text>
            <Text style={footerText}>
              If you have any questions, please contact support at support@tenantflow.app
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default MaintenanceRequestEmail

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

const h3 = {
  marginTop: '0',
  color: '#495057',
  fontSize: '18px'
}

const priorityBadge = {
  color: '#ffffff',
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

const requestCard = {
  backgroundColor: '#fff',
  border: '1px solid #e9ecef',
  borderRadius: '8px',
  padding: '20px',
  marginBottom: '20px'
}

const requestDetails = {
  marginBottom: '15px'
}

const detailsText = {
  margin: '0',
  fontSize: '16px'
}

const descriptionBox = {
  backgroundColor: '#f8f9fa',
  padding: '15px',
  borderRadius: '4px',
  margin: '15px 0'
}

const descriptionTitle = {
  margin: '0 0 5px 0',
  fontSize: '16px'
}

const descriptionText = {
  margin: '0',
  fontSize: '16px'
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0'
}

const button = {
  backgroundColor: '#007bff',
  color: '#ffffff',
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