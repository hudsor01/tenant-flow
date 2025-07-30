import { createFileRoute } from '@tanstack/react-router'
import { XCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/billing/cancel')({
  component: BillingCancelPage,
})

function BillingCancelPage() {
  return (
    <div className="container max-w-2xl mx-auto py-16">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="h-16 w-16 text-orange-500" />
          </div>
          <CardTitle className="text-2xl">Checkout Cancelled</CardTitle>
          <CardDescription className="text-lg mt-2">
            Your subscription purchase was cancelled.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted rounded-lg p-6">
            <h3 className="font-semibold mb-3">No charges were made</h3>
            <p className="text-sm text-muted-foreground">
              You have not been charged. You can return to the pricing page to select a plan 
              when you're ready, or continue using TenantFlow with your current plan.
            </p>
          </div>

          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Have questions about our plans? Feel free to contact our support team.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link to="/pricing">View Plans</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}