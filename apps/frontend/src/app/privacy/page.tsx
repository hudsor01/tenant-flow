import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Building2, Shield, Mail } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b bg-white/95 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="group flex items-center space-x-2">
            <Building2 className="text-primary h-8 w-8 transition-transform group-hover:scale-110" />
            <span className="from-primary bg-gradient-to-r to-purple-600 bg-clip-text text-xl font-bold text-transparent">
              TenantFlow
            </span>
          </Link>
          <Button asChild>
            <Link href="/auth/signup">Get Started Free</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-purple-50 px-4 py-20">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="mb-6 flex items-center justify-center">
            <Shield className="text-primary h-16 w-16" />
          </div>
          <h1 className="mb-6 text-5xl font-bold text-gray-900">
            Privacy Policy
          </h1>
          <p className="text-xl text-gray-600">
            Your privacy is important to us. This policy explains how we collect, use, and protect your information.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            Last updated: January 1, 2025
          </p>
        </div>
      </section>

      {/* Privacy Content */}
      <section className="px-4 py-16">
        <div className="container mx-auto max-w-4xl">
          <div className="space-y-12">
            
            {/* Information We Collect */}
            <Card className="p-8">
              <h2 className="mb-6 text-3xl font-bold text-gray-900">
                Information We Collect
              </h2>
              <div className="space-y-4 text-gray-600">
                <h3 className="text-xl font-semibold text-gray-900">Personal Information</h3>
                <p>
                  We collect information you provide directly to us, including:
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li>Name, email address, and contact information</li>
                  <li>Property details and tenant information</li>
                  <li>Payment and billing information</li>
                  <li>Communications and support requests</li>
                </ul>
                
                <h3 className="mt-6 text-xl font-semibold text-gray-900">Usage Information</h3>
                <p>
                  We automatically collect certain information about your use of our services:
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li>Log data including IP address, browser type, and pages visited</li>
                  <li>Device information and operating system</li>
                  <li>Usage patterns and feature interactions</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </div>
            </Card>

            {/* How We Use Information */}
            <Card className="p-8">
              <h2 className="mb-6 text-3xl font-bold text-gray-900">
                How We Use Your Information
              </h2>
              <div className="space-y-4 text-gray-600">
                <p>We use the information we collect to:</p>
                <ul className="ml-6 list-disc space-y-2">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Process transactions and manage your account</li>
                  <li>Send important updates and notifications</li>
                  <li>Provide customer support and respond to inquiries</li>
                  <li>Analyze usage patterns to enhance user experience</li>
                  <li>Comply with legal obligations and prevent fraud</li>
                </ul>
              </div>
            </Card>

            {/* Information Sharing */}
            <Card className="p-8">
              <h2 className="mb-6 text-3xl font-bold text-gray-900">
                Information Sharing and Disclosure
              </h2>
              <div className="space-y-4 text-gray-600">
                <p>
                  We do not sell, trade, or rent your personal information. We may share your information only in these circumstances:
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li><strong>Service Providers:</strong> With trusted third parties who assist in providing our services</li>
                  <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                  <li><strong>Business Transfers:</strong> In connection with mergers, acquisitions, or asset sales</li>
                  <li><strong>Consent:</strong> With your explicit permission</li>
                </ul>
              </div>
            </Card>

            {/* Data Security */}
            <Card className="p-8">
              <h2 className="mb-6 text-3xl font-bold text-gray-900">
                Data Security
              </h2>
              <div className="space-y-4 text-gray-600">
                <p>
                  We implement appropriate technical and organizational measures to protect your information:
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li>Encryption of data in transit and at rest</li>
                  <li>Regular security assessments and monitoring</li>
                  <li>Access controls and employee training</li>
                  <li>Secure data centers and infrastructure</li>
                </ul>
                <p className="mt-4">
                  While we strive to protect your information, no method of transmission over the internet is 100% secure.
                </p>
              </div>
            </Card>

            {/* Your Rights */}
            <Card className="p-8">
              <h2 className="mb-6 text-3xl font-bold text-gray-900">
                Your Rights and Choices
              </h2>
              <div className="space-y-4 text-gray-600">
                <p>You have the right to:</p>
                <ul className="ml-6 list-disc space-y-2">
                  <li>Access and review your personal information</li>
                  <li>Correct inaccurate or incomplete data</li>
                  <li>Delete your account and associated data</li>
                  <li>Export your data in a portable format</li>
                  <li>Opt out of marketing communications</li>
                  <li>Object to certain processing activities</li>
                </ul>
                <p className="mt-4">
                  To exercise these rights, contact us using the information below.
                </p>
              </div>
            </Card>

            {/* Cookies */}
            <Card className="p-8">
              <h2 className="mb-6 text-3xl font-bold text-gray-900">
                Cookies and Tracking
              </h2>
              <div className="space-y-4 text-gray-600">
                <p>
                  We use cookies and similar technologies to enhance your experience:
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li><strong>Essential Cookies:</strong> Required for basic functionality</li>
                  <li><strong>Analytics Cookies:</strong> Help us understand how you use our service</li>
                  <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
                </ul>
                <p className="mt-4">
                  You can control cookies through your browser settings, though this may affect functionality.
                </p>
              </div>
            </Card>

            {/* Children's Privacy */}
            <Card className="p-8">
              <h2 className="mb-6 text-3xl font-bold text-gray-900">
                Children's Privacy
              </h2>
              <div className="text-gray-600">
                <p>
                  Our services are not intended for children under 13. We do not knowingly collect personal 
                  information from children under 13. If we become aware that we have collected such information, 
                  we will take steps to delete it promptly.
                </p>
              </div>
            </Card>

            {/* Policy Changes */}
            <Card className="p-8">
              <h2 className="mb-6 text-3xl font-bold text-gray-900">
                Changes to This Policy
              </h2>
              <div className="text-gray-600">
                <p>
                  We may update this privacy policy from time to time. We will notify you of any material 
                  changes by posting the new policy on this page and updating the "last updated" date. 
                  Your continued use of our services after any changes constitutes acceptance of the new policy.
                </p>
              </div>
            </Card>

          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="bg-gray-50 px-4 py-16">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="mb-6 flex items-center justify-center">
            <Mail className="text-primary h-12 w-12" />
          </div>
          <h2 className="mb-4 text-3xl font-bold text-gray-900">
            Questions About Privacy?
          </h2>
          <p className="mb-8 text-xl text-gray-600">
            If you have any questions about this privacy policy or our data practices, please contact us.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/contact">
                Contact Us
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/contact">
                Visit Help Center
              </Link>
            </Button>
          </div>
          
          <div className="mt-12 space-y-2 text-sm text-gray-500">
            <p>TenantFlow, Inc.</p>
            <p>Email: privacy@tenantflow.com</p>
            <p>Address: [Company Address]</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 px-4 py-8 text-gray-400">
        <div className="container mx-auto text-center">
          <p>&copy; 2024 TenantFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}