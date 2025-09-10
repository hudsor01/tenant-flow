import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { HelpCircle, Mail, Book, MessageCircle } from "lucide-react"
import { PageLayout } from "@/components/layout/page-layout"

export default function HelpPage() {
  return (
    <PageLayout containerClass="max-w-4xl py-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Get Help</h1>
          <p className="text-muted-foreground">
            Find answers to common questions and get support for TenantFlow
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Book className="size-5 text-primary" />
                <CardTitle>Documentation</CardTitle>
              </div>
              <CardDescription>
                Browse our comprehensive guides and tutorials
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Learn how to manage properties, tenants, and leases effectively with our step-by-step documentation.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageCircle className="size-5 text-primary" />
                <CardTitle>Live Chat</CardTitle>
              </div>
              <CardDescription>
                Chat with our support team in real-time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-success border-success/30">
                  Online
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Average response time: 2 minutes
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="size-5 text-primary" />
                <CardTitle>Email Support</CardTitle>
              </div>
              <CardDescription>
                Send us an email for detailed assistance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Get in touch at <span className="font-medium">support@tenantflow.app</span> for complex issues or feature requests.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <HelpCircle className="size-5 text-primary" />
                <CardTitle>FAQ</CardTitle>
              </div>
              <CardDescription>
                Common questions and quick answers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Find quick solutions to frequently asked questions about property management and billing.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  )
}