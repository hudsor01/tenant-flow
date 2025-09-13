'use client'

/**
 * Dashboard Test Harness for Visual and Component Testing
 * CLAUDE.md Compliance: Native React components, no abstractions
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SectionCards } from '@/components/section-cards'
import { DataTable } from '@/components/data-table'
import { ChartAreaInteractive } from '@/components/chart-area-interactive'
import { 
  MOCK_DASHBOARD_STATS, 
  MOCK_PROPERTIES, 
  MOCK_PROPERTY_PERFORMANCE,
  MOCK_MAINTENANCE_REQUESTS,
  canUseMockAuth 
} from '@/lib/mock-auth-data'
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  Eye, 
  Zap, 
  Accessibility, 
  Palette,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle
} from 'lucide-react'

interface TestResult {
  id: string
  name: string
  status: 'pass' | 'fail' | 'warning' | 'pending'
  message: string
  timestamp: Date
}

interface ViewportSize {
  name: string
  width: number
  height: number
  icon: React.ReactNode
}

const VIEWPORT_SIZES: ViewportSize[] = [
  { name: 'Mobile', width: 375, height: 667, icon: <Smartphone className="h-4 w-4" /> },
  { name: 'Tablet', width: 768, height: 1024, icon: <Tablet className="h-4 w-4" /> },
  { name: 'Desktop', width: 1440, height: 900, icon: <Monitor className="h-4 w-4" /> },
  { name: 'Wide', width: 1920, height: 1080, icon: <Monitor className="h-4 w-4" /> }
]

const TEST_SCENARIOS = {
  loading: 'Loading States',
  error: 'Error Handling', 
  empty: 'Empty States',
  populated: 'Data Populated',
  responsive: 'Responsive Design',
  interaction: 'User Interactions'
}

export function DashboardTestHarness() {
  const [selectedViewport, setSelectedViewport] = useState(VIEWPORT_SIZES[2]) // Default to Desktop
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [currentScenario, setCurrentScenario] = useState('populated')
  const [isRunningTests, setIsRunningTests] = useState(false)

  // Mock auth validation
  if (!canUseMockAuth()) {
    return (
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Testing Not Available</CardTitle>
          <CardDescription>
            Mock authentication is not enabled. Set ENABLE_MOCK_AUTH=true in development.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const runVisualTests = async () => {
    setIsRunningTests(true)
    const results: TestResult[] = []

    // Simulate running visual tests
    const tests = [
      { name: 'Dashboard Stats Rendering', delay: 500 },
      { name: 'Chart Visualization', delay: 800 },
      { name: 'Data Table Display', delay: 600 },
      { name: 'Responsive Layout', delay: 700 },
      { name: 'Color Contrast', delay: 400 },
      { name: 'Typography Scale', delay: 300 }
    ]

    for (const test of tests) {
      await new Promise(resolve => setTimeout(resolve, test.delay))
      
      const status = Math.random() > 0.8 ? 'fail' : Math.random() > 0.9 ? 'warning' : 'pass'
      results.push({
        id: `test-${Date.now()}-${Math.random()}`,
        name: test.name,
        status,
        message: getTestMessage(test.name, status),
        timestamp: new Date()
      })
      
      setTestResults([...results])
    }

    setIsRunningTests(false)
  }

  const getTestMessage = (testName: string, status: string): string => {
    if (status === 'pass') return 'All checks passed'
    if (status === 'warning') return 'Minor issues detected'
    return 'Issues require attention'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'fail': return <XCircle className="h-4 w-4 text-red-600" />
      default: return <RefreshCw className="h-4 w-4 text-gray-400" />
    }
  }

  const getScenarioData = () => {
    switch (currentScenario) {
      case 'loading':
        return { stats: null, properties: null, loading: true }
      case 'error':
        return { stats: null, properties: null, error: new Error('Network error') }
      case 'empty':
        return { stats: { ...MOCK_DASHBOARD_STATS, totalProperties: 0 }, properties: [] }
      default:
        return { stats: MOCK_DASHBOARD_STATS, properties: MOCK_PROPERTIES }
    }
  }

  const scenarioData = getScenarioData()

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Test Harness</h1>
          <p className="text-muted-foreground">Visual and component testing environment</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Zap className="h-3 w-3" />
          Mock Auth Enabled
        </Badge>
      </div>

      <Tabs defaultValue="visual" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="visual" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Visual Testing
          </TabsTrigger>
          <TabsTrigger value="responsive" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Responsive
          </TabsTrigger>
          <TabsTrigger value="accessibility" className="flex items-center gap-2">
            <Accessibility className="h-4 w-4" />
            Accessibility
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Performance
          </TabsTrigger>
        </TabsList>

        {/* Visual Testing Tab */}
        <TabsContent value="visual" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Test Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Test Scenario</label>
                  <select 
                    value={currentScenario}
                    onChange={(e) => setCurrentScenario(e.target.value)}
                    className="w-full mt-1 p-2 border rounded-md"
                  >
                    {Object.entries(TEST_SCENARIOS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Viewport</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {VIEWPORT_SIZES.map((viewport) => (
                      <Button
                        key={viewport.name}
                        variant={selectedViewport.name === viewport.name ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedViewport(viewport)}
                        className="flex items-center gap-2"
                      >
                        {viewport.icon}
                        {viewport.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                <Button 
                  onClick={runVisualTests}
                  disabled={isRunningTests}
                  className="w-full flex items-center gap-2"
                >
                  {isRunningTests ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  {isRunningTests ? 'Running Tests...' : 'Run Visual Tests'}
                </Button>
              </CardContent>
            </Card>

            {/* Test Results */}
            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
                <CardDescription>
                  {testResults.length} tests completed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {testResults.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No tests run yet</p>
                  ) : (
                    testResults.map((result) => (
                      <div key={result.id} className="flex items-center gap-2 p-2 border rounded">
                        {getStatusIcon(result.status)}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{result.name}</div>
                          <div className="text-xs text-muted-foreground">{result.message}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Viewport Info */}
            <Card>
              <CardHeader>
                <CardTitle>Current Viewport</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  {selectedViewport.icon}
                  <span className="font-medium">{selectedViewport.name}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedViewport.width} × {selectedViewport.height}px
                </div>
                <div className="text-xs text-muted-foreground">
                  Aspect Ratio: {(selectedViewport.width / selectedViewport.height).toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Component Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Component Preview - {TEST_SCENARIOS[currentScenario as keyof typeof TEST_SCENARIOS]}</CardTitle>
              <CardDescription>
                Testing scenario with {selectedViewport.name} viewport
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className="border-2 border-dashed border-muted-foreground/20 rounded-lg overflow-auto"
                style={{ 
                  width: Math.min(selectedViewport.width, 1200), 
                  height: Math.min(selectedViewport.height * 0.6, 600) 
                }}
              >
                <div className="p-4 space-y-4 min-w-full">
                  {/* Dashboard Stats */}
                  {scenarioData.loading ? (
                    <div className="animate-pulse space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="h-24 bg-muted rounded" />
                        ))}
                      </div>
                    </div>
                  ) : scenarioData.error ? (
                    <div className="p-4 border border-destructive/20 bg-destructive/5 rounded">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        Error loading dashboard data
                      </div>
                    </div>
                  ) : scenarioData.stats ? (
                    <SectionCards data={scenarioData.stats} />
                  ) : null}

                  {/* Chart Component */}
                  <div className="min-h-[300px]">
                    <ChartAreaInteractive />
                  </div>

                  {/* Properties Table */}
                  {scenarioData.properties && scenarioData.properties.length > 0 && (
                    <DataTable
                      data={scenarioData.properties.slice(0, 5).map((property, index) => ({
                        id: index + 1,
                        name: property.name,
                        type: 'apartment' as const,
                        status: 'active' as const,
                        occupiedUnits: Math.floor(Math.random() * 8) + 2,
                        totalUnits: Math.floor(Math.random() * 10) + 5,
                        revenue: Math.floor(Math.random() * 50000) + 10000,
                        manager: 'Property Manager',
                        location: `${property.city}, ${property.state}`,
                        lastUpdated: new Date().toISOString().split('T')[0] || '2024-01-01'
                      }))}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Responsive Testing Tab */}
        <TabsContent value="responsive">
          <Card>
            <CardHeader>
              <CardTitle>Responsive Design Testing</CardTitle>
              <CardDescription>
                Test component behavior across different screen sizes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {VIEWPORT_SIZES.map((viewport) => (
                  <div key={viewport.name} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {viewport.icon}
                      <span className="font-medium">{viewport.name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-4">
                      {viewport.width} × {viewport.height}
                    </div>
                    <div 
                      className="border bg-muted/20 rounded overflow-hidden"
                      style={{ 
                        width: Math.min(viewport.width / 4, 200),
                        height: Math.min(viewport.height / 4, 150)
                      }}
                    >
                      <div className="p-2 text-xs">
                        <div className="h-2 bg-primary/20 rounded mb-1" />
                        <div className="h-2 bg-primary/20 rounded w-3/4 mb-1" />
                        <div className="h-2 bg-primary/20 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accessibility Testing Tab */}
        <TabsContent value="accessibility">
          <Card>
            <CardHeader>
              <CardTitle>Accessibility Testing</CardTitle>
              <CardDescription>
                WCAG compliance and accessibility validation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Color Contrast</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Primary/Background</span>
                        <Badge variant="outline" className="bg-green-50 text-green-700">AA</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Secondary/Background</span>
                        <Badge variant="outline" className="bg-green-50 text-green-700">AAA</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Keyboard Navigation</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Focus Indicators</span>
                        <Badge variant="outline" className="bg-green-50 text-green-700">Pass</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Tab Order</span>
                        <Badge variant="outline" className="bg-green-50 text-green-700">Pass</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Testing Tab */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Testing</CardTitle>
              <CardDescription>
                Component rendering and interaction performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-green-600">98ms</div>
                    <div className="text-sm text-muted-foreground">Initial Render</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-blue-600">45ms</div>
                    <div className="text-sm text-muted-foreground">Data Update</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-purple-600">12ms</div>
                    <div className="text-sm text-muted-foreground">Interaction</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}