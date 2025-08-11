import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  BarChart3, 
  Download,
  TrendingUp,
  DollarSign,
  FileText,
  Users,
  Building
} from 'lucide-react'

export const metadata = {
  title: 'Reports | TenantFlow',
  description: 'Analytics and reports for your property portfolio',
}

function ReportsHeader() {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
        Reports
      </h1>
      <p className="text-muted-foreground">
        Analytics and insights for your property portfolio
      </p>
    </div>
  )
}

function ReportsGrid() {
  const reports = [
    {
      title: 'Financial Summary',
      description: 'Revenue, expenses, and profit analysis',
      icon: DollarSign,
      period: 'Monthly',
      lastGenerated: '2 hours ago',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Occupancy Report',
      description: 'Occupancy rates and vacancy analysis',
      icon: Building,
      period: 'Weekly',
      lastGenerated: '1 day ago',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Tenant Activity',
      description: 'Tenant communications and interactions',
      icon: Users,
      period: 'Daily',
      lastGenerated: '4 hours ago',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Maintenance Report',
      description: 'Maintenance costs and completion rates',
      icon: BarChart3,
      period: 'Monthly',
      lastGenerated: '6 hours ago',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ]
  
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {reports.map((report) => {
        const Icon = report.icon
        return (
          <Card key={report.title} className="transition-all hover:shadow-lg hover:scale-[1.02]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-lg ${report.bgColor}`}>
                  <Icon className={`h-6 w-6 ${report.color}`} />
                </div>
                <Badge variant="secondary">{report.period}</Badge>
              </div>
              <CardTitle className="text-lg">{report.title}</CardTitle>
              <CardDescription>{report.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Last generated: {report.lastGenerated}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function QuickStats() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Quick Stats
        </CardTitle>
        <CardDescription>
          Key metrics for this month
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">$12,450</div>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">94%</div>
            <p className="text-sm text-muted-foreground">Occupancy Rate</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">28</div>
            <p className="text-sm text-muted-foreground">Active Tenants</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">$2,100</div>
            <p className="text-sm text-muted-foreground">Maintenance Costs</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function RecentReports() {
  const recentReports = [
    {
      name: 'December Financial Summary',
      type: 'Financial',
      date: '2024-01-05',
      size: '2.4 MB'
    },
    {
      name: 'Q4 Occupancy Analysis',
      type: 'Occupancy',
      date: '2024-01-02',
      size: '1.8 MB'
    },
    {
      name: 'Year-End Tax Report',
      type: 'Tax',
      date: '2023-12-31',
      size: '3.1 MB'
    }
  ]
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>Previously generated reports</CardDescription>
          </div>
          <Button size="sm" variant="outline">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentReports.map((report, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium">{report.name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="secondary" className="text-xs">
                      {report.type}
                    </Badge>
                    <span>•</span>
                    <span>{report.date}</span>
                    <span>•</span>
                    <span>{report.size}</span>
                  </div>
                </div>
              </div>
              <Button size="sm" variant="ghost">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function ReportsPage() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
      <ReportsHeader />
      
      <Suspense fallback={<Skeleton className="h-32 w-full" />}>
        <QuickStats />
      </Suspense>
      
      <Suspense fallback={<div className="grid gap-6 md:grid-cols-2">{[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-48 w-full" />
      ))}</div>}>
        <ReportsGrid />
      </Suspense>
      
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <RecentReports />
      </Suspense>
    </div>
  )
}