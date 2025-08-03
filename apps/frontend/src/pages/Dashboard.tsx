import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { 
  Building2, 
  Users, 
  Wrench, 
  FileText, 
  TrendingUp, 
  Plus,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Activity
} from 'lucide-react'
import { api } from '@/lib/api/axios-client'
import { useAuth } from '@/hooks/useAuth'

// Professional metric card animations
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.6,
      ease: [0.4, 0.0, 0.2, 1]
    }
  }),
  hover: {
    y: -4,
    scale: 1.02,
    transition: { duration: 0.2, ease: [0.4, 0.0, 0.2, 1] }
  }
}

const contentVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      duration: 0.8
    }
  }
}

interface MetricCardProps {
  title: string
  value: string | number
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  trend?: { value: number; isPositive: boolean }
  color: 'navy' | 'steel' | 'emerald' | 'gold'
  index: number
}

function MetricCard({ title, value, subtitle, icon: Icon, trend, color, index }: MetricCardProps) {
  const colorClasses = {
    navy: 'from-[#1e3a5f] to-[#2d5a87] border-[#4a7ba3]/30',
    steel: 'from-[#475569] to-[#64748b] border-[#94a3b8]/30',
    emerald: 'from-[#065f46] to-[#047857] border-[#10b981]/30',
    gold: 'from-[#92400e] to-[#b45309] border-[#f59e0b]/30'
  }

  const iconColors = {
    navy: 'text-[#60a5fa]',
    steel: 'text-[#94a3b8]',
    emerald: 'text-[#34d399]',
    gold: 'text-[#fbbf24]'
  }

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      className={`
        relative overflow-hidden rounded-xl border backdrop-blur-sm
        bg-gradient-to-br ${colorClasses[color]}
        shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-black/20
        transition-all duration-300
      `}
    >
      {/* Subtle geometric pattern overlay */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12" />
      </div>
      
      <div className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-lg bg-white/10 ${iconColors[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
          {trend && (
            <div className={`flex items-center text-sm font-medium ${
              trend.isPositive ? 'text-emerald-400' : 'text-red-400'
            }`}>
              <TrendingUp className={`w-4 h-4 mr-1 ${!trend.isPositive ? 'rotate-180' : ''}`} />
              {trend.value}%
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-white/70 uppercase tracking-wide">
            {title}
          </h3>
          <p className="text-3xl font-bold text-white">
            {value}
          </p>
          <p className="text-sm text-white/60">
            {subtitle}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

interface QuickActionProps {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
  color: 'navy' | 'steel' | 'emerald' | 'gold'
}

function QuickAction({ title, description, icon: Icon, onClick, color }: QuickActionProps) {
  const [isPending, startTransition] = useTransition()
  
  const colorClasses = {
    navy: 'hover:bg-[#1e3a5f]/20 border-[#4a7ba3]/30 text-[#60a5fa]',
    steel: 'hover:bg-[#475569]/20 border-[#94a3b8]/30 text-[#94a3b8]',
    emerald: 'hover:bg-[#065f46]/20 border-[#10b981]/30 text-[#34d399]',
    gold: 'hover:bg-[#92400e]/20 border-[#f59e0b]/30 text-[#fbbf24]'
  }

  const handleClick = () => {
    startTransition(() => {
      onClick()
    })
  }

  return (
    <motion.button
      onClick={handleClick}
      disabled={isPending}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative w-full p-4 rounded-lg border backdrop-blur-sm
        bg-white/5 ${colorClasses[color]}
        transition-all duration-200 text-left
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-lg bg-white/10">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-white">
            {title}
          </h4>
          <p className="text-sm text-white/60">
            {description}
          </p>
        </div>
        <Plus className="w-4 h-4 text-white/40" />
      </div>
    </motion.button>
  )
}

export default function Dashboard() {
  const { user: rawUser } = useAuth()
  const user = rawUser && 'organizationId' in rawUser
    ? rawUser
    : null
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d')

  // Fetch dashboard data
  const { data: statsResponse, isLoading } = useQuery({
    queryKey: ['dashboard-stats', user?.organizationId, selectedPeriod],
    queryFn: () => api.dashboard.getStats({ period: selectedPeriod }),
    enabled: !!user?.organizationId,
    staleTime: 5 * 60 * 1000
  })

  const stats = statsResponse?.data;

  const { data: activitiesResponse } = useQuery({
    queryKey: ['recent-activities', user?.organizationId],
    queryFn: () => api.dashboard.getRecentActivities({ limit: 5 }),
    enabled: !!user?.organizationId,
    staleTime: 2 * 60 * 1000
  })

  const activities = activitiesResponse?.data;

  const quickActions = [
    {
      title: 'Add Property',
      description: 'Register a new property to your portfolio',
      icon: Building2,
      onClick: () => {
        // TODO: Implement property creation modal
      },
      color: 'navy' as const
    },
    {
      title: 'New Tenant',
      description: 'Onboard a new tenant to your system',
      icon: Users,
      onClick: () => {
        // TODO: Navigate to tenant creation
      },
      color: 'steel' as const
    },
    {
      title: 'Schedule Maintenance',
      description: 'Create a maintenance request or task',
      icon: Wrench,
      onClick: () => {
        // TODO: Implement maintenance request modal
      },
      color: 'emerald' as const
    },
    {
      title: 'Generate Report',
      description: 'Create financial or operational reports',
      icon: FileText,
      onClick: () => {
        // TODO: Navigate to reports page
      },
      color: 'gold' as const
    }
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#60a5fa] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      variants={contentVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header Section */}
      <motion.div variants={cardVariants} className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, {user?.email?.split('@')[0]}
          </h1>
          <p className="text-white/70">
            Here's what's happening with your properties today
          </p>
        </div>
        
        <div className="mt-4 lg:mt-0">
          <div className="flex items-center space-x-2 bg-white/10 rounded-lg p-1 backdrop-blur-sm">
            {[
              { key: '7d', label: '7 Days' },
              { key: '30d', label: '30 Days' },
              { key: '90d', label: '90 Days' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSelectedPeriod(key as typeof selectedPeriod)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  selectedPeriod === key
                    ? 'bg-white text-[#1e3a5f] shadow-lg'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Properties"
          value={stats?.properties?.total || 0}
          subtitle={`${stats?.properties?.occupied || 0} occupied`}
          icon={Building2}
          trend={{ value: 12, isPositive: true }}
          color="navy"
          index={0}
        />
        <MetricCard
          title="Active Tenants"
          value={stats?.tenants?.active || 0}
          subtitle={`${stats?.tenants?.pending || 0} pending applications`}
          icon={Users}
          trend={{ value: 8, isPositive: true }}
          color="steel"
          index={1}
        />
        <MetricCard
          title="Open Requests"
          value={stats?.maintenance?.open || 0}
          subtitle={`${stats?.maintenance?.urgent || 0} urgent`}
          icon={Wrench}
          trend={{ value: 5, isPositive: false }}
          color="emerald"
          index={2}
        />
        <MetricCard
          title="Monthly Revenue"
          value={`$${(stats?.revenue?.monthly || 0).toLocaleString()}`}
          subtitle={`${stats?.revenue?.growth || 0}% vs last month`}
          icon={DollarSign}
          trend={{ value: stats?.revenue?.growth || 0, isPositive: (stats?.revenue?.growth || 0) > 0 }}
          color="gold"
          index={3}
        />
      </div>

      {/* Quick Actions and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <motion.div variants={cardVariants} className="lg:col-span-1">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-[#60a5fa]" />
              Quick Actions
            </h3>
            <div className="space-y-3">
              {quickActions.map((action) => (
                <QuickAction key={action.title} {...action} />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={cardVariants} className="lg:col-span-2">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-[#60a5fa]" />
              Recent Activity
            </h3>
            
            <div className="space-y-4">
              <AnimatePresence>
                {Array.isArray(activities) && activities.map((activity: Record<string, unknown>, index: number) => (
                  <motion.div
                    key={String(activity.id)}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center space-x-4 p-4 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className={`p-2 rounded-lg ${
                      activity.type === 'maintenance' ? 'bg-emerald-500/20 text-emerald-400' :
                      activity.type === 'tenant' ? 'bg-blue-500/20 text-blue-400' :
                      activity.type === 'lease' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {activity.type === 'maintenance' ? <Wrench className="w-4 h-4" /> :
                       activity.type === 'tenant' ? <Users className="w-4 h-4" /> :
                       activity.type === 'lease' ? <FileText className="w-4 h-4" /> :
                       <Calendar className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{String(activity.title)}</p>
                      <p className="text-white/60 text-sm">{String(activity.description)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/40 text-xs">{String(activity.timestamp)}</p>
                      {typeof activity.status === 'string' && (
                        <div className="flex items-center mt-1">
                          {activity.status === 'completed' ? (
                            <CheckCircle className="w-3 h-3 text-emerald-400 mr-1" />
                          ) : activity.status === 'urgent' ? (
                            <AlertTriangle className="w-3 h-3 text-red-400 mr-1" />
                          ) : null}
                          <span className={`text-xs ${
                            activity.status === 'completed' ? 'text-emerald-400' :
                            activity.status === 'urgent' ? 'text-red-400' :
                            'text-white/60'
                          }`}>
                            {activity.status}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {!Array.isArray(activities) || activities.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/60">No recent activity</p>
                  <p className="text-white/40 text-sm">Activity will appear here as you manage your properties</p>
                </div>
              ) : null}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
