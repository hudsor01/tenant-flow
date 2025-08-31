import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  MapPin, 
  Clock, 
  Users, 
  Heart, 
  Coffee, 
  Laptop,
  Globe,
  DollarSign,
  ArrowRight,
  Briefcase
} from 'lucide-react'

const openPositions = [
  {
    id: 1,
    title: "Senior Full-Stack Engineer",
    department: "Engineering",
    location: "Remote (US)",
    type: "Full-time",
    description: "Join our engineering team to build the next generation of property management tools using React, Node.js, and PostgreSQL.",
    requirements: ["5+ years full-stack development", "Experience with React and Node.js", "PostgreSQL knowledge", "Property tech experience preferred"],
    posted: "2 days ago"
  },
  {
    id: 2,
    title: "Product Designer",
    department: "Design",
    location: "San Francisco, CA / Remote",
    type: "Full-time", 
    description: "Design intuitive user experiences for property managers and tenants. Work closely with engineering to bring designs to life.",
    requirements: ["3+ years product design experience", "Figma proficiency", "SaaS product experience", "User research skills"],
    posted: "1 week ago"
  },
  {
    id: 3,
    title: "Customer Success Manager",
    department: "Customer Success",
    location: "Austin, TX / Remote",
    type: "Full-time",
    description: "Help our customers succeed with TenantFlow. Build relationships, provide training, and ensure long-term success.",
    requirements: ["2+ years customer success experience", "SaaS background preferred", "Excellent communication skills", "Property management knowledge a plus"],
    posted: "3 days ago"
  },
  {
    id: 4,
    title: "DevOps Engineer",
    department: "Engineering",
    location: "Remote (US)",
    type: "Full-time",
    description: "Scale our infrastructure and improve deployment processes. Work with modern cloud technologies and CI/CD pipelines.",
    requirements: ["3+ years DevOps experience", "AWS/GCP knowledge", "Docker & Kubernetes", "Infrastructure as code"],
    posted: "1 week ago"
  }
]

const benefits = [
  {
    icon: DollarSign,
    title: "Competitive Salary",
    description: "Top-tier compensation packages with equity options"
  },
  {
    icon: Heart,
    title: "Health & Wellness",
    description: "Comprehensive health, dental, and vision insurance"
  },
  {
    icon: Laptop,
    title: "Remote Flexibility",
    description: "Work from anywhere with flexible hours"
  },
  {
    icon: Coffee,
    title: "Professional Development", 
    description: "$2,000 annual learning and conference budget"
  },
  {
    icon: Globe,
    title: "Unlimited PTO",
    description: "Take time off when you need it most"
  },
  {
    icon: Users,
    title: "Great Team",
    description: "Work with talented, passionate people who care"
  }
]

const values = [
  {
    title: "Customer Obsessed",
    description: "We put our customers at the center of everything we do"
  },
  {
    title: "Move Fast",
    description: "We ship quickly and iterate based on feedback"
  },
  {
    title: "Own It",
    description: "We take ownership of our work and decisions"
  },
  {
    title: "Build Together",
    description: "We collaborate openly and support each other"
  }
]

export default function CareersPage() {
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
      <section className="bg-gradient-to-br from-blue-50 to-purple-50 px-4 py-24">
        <div className="container mx-auto text-center">
          <Badge className="from-primary mb-6 bg-gradient-to-r to-purple-600 text-white">
            <Briefcase className="mr-2 h-4 w-4" />
            We're Hiring
          </Badge>
          <h1 className="mb-6 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-5xl font-bold text-transparent">
            Join Our Mission
          </h1>
          <p className="mx-auto max-w-3xl text-xl text-gray-600">
            Help us transform property management for millions of landlords and tenants worldwide. 
            Build the future of real estate technology with a team that values innovation, growth, and impact.
          </p>
        </div>
      </section>

      {/* Company Values */}
      <section className="px-4 py-20">
        <div className="container mx-auto">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900">Our Values</h2>
            <p className="text-xl text-gray-600">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {values.map((value, index) => (
              <Card key={index} className="border-0 bg-gradient-to-br from-white to-gray-50 text-center shadow-lg">
                <CardContent className="p-8">
                  <h3 className="mb-4 text-xl font-bold text-gray-900">{value.title}</h3>
                  <p className="text-gray-600">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="bg-gray-50 px-4 py-20">
        <div className="container mx-auto">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900">Open Positions</h2>
            <p className="text-xl text-gray-600">
              Find your next opportunity to make an impact
            </p>
          </div>

          <div className="space-y-6">
            {openPositions.map((position) => (
              <Card key={position.id} className="group transition-shadow duration-300 hover:shadow-lg">
                <CardContent className="p-8">
                  <div className="flex flex-col space-y-6 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
                    <div className="flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-3">
                        <h3 className="text-2xl font-bold text-gray-900">{position.title}</h3>
                        <Badge variant="outline">{position.department}</Badge>
                        <Badge className="bg-green-100 text-green-800">{position.type}</Badge>
                      </div>
                      
                      <p className="mb-4 text-gray-600 leading-relaxed">{position.description}</p>
                      
                      <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <MapPin className="mr-1 h-4 w-4" />
                          {position.location}
                        </div>
                        <div className="flex items-center">
                          <Clock className="mr-1 h-4 w-4" />
                          Posted {position.posted}
                        </div>
                      </div>

                      <div>
                        <h4 className="mb-2 font-semibold text-gray-900">Requirements:</h4>
                        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
                          {position.requirements.map((req, index) => (
                            <li key={index}>{req}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="lg:ml-8">
                      <Button size="lg" className="group w-full lg:w-auto">
                        Apply Now
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="mb-4 text-gray-600">
              Don't see a role that fits? We're always looking for great people.
            </p>
            <Button variant="outline" size="lg">
              <Link href="/contact">
                Send Us Your Resume
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="px-4 py-20">
        <div className="container mx-auto">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900">Why Work With Us?</h2>
            <p className="text-xl text-gray-600">
              We believe great people deserve great benefits
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon
              return (
                <Card key={index} className="border-0 bg-gradient-to-br from-white to-gray-50 shadow-lg">
                  <CardContent className="p-8 text-center">
                    <div className="text-primary mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                      <Icon className="h-8 w-8" />
                    </div>
                    <h3 className="mb-3 text-xl font-bold text-gray-900">{benefit.title}</h3>
                    <p className="text-gray-600">{benefit.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Team Culture */}
      <section className="from-primary bg-gradient-to-r to-purple-600 px-4 py-20 text-white">
        <div className="container mx-auto text-center">
          <div className="mb-6 flex items-center justify-center">
            <Users className="h-16 w-16" />
          </div>
          <h2 className="mb-6 text-4xl font-bold">Built by Amazing People</h2>
          <p className="mx-auto mb-8 max-w-3xl text-xl text-blue-100">
            We're a diverse team of builders, designers, and problem-solvers who are passionate about 
            creating technology that makes a real difference in people's lives.
          </p>
          
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-lg bg-white/10 p-6">
              <div className="mb-3 text-2xl font-bold">50+</div>
              <div className="text-blue-100">Team Members</div>
            </div>
            <div className="rounded-lg bg-white/10 p-6">
              <div className="mb-3 text-2xl font-bold">12</div>
              <div className="text-blue-100">Countries</div>
            </div>
            <div className="rounded-lg bg-white/10 p-6">
              <div className="mb-3 text-2xl font-bold">4.8★</div>
              <div className="text-blue-100">Glassdoor Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Application Process */}
      <section className="bg-gray-50 px-4 py-20">
        <div className="container mx-auto">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900">Our Hiring Process</h2>
            <p className="text-xl text-gray-600">
              Transparent, respectful, and designed to get to know each other
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-4">
            {[
              { step: 1, title: "Apply", description: "Submit your application and tell us about yourself" },
              { step: 2, title: "Screen", description: "Brief phone/video call with our team" },
              { step: 3, title: "Interview", description: "Technical/cultural fit interviews with the team" },
              { step: 4, title: "Offer", description: "Welcome to the team! Let's change the world together" }
            ].map((stage) => (
              <Card key={stage.step} className="text-center">
                <CardContent className="p-6">
                  <div className="from-primary to-purple-600 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r text-white font-bold">
                    {stage.step}
                  </div>
                  <h3 className="mb-3 text-lg font-semibold text-gray-900">{stage.title}</h3>
                  <p className="text-sm text-gray-600">{stage.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20">
        <div className="container mx-auto text-center">
          <h2 className="mb-4 text-4xl font-bold text-gray-900">
            Ready to Make an Impact?
          </h2>
          <p className="mb-8 text-xl text-gray-600">
            Join us in transforming how property management works
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button size="lg">
              <Link href="/contact" className="flex items-center">
                View All Positions
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline">
              <Link href="/about">
                Learn About Us
              </Link>
            </Button>
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