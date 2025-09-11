import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle, Clock, TrendingUp, Users, Zap, Book, MessageCircle, Phone, Mail } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { FooterMinimal } from "@/components/sections/footer-minimal"

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto px-6 max-w-4xl text-center">
          <Badge variant="outline" className="mb-6">
            <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
            Trusted by 10,000+ property managers
          </Badge>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Get help increasing your
            <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
              NOI by 40%
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Our property management experts are here to help you reduce costs by 32%, automate 80% of tasks, 
            and guarantee ROI in 90 days. Get the support you need to transform your operations.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="px-8">
              Start 14-day transformation
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="px-8">
              Schedule Expert Call
            </Button>
          </div>
        </div>
      </section>

      {/* Support Options */}
      <section className="py-24">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Expert support for maximum ROI
            </h2>
            <p className="text-xl text-muted-foreground">
              Get help from property management automation specialists who understand your challenges
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle>Live Expert Chat</CardTitle>
                <CardDescription>
                  Instant answers from property management specialists
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="outline" className="text-success border-success/30 mb-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Online Now
                </Badge>
                <p className="text-sm text-muted-foreground mb-4">
                  Average response: 90 seconds
                </p>
                <Button className="w-full">Start Chat</Button>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-8 h-8 text-blue-600" />
                </div>
                <CardTitle>ROI Consultation</CardTitle>
                <CardDescription>
                  Free 30-minute call with automation expert
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Get custom ROI projection for your portfolio
                </p>
                <Button className="w-full" variant="outline">
                  Schedule Call
                </Button>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Book className="w-8 h-8 text-purple-600" />
                </div>
                <CardTitle>Success Guides</CardTitle>
                <CardDescription>
                  Step-by-step guides to maximize your results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Learn proven strategies from top property managers
                </p>
                <Button className="w-full" variant="outline">
                  Browse Guides
                </Button>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-orange-600" />
                </div>
                <CardTitle>Priority Support</CardTitle>
                <CardDescription>
                  Detailed help via email within 4 hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  support@tenantflow.app
                </p>
                <Button className="w-full" variant="outline">
                  Send Email
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="py-24 bg-muted/20">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Success stories from our clients
            </h2>
            <p className="text-xl text-muted-foreground">
              See how TenantFlow's support team helped property managers achieve amazing results
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <TrendingUp className="w-8 h-8 text-green-600 mr-3" />
                  <div>
                    <h3 className="font-semibold">Sarah M.</h3>
                    <p className="text-sm text-muted-foreground">Portfolio Manager</p>
                  </div>
                </div>
                <p className="text-muted-foreground mb-4">
                  "TenantFlow's support team helped me implement automation that increased my NOI by 45% in just 60 days. 
                  Their expertise made all the difference."
                </p>
                <div className="text-sm font-semibold text-green-600">
                  Result: 45% NOI increase in 60 days
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <Clock className="w-8 h-8 text-blue-600 mr-3" />
                  <div>
                    <h3 className="font-semibold">Michael R.</h3>
                    <p className="text-sm text-muted-foreground">Real Estate Investor</p>
                  </div>
                </div>
                <p className="text-muted-foreground mb-4">
                  "The onboarding team had me fully automated within 24 hours. I now save 25+ hours per week 
                  and my vacancy rates dropped by 70%."
                </p>
                <div className="text-sm font-semibold text-blue-600">
                  Result: 25+ hours saved per week
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <Users className="w-8 h-8 text-purple-600 mr-3" />
                  <div>
                    <h3 className="font-semibold">David L.</h3>
                    <p className="text-sm text-muted-foreground">Property Management Company</p>
                  </div>
                </div>
                <p className="text-muted-foreground mb-4">
                  "TenantFlow's customer success manager helped us scale from 50 to 500 properties seamlessly. 
                  Our maintenance costs dropped 35%."
                </p>
                <div className="text-sm font-semibold text-purple-600">
                  Result: Scaled to 500 properties, 35% cost reduction
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Popular Resources */}
      <section className="py-24">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Popular resources
            </h2>
            <p className="text-xl text-muted-foreground">
              Quick access to the most requested help topics
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: "How to increase NOI by 40% in 90 days",
                description: "Step-by-step guide to implementing the strategies that deliver guaranteed results",
                badge: "Most Popular",
                badgeColor: "bg-green-100 text-green-800"
              },
              {
                title: "Automating 80% of daily tasks",
                description: "Complete setup guide for workflow automation that saves 20+ hours per week",
                badge: "Implementation Guide",
                badgeColor: "bg-blue-100 text-blue-800"
              },
              {
                title: "Reducing vacancy time by 65%",
                description: "Proven techniques for faster tenant placement and reduced revenue loss",
                badge: "Quick Win",
                badgeColor: "bg-purple-100 text-purple-800"
              },
              {
                title: "Cutting maintenance costs by 32%",
                description: "Smart vendor management and predictive maintenance strategies",
                badge: "Cost Savings",
                badgeColor: "bg-orange-100 text-orange-800"
              }
            ].map((resource, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-semibold text-lg leading-tight pr-4">
                      {resource.title}
                    </h3>
                    <Badge className={resource.badgeColor}>
                      {resource.badge}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    {resource.description}
                  </p>
                  <Button variant="outline" className="w-full">
                    Read Guide
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto px-6 max-w-4xl text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to stop losing money?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join 10,000+ property managers who have increased their NOI by 40% with TenantFlow. 
            Our experts are standing by to help you get started.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="px-8">
              Start 14-day transformation
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="px-8 text-white border-white hover:bg-white hover:text-blue-600">
              Talk to an Expert
            </Button>
          </div>
        </div>
      </section>

      <FooterMinimal />
    </div>
  )
}