import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Users, FileText, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface EmptyStatePlaceholderProps {
  type: 'properties' | 'tenants' | 'payments' | 'maintenance'
}

export default function EmptyStatePlaceholder({ type }: EmptyStatePlaceholderProps) {
  const navigate = useNavigate()

  const content = {
    properties: {
      icon: Building2,
      title: 'No Properties Yet',
      description: 'Start by adding your first property to manage.',
      buttonText: 'Add Property',
      action: () => navigate('/properties')
    },
    tenants: {
      icon: Users,
      title: 'No Tenants Yet',
      description: 'Once you add properties, you can invite tenants.',
      buttonText: 'View Properties',
      action: () => navigate('/properties')
    },
    payments: {
      icon: FileText,
      title: 'No Payments Recorded',
      description: 'Payment records will appear here once you start tracking rent.',
      buttonText: 'Record Payment',
      action: () => navigate('/payments')
    },
    maintenance: {
      icon: FileText,
      title: 'No Maintenance Requests',
      description: 'Maintenance requests from tenants will appear here.',
      buttonText: 'View Properties',
      action: () => navigate('/properties')
    }
  }

  const { icon: Icon, title, description, buttonText, action } = content[type]

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-gray-600" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button onClick={action} className="mt-4">
          <Plus className="w-4 h-4 mr-2" />
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  )
}