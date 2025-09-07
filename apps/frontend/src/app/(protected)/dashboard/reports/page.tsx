"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FileText,
  Download,
  Calendar,
  Filter,
  Search,
  Clock,
  TrendingUp,
  DollarSign,
  Building,
  Users,
  FileSpreadsheet,
  Printer,
  Mail,
  Plus
} from "lucide-react"

const availableReports = [
  {
    title: "Monthly Financial Summary",
    description: "Comprehensive revenue, expenses, and profit analysis",
    category: "Financial",
    lastGenerated: "2024-01-15",
    frequency: "Monthly",
    format: "PDF",
    icon: DollarSign,
    color: "var(--chart-1)"
  },
  {
    title: "Occupancy Rate Analysis",
    description: "Detailed breakdown of unit occupancy across properties",
    category: "Operations",
    lastGenerated: "2024-01-14",
    frequency: "Weekly",
    format: "Excel",
    icon: Users,
    color: "var(--chart-2)"
  },
  {
    title: "Property Performance Report",
    description: "Individual property metrics and comparative analysis",
    category: "Performance",
    lastGenerated: "2024-01-13",
    frequency: "Monthly",
    format: "PDF",
    icon: Building,
    color: "var(--chart-3)"
  },
  {
    title: "Lease Expiration Forecast",
    description: "Upcoming lease renewals and vacancy predictions",
    category: "Planning",
    lastGenerated: "2024-01-12",
    frequency: "Quarterly",
    format: "Excel",
    icon: Calendar,
    color: "var(--chart-4)"
  },
  {
    title: "Maintenance Cost Analysis",
    description: "Breakdown of maintenance expenses by category and property",
    category: "Operations",
    lastGenerated: "2024-01-10",
    frequency: "Monthly",
    format: "PDF",
    icon: FileText,
    color: "var(--chart-5)"
  },
  {
    title: "Tenant Satisfaction Survey",
    description: "Compiled feedback and satisfaction metrics from tenants",
    category: "Quality",
    lastGenerated: "2024-01-08",
    frequency: "Quarterly",
    format: "PDF",
    icon: TrendingUp,
    color: "var(--chart-1)"
  }
]

const recentReports = [
  { name: "January Financial Summary", date: "2024-01-15", size: "2.4 MB", status: "Ready" },
  { name: "Q4 2023 Portfolio Review", date: "2024-01-10", size: "5.1 MB", status: "Ready" },
  { name: "December Occupancy Report", date: "2024-01-05", size: "1.8 MB", status: "Ready" },
  { name: "Year-End Tax Summary", date: "2023-12-31", size: "3.2 MB", status: "Ready" }
]

export default function ReportsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient-dominance">
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate, schedule, and manage comprehensive business reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="size-4 mr-2" />
            Filter
          </Button>
          <Button size="sm">
            <Plus className="size-4 mr-2" />
            New Report
          </Button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {/* Total Reports */}
        <Card className="p-6 border shadow-sm" style={{ borderLeftColor: 'var(--chart-1)', borderLeftWidth: '4px' }}>
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'color-mix(in oklab, var(--chart-1) 15%, transparent)' }}
            >
              <FileText className="size-5" />
            </div>
            <h3 className="font-semibold">Total Reports</h3>
          </div>
          <div className="text-3xl font-bold mb-1">248</div>
          <p className="text-muted-foreground text-sm">Generated this year</p>
        </Card>

        {/* Scheduled Reports */}
        <Card className="p-6 border shadow-sm" style={{ borderLeftColor: 'var(--chart-2)', borderLeftWidth: '4px' }}>
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'color-mix(in oklab, var(--chart-2) 15%, transparent)' }}
            >
              <Clock className="size-5" />
            </div>
            <h3 className="font-semibold">Scheduled</h3>
          </div>
          <div className="text-3xl font-bold mb-1">12</div>
          <p className="text-muted-foreground text-sm">Automatic reports active</p>
        </Card>

        {/* Recent Downloads */}
        <Card className="p-6 border shadow-sm" style={{ borderLeftColor: 'var(--chart-3)', borderLeftWidth: '4px' }}>
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'color-mix(in oklab, var(--chart-3) 15%, transparent)' }}
            >
              <Download className="size-5" />
            </div>
            <h3 className="font-semibold">Downloads</h3>
          </div>
          <div className="text-3xl font-bold mb-1">89</div>
          <p className="text-muted-foreground text-sm">Past 30 days</p>
        </Card>

        {/* Pending Reports */}
        <Card className="p-6 border shadow-sm" style={{ borderLeftColor: 'var(--chart-4)', borderLeftWidth: '4px' }}>
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'color-mix(in oklab, var(--chart-4) 15%, transparent)' }}
            >
              <Clock className="size-5" />
            </div>
            <h3 className="font-semibold">Pending</h3>
          </div>
          <div className="text-3xl font-bold mb-1">3</div>
          <p className="text-muted-foreground text-sm">Currently processing</p>
        </Card>
      </div>

      {/* Report Categories & Search */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
            <Input 
              placeholder="Search reports..." 
              className="pl-10 w-72"
            />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="financial">Financial</SelectItem>
              <SelectItem value="operations">Operations</SelectItem>
              <SelectItem value="performance">Performance</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="quality">Quality</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="all">
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Frequencies</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Available Reports Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Available Reports</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {availableReports.map((report, index) => (
            <Card key={index} className="p-6 border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-4">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `color-mix(in oklab, ${report.color} 15%, transparent)` }}
                >
                  <report.icon className="size-6" style={{ color: report.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm leading-tight">{report.title}</h3>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {report.category}
                  </Badge>
                </div>
              </div>
              <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                {report.description}
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Generated:</span>
                  <span>{report.lastGenerated}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Frequency:</span>
                  <span>{report.frequency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Format:</span>
                  <span>{report.format}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" className="flex-1">
                  <Download className="size-4 mr-2" />
                  Generate
                </Button>
                <Button variant="outline" size="sm">
                  <Printer className="size-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Mail className="size-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Reports Table */}
      <Card className="border shadow-sm">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Recent Reports</h2>
              <p className="text-muted-foreground text-sm">Recently generated and downloaded reports</p>
            </div>
            <Button variant="outline" size="sm">
              <FileSpreadsheet className="size-4 mr-2" />
              View All
            </Button>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {recentReports.map((report, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center bg-background border"
                  >
                    <FileText className="size-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{report.name}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{report.date}</span>
                      <span>{report.size}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">
                    {report.status}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    <Download className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}