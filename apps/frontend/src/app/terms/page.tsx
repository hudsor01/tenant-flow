import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Building2, FileText, Mail } from 'lucide-react'

export default function TermsPage() {
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
            <FileText className="text-primary h-16 w-16" />
          </div>
          <h1 className="mb-6 text-5xl font-bold text-gray-900">
            Terms of Service
          </h1>
          <p className="text-xl text-gray-600">
            These terms and conditions outline the rules and regulations for the use of TenantFlow's services.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            Last updated: January 1, 2025
          </p>
        </div>
      </section>

      {/* Terms Content */}
      <section className="px-4 py-16">
        <div className="container mx-auto max-w-4xl">
          <div className="space-y-12">
            
            {/* Acceptance of Terms */}
            <Card className="p-8">
              <h2 className="mb-6 text-3xl font-bold text-gray-900">
                Acceptance of Terms
              </h2>
              <div className="space-y-4 text-gray-600">
                <p>
                  By accessing and using TenantFlow's services, you accept and agree to be bound by the terms 
                  and provision of this agreement. These Terms of Service ("Terms") govern your use of 
                  TenantFlow's property management platform and related services.
                </p>
                <p>
                  If you do not agree to abide by the above, please do not use this service.
                </p>
              </div>
            </Card>

            {/* Service Description */}
            <Card className="p-8">
              <h2 className="mb-6 text-3xl font-bold text-gray-900">
                Service Description
              </h2>
              <div className="space-y-4 text-gray-600">
                <p>
                  TenantFlow provides a cloud-based property management platform that enables users to:
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li>Manage property listings and tenant information</li>
                  <li>Process rental payments and track financial records</li>
                  <li>Handle maintenance requests and communications</li>
                  <li>Generate reports and analytics</li>
                  <li>Access mobile applications and integrations</li>
                </ul>
              </div>
            </Card>

            {/* User Accounts */}
            <Card className="p-8">
              <h2 className="mb-6 text-3xl font-bold text-gray-900">
                User Accounts and Responsibilities
              </h2>
              <div className="space-y-4 text-gray-600">
                <p>
                  To use our services, you must create an account and provide accurate information:
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li>You are responsible for maintaining the confidentiality of your account</li>
                  <li>You agree to provide accurate, current, and complete information</li>
                  <li>You must notify us immediately of any unauthorized access</li>
                  <li>You are responsible for all activities that occur under your account</li>
                  <li>You must be at least 18 years old to create an account</li>
                </ul>
              </div>
            </Card>

            {/* Acceptable Use */}
            <Card className="p-8">
              <h2 className="mb-6 text-3xl font-bold text-gray-900">
                Acceptable Use Policy
              </h2>
              <div className="space-y-4 text-gray-600">
                <p>
                  You agree not to use our services for any unlawful or prohibited activities:
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li>Violating any applicable laws or regulations</li>
                  <li>Transmitting harmful, offensive, or inappropriate content</li>
                  <li>Interfering with or disrupting our services</li>
                  <li>Attempting to gain unauthorized access to our systems</li>
                  <li>Using our services for competitive intelligence or benchmarking</li>
                </ul>
              </div>
            </Card>

            {/* Payment Terms */}
            <Card className="p-8">
              <h2 className="mb-6 text-3xl font-bold text-gray-900">
                Payment Terms
              </h2>
              <div className="space-y-4 text-gray-600">
                <p>
                  Our payment terms are as follows:
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li>Subscription fees are billed in advance on a monthly or annual basis</li>
                  <li>All fees are non-refundable except as required by law</li>
                  <li>We may change our pricing with 30 days advance notice</li>
                  <li>Failure to pay may result in suspension or termination of services</li>
                  <li>You are responsible for all taxes related to your use of our services</li>
                </ul>
              </div>
            </Card>

            {/* Data and Privacy */}
            <Card className="p-8">
              <h2 className="mb-6 text-3xl font-bold text-gray-900">
                Data and Privacy
              </h2>
              <div className="space-y-4 text-gray-600">
                <p>
                  Your privacy and data security are important to us:
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li>We collect and use your data as described in our Privacy Policy</li>
                  <li>You retain ownership of your data and content</li>
                  <li>We implement industry-standard security measures</li>
                  <li>You are responsible for backing up your important data</li>
                  <li>We may use aggregated, anonymized data for analytics and improvements</li>
                </ul>
                <p className="mt-4">
                  For detailed information about our data practices, please review our{' '}
                  <Link href="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            </Card>

            {/* Service Availability */}
            <Card className="p-8">
              <h2 className="mb-6 text-3xl font-bold text-gray-900">
                Service Availability and Support
              </h2>
              <div className="space-y-4 text-gray-600">
                <p>
                  We strive to provide reliable service with minimal interruptions:
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li>We target 99.9% uptime but do not guarantee uninterrupted service</li>
                  <li>Scheduled maintenance will be announced in advance when possible</li>
                  <li>Support is provided via email and our help center</li>
                  <li>Emergency issues are prioritized based on severity</li>
                </ul>
              </div>
            </Card>

            {/* Termination */}
            <Card className="p-8">
              <h2 className="mb-6 text-3xl font-bold text-gray-900">
                Termination
              </h2>
              <div className="space-y-4 text-gray-600">
                <p>
                  Either party may terminate this agreement:
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li>You may cancel your account at any time through your account settings</li>
                  <li>We may terminate accounts that violate these terms</li>
                  <li>Upon termination, your access to the service will be discontinued</li>
                  <li>You may export your data for 30 days after termination</li>
                  <li>We reserve the right to delete data after the retention period</li>
                </ul>
              </div>
            </Card>

            {/* Limitation of Liability */}
            <Card className="p-8">
              <h2 className="mb-6 text-3xl font-bold text-gray-900">
                Limitation of Liability
              </h2>
              <div className="space-y-4 text-gray-600">
                <p>
                  To the maximum extent permitted by law:
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li>Our liability is limited to the amount paid for our services</li>
                  <li>We are not liable for indirect, incidental, or consequential damages</li>
                  <li>You agree to indemnify us against claims arising from your use of our services</li>
                  <li>These limitations apply even if we have been advised of potential damages</li>
                </ul>
              </div>
            </Card>

            {/* Changes to Terms */}
            <Card className="p-8">
              <h2 className="mb-6 text-3xl font-bold text-gray-900">
                Changes to Terms
              </h2>
              <div className="text-gray-600">
                <p>
                  We may update these Terms of Service from time to time. We will notify you of any 
                  material changes by posting the new terms on this page and updating the "last updated" 
                  date. Your continued use of our services after any changes constitutes acceptance of the new terms.
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
            Questions About These Terms?
          </h2>
          <p className="mb-8 text-xl text-gray-600">
            If you have any questions about these terms of service, please contact us.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/contact">
                Contact Us
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/privacy">
                Privacy Policy
              </Link>
            </Button>
          </div>
          
          <div className="mt-12 space-y-2 text-sm text-gray-500">
            <p>TenantFlow, Inc.</p>
            <p>Email: legal@tenantflow.com</p>
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