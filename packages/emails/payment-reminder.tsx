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

interface PaymentReminderEmailProps {
  tenantName?: string
  propertyAddress?: string
  rentAmount?: number
  dueDate?: string
  daysOverdue?: number
  lateFee?: number
  landlordName?: string
  landlordPhone?: string
  paymentUrl?: string
  reminderType?: 'upcoming' | 'due' | 'overdue'
}

export default function PaymentReminderEmail({
  tenantName = 'Tenant',
  propertyAddress = '123 Main Street, Unit 1',
  rentAmount = 1200,
  dueDate = 'March 1, 2024',
  daysOverdue = 0,
  lateFee = 0,
  landlordName = 'Property Manager',
  landlordPhone = '(555) 123-4567',
  paymentUrl = 'https://tenantflow.app/tenant/pay-rent',
  reminderType = 'upcoming'
}: PaymentReminderEmailProps) {

  const getReminderData = () => {
    switch (reminderType) {
      case 'upcoming':
        return {
          emoji: '🔔',
          title: 'Rent Payment Reminder',
          urgency: 'Friendly Reminder',
          color: 'blue',
          message: 'Your rent payment is due soon. Pay early and stay ahead!',
          buttonText: 'Pay Rent Now',
          priority: 'normal'
        }
      case 'due':
        return {
          emoji: '📅',
          title: 'Rent Payment Due Today',
          urgency: 'Payment Due',
          color: 'orange',
          message: 'Your rent payment is due today. Please submit payment to avoid late fees.',
          buttonText: 'Pay Now to Avoid Late Fees',
          priority: 'high'
        }
      case 'overdue':
        return {
          emoji: '⚠️',
          title: 'Overdue Rent Payment',
          urgency: 'Urgent: Payment Overdue',
          color: 'red',
          message: 'Your rent payment is past due. Please submit payment immediately.',
          buttonText: 'Pay Immediately',
          priority: 'urgent'
        }
      default:
        return {
          emoji: '🏠',
          title: 'Rent Payment Notice',
          urgency: 'Payment Notice',
          color: 'blue',
          message: 'This is a notice regarding your rent payment.',
          buttonText: 'Pay Rent',
          priority: 'normal'
        }
    }
  }

  const reminderData = getReminderData()
  const totalAmount = rentAmount + lateFee

  const getUrgencyBadgeClasses = (color: string) => {
    switch (color) {
      case 'red': return 'bg-red-100 text-red-800'
      case 'orange': return 'bg-orange-100 text-orange-800'
      case 'blue': return 'bg-blue-100 text-blue-800'
      default: return ''
    }
  }

  const getPaymentButtonClasses = (color: string) => {
    switch (color) {
      case 'red': return 'bg-red-600 hover:bg-red-700'
      case 'orange': return 'bg-orange-600 hover:bg-orange-700'
      case 'blue': return 'bg-blue-600 hover:bg-blue-700'
      default: return ''
    }
  }

  return (
    <Html>
      <Head />
      <Preview>{reminderData.title} - ${String(rentAmount)} due {dueDate}</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto py-8 px-4 max-w-2xl">
            {/* Header */}
            <Section className="bg-white rounded-t-lg px-8 py-6 border-b border-gray-200">
              <Img
                src="https://tenantflow.app/logo-email.png"
                width="180"
                height="60"
                alt="TenantFlow"
                className="mx-auto"
              />
            </Section>

            {/* Main Content */}
            <Section className="bg-white px-8 py-6">
              {/* Urgency Badge */}
              <Section className="text-center mb-6">
                <div className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${getUrgencyBadgeClasses(reminderData.color)}`}>
                  {reminderData.urgency}
                </div>
              </Section>

              <div className="text-center mb-6">
                <div className="text-4xl mb-3">{reminderData.emoji}</div>
                <Heading className="text-2xl font-bold text-gray-800 mb-2">
                  {reminderData.title}
                </Heading>
              </div>

              <Text className="text-gray-600 text-lg mb-6">
                Hi {tenantName}, {reminderData.message}
              </Text>

              {/* Payment Details */}
              <Section className={`bg-${reminderData.color}-50 border-l-4 border-${reminderData.color}-500 p-6 mb-6 rounded-r-lg`}>
                <Heading className={`text-lg font-semibold text-${reminderData.color}-800 mb-4`}>
                  💰 Payment Details
                </Heading>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Text className={`text-${reminderData.color}-700 font-medium`}>Property:</Text>
                    <Text className={`text-${reminderData.color}-800 font-semibold`}>{propertyAddress}</Text>
                  </div>

                  <div className="flex justify-between items-center">
                    <Text className={`text-${reminderData.color}-700 font-medium`}>Rent Amount:</Text>
                    <Text className={`text-${reminderData.color}-800 font-semibold`}>${String(rentAmount.toFixed(2))}</Text>
                  </div>

                  {lateFee > 0 && (
                    <div className="flex justify-between items-center">
                      <Text className="text-red-700 font-medium">Late Fee:</Text>
                      <Text className="text-red-800 font-semibold">${String(lateFee.toFixed(2))}</Text>
                    </div>
                  )}

                  <Hr className={`border-${reminderData.color}-200 my-3`} />

                  <div className="flex justify-between items-center">
                    <Text className={`text-${reminderData.color}-800 font-bold text-lg`}>Total Due:</Text>
                    <Text className={`text-${reminderData.color}-800 font-bold text-xl`}>${String(totalAmount.toFixed(2))}</Text>
                  </div>

                  <div className="flex justify-between items-center">
                    <Text className={`text-${reminderData.color}-700 font-medium`}>Due Date:</Text>
                    <Text className={`text-${reminderData.color}-800 font-semibold`}>{dueDate}</Text>
                  </div>

                  {daysOverdue > 0 && (
                    <div className="flex justify-between items-center">
                      <Text className="text-red-700 font-medium">Days Overdue:</Text>
                      <Text className="text-red-800 font-bold">{String(daysOverdue)} days</Text>
                    </div>
                  )}
                </div>
              </Section>

              {/* Payment Button */}
              <Section className="text-center mb-6">
                <Button
                  href={paymentUrl}
                  className={`px-8 py-4 rounded-lg font-semibold text-white text-lg transition-colors ${getPaymentButtonClasses(reminderData.color)}`}
                >
                  {reminderData.buttonText}
                </Button>
              </Section>

              {/* Payment Methods */}
              <Section className="mb-6">
                <Heading className="text-lg font-semibold text-gray-800 mb-4">
                  💳 Payment Options
                </Heading>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-center">
                    <div className="text-2xl mb-2">🏦</div>
                    <Text className="font-semibold text-green-800 mb-1">
                      Bank Transfer
                    </Text>
                    <Text className="text-green-700 text-sm">
                      Direct from your bank account
                    </Text>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg text-center">
                    <div className="text-2xl mb-2">💳</div>
                    <Text className="font-semibold text-purple-800 mb-1">
                      Credit/Debit Card
                    </Text>
                    <Text className="text-purple-700 text-sm">
                      Instant payment processing
                    </Text>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg text-center">
                    <div className="text-2xl mb-2">📱</div>
                    <Text className="font-semibold text-indigo-800 mb-1">
                      Digital Wallet
                    </Text>
                    <Text className="text-indigo-700 text-sm">
                      PayPal, Apple Pay, Google Pay
                    </Text>
                  </div>
                </div>
              </Section>

              {/* Important Information */}
              {reminderType === 'overdue' && (
                <Section className="bg-red-50 border border-red-200 p-6 mb-6 rounded-lg">
                  <Heading className="text-lg font-semibold text-red-800 mb-3">
                    ⚠️ Important Notice
                  </Heading>
                  <Text className="text-red-700 mb-2">
                    Your payment is now {daysOverdue} days overdue. Continued non-payment may result in:
                  </Text>
                  <ul className="text-red-700 text-sm space-y-1 ml-6">
                    <li>• Additional late fees</li>
                    <li>• Negative impact on your credit score</li>
                    <li>• Legal action for eviction proceedings</li>
                    <li>• Collection agency involvement</li>
                  </ul>
                </Section>
              )}

              {/* Autopay Promotion */}
              {reminderType !== 'overdue' && (
                <Section className="bg-green-50 border border-green-200 p-6 mb-6 rounded-lg">
                  <Heading className="text-lg font-semibold text-green-800 mb-3">
                    🎯 Never Miss a Payment
                  </Heading>
                  <Text className="text-green-700 mb-3">
                    Set up automatic rent payments and enjoy peace of mind:
                  </Text>
                  <ul className="text-green-700 text-sm space-y-1 mb-4 ml-6">
                    <li>• Never worry about due dates</li>
                    <li>• Avoid late fees completely</li>
                    <li>• Get early payment discounts (when available)</li>
                    <li>• Cancel or modify anytime</li>
                  </ul>
                  <Button
                    href="https://tenantflow.app/tenant/autopay-setup"
                    className="bg-green-600 text-white px-6 py-2 rounded font-medium hover:bg-green-700 transition-colors"
                  >
                    Set Up Autopay
                  </Button>
                </Section>
              )}

              {/* Payment History */}
              <Section className="bg-gray-50 border border-gray-200 p-4 rounded-lg mb-6">
                <Text className="font-semibold text-gray-800 mb-2">
                  📊 Quick Access
                </Text>
                <div className="flex flex-wrap gap-4">
                  <Link
                    href="https://tenantflow.app/tenant/payment-history"
                    className="text-blue-600 underline text-sm"
                  >
                    View Payment History
                  </Link>
                  <Link
                    href="https://tenantflow.app/tenant/receipts"
                    className="text-blue-600 underline text-sm"
                  >
                    Download Receipts
                  </Link>
                  <Link
                    href="https://tenantflow.app/tenant/lease"
                    className="text-blue-600 underline text-sm"
                  >
                    View Lease Agreement
                  </Link>
                </div>
              </Section>

              {/* Contact Information */}
              <Section className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
                <Heading className="text-lg font-semibold text-yellow-800 mb-3">
                  📞 Questions or Payment Issues?
                </Heading>
                <Text className="text-yellow-700 mb-3">
                  If you're experiencing financial hardship or have questions about your payment:
                </Text>
                <Text className="text-yellow-700 mb-1">
                  <strong>Contact:</strong> {landlordName}
                </Text>
                <Text className="text-yellow-700 mb-3">
                  <strong>Phone:</strong> {landlordPhone}
                </Text>
                <Text className="text-yellow-700 text-sm">
                  We're here to work with you on payment arrangements when needed.
                </Text>
              </Section>
            </Section>

            {/* Footer */}
            <Section className="bg-gray-100 px-8 py-6 rounded-b-lg text-center">
              <Text className="text-gray-500 text-sm mb-2">
                Secure payments powered by TenantFlow<br />
                Questions? Contact {landlordName}
              </Text>
              <Hr className="border-gray-300 my-4" />
              <Text className="text-gray-400 text-xs">
                This payment reminder was sent automatically by TenantFlow.{' '}
                <Link href="https://tenantflow.app/tenant/notifications" className="text-gray-400 underline">
                  Manage notification preferences
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}