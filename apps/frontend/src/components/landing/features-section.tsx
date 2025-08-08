import { 
  Building2, 
  Users, 
  FileText, 
  CreditCard, 
  Wrench, 
  BarChart3,
  ChevronRight
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const features = [
  {
    icon: Building2,
    title: 'Property Management',
    description: 'Track all your properties, units, and occupancy rates in one dashboard',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    icon: Users,
    title: 'Tenant Portal',
    description: 'Give tenants self-service access to pay rent and submit requests',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  {
    icon: FileText,
    title: 'Digital Leases',
    description: 'Create, sign, and manage lease agreements digitally',
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  {
    icon: CreditCard,
    title: 'Online Payments',
    description: 'Collect rent and fees online with automated reminders',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  },
  {
    icon: Wrench,
    title: 'Maintenance Tracking',
    description: 'Manage work orders and vendor assignments efficiently',
    color: 'text-red-600',
    bgColor: 'bg-red-50'
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reports',
    description: 'Track performance with detailed financial reporting',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50'
  }
]

export function FeaturesSection() {
  return (
    <section className="py-20 px-4 bg-gray-50">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            Everything You Need in One Platform
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Stop juggling multiple tools. TenantFlow brings all your property management needs together.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer group"
            >
              <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform", feature.bgColor)}>
                <feature.icon className={cn("h-6 w-6", feature.color)} />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
              <ChevronRight className="w-5 h-5 text-gray-400 mt-4 group-hover:text-blue-600 group-hover:translate-x-2 transition-all" />
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}