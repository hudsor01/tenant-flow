import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  Home, 
  CreditCard, 
  Wrench, 
  FileText, 
  User, 
  LogOut,
  Building
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useTenantData } from '@/hooks/useTenantData'

interface TenantLayoutProps {
  children: React.ReactNode
}

export default function TenantLayout({ children }: TenantLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut } = useAuthStore()
  const { data: tenantData } = useTenantData()

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth/login')
  }

  const navigation = [
    {
      name: 'Dashboard',
      href: '/tenant/dashboard',
      icon: Home,
      current: location.pathname === '/tenant/dashboard'
    },
    {
      name: 'Payments',
      href: '/tenant/payments',
      icon: CreditCard,
      current: location.pathname === '/tenant/payments'
    },
    {
      name: 'Maintenance',
      href: '/tenant/maintenance',
      icon: Wrench,
      current: location.pathname === '/tenant/maintenance'
    },
    {
      name: 'Documents',
      href: '/tenant/documents',
      icon: FileText,
      current: location.pathname === '/tenant/documents'
    },
    {
      name: 'Profile',
      href: '/tenant/profile',
      icon: User,
      current: location.pathname === '/tenant/profile'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo/Brand */}
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 bg-green-600 rounded-lg mr-3">
                <Building className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">TenantFlow</h1>
                <p className="text-xs text-gray-500">Tenant Portal</p>
              </div>
            </div>

            {/* Property Info */}
            {tenantData && (
              <div className="hidden md:block text-center">
                <p className="text-sm font-medium text-gray-900">{tenantData.property.name}</p>
                <p className="text-xs text-gray-500">Unit {tenantData.property.unit.unitNumber}</p>
              </div>
            )}

            {/* User Menu */}
            <div className="flex items-center space-x-3">
              {tenantData && (
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-gray-900">{tenantData.tenant.name}</p>
                  <p className="text-xs text-gray-500">Tenant</p>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card className="p-4">
              <nav className="space-y-2">
                {navigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        item.current
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-3" />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>

              {/* Quick Stats */}
              {tenantData && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Quick Info
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Rent:</span>
                      <span className="font-medium">${tenantData.lease.rentAmount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Status:</span>
                      <span className="font-medium text-green-600">{tenantData.lease.status}</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}