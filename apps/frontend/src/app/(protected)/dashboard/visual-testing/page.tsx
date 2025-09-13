'use client'

/**
 * Visual Testing Dashboard Page (Protected Route)
 * CLAUDE.md Compliance: Native Next.js page, no abstractions
 */

import { DashboardTestHarness } from '@/components/testing/dashboard-test-harness'
import { 
  VisualTestWrapper,
  ResponsiveGridTester,
  ComponentStateTester,
  VisualRegressionTester,
  AccessibilityTester,
  type TestCase 
} from '@/components/testing/component-test-utils'
import { SectionCards } from '@/components/section-cards'
import { DataTable } from '@/components/data-table'
import { ChartAreaInteractive } from '@/components/chart-area-interactive'
import { MOCK_DASHBOARD_STATS, MOCK_PROPERTIES } from '@/lib/mock-auth-data'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useState } from 'react'
import { TestTube, Monitor, Layers, Zap, Eye, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function VisualTestingPage() {
  const [testResults, setTestResults] = useState<TestCase[]>([])

  // Test cases for individual components
  const componentTestCases: TestCase[] = [
    {
      id: 'section-cards-test',
      name: 'Dashboard Statistics Cards',
      component: <SectionCards data={MOCK_DASHBOARD_STATS} />,
      expectedBehavior: 'Should display 4 cards with property statistics in a responsive grid'
    },
    {
      id: 'chart-test', 
      name: 'Interactive Area Chart',
      component: <ChartAreaInteractive />,
      expectedBehavior: 'Should render interactive chart with sample data'
    },
    {
      id: 'data-table-test',
      name: 'Properties Data Table',
      component: (
        <DataTable
          data={MOCK_PROPERTIES.slice(0, 3).map((property, index) => ({
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
      ),
      expectedBehavior: 'Should display sortable table with property data and proper column alignment'
    }
  ]

  // State scenarios for SectionCards testing
  const sectionCardsScenarios = [
    {
      name: 'Normal Data',
      description: 'Standard dashboard with realistic metrics',
      props: { data: MOCK_DASHBOARD_STATS },
      expectedOutcome: 'Four cards displaying property statistics'
    },
    {
      name: 'Zero State',
      description: 'Empty dashboard with no properties',
      props: { 
        data: { 
          ...MOCK_DASHBOARD_STATS, 
          totalProperties: 0,
          totalUnits: 0,
          occupiedUnits: 0,
          totalTenants: 0
        }
      },
      expectedOutcome: 'Cards showing zero values gracefully'
    },
    {
      name: 'High Numbers',
      description: 'Large portfolio with high metrics',
      props: {
        data: {
          ...MOCK_DASHBOARD_STATS,
          totalProperties: 1250,
          totalUnits: 45780,
          occupiedUnits: 43250,
          totalTenants: 41890
        }
      },
      expectedOutcome: 'Cards properly format large numbers'
    },
    {
      name: 'Loading State',
      description: 'Cards in loading state',
      props: { data: null },
      expectedOutcome: 'Loading indicators or skeleton states'
    }
  ]

  const handleTestComplete = (result: TestCase) => {
    setTestResults(prev => {
      const filtered = prev.filter(r => r.id !== result.id)
      return [...filtered, result]
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Visual Testing Suite</h1>
                <p className="text-muted-foreground">
                  Comprehensive testing environment for dashboard components
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <TestTube className="h-3 w-3" />
                {testResults.length} Tests Run
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Mock Data Active
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        <Tabs defaultValue="harness" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="harness" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Full Harness
            </TabsTrigger>
            <TabsTrigger value="components" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Components
            </TabsTrigger>
            <TabsTrigger value="responsive" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Responsive
            </TabsTrigger>
            <TabsTrigger value="states" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              State Testing
            </TabsTrigger>
            <TabsTrigger value="regression" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Visual Regression
            </TabsTrigger>
          </TabsList>

          {/* Full Dashboard Test Harness */}
          <TabsContent value="harness">
            <DashboardTestHarness />
          </TabsContent>

          {/* Individual Component Tests */}
          <TabsContent value="components" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Component Test Results</CardTitle>
                <CardDescription>
                  Individual component testing with performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {testResults.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {testResults.map((result) => (
                      <div key={result.id} className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          {result.status === 'pass' && <Badge className="bg-green-100 text-green-800">Pass</Badge>}
                          {result.status === 'warning' && <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>}
                          {result.status === 'fail' && <Badge className="bg-red-100 text-red-800">Fail</Badge>}
                          <span className="text-sm font-medium">{result.name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {result.renderTime && `${result.renderTime.toFixed(2)}ms render time`}
                        </div>
                        {result.message && (
                          <div className="text-xs mt-1">{result.message}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No test results yet. Run component tests below.
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              {componentTestCases.map((testCase) => (
                <VisualTestWrapper
                  key={testCase.id}
                  testCase={testCase}
                  onTestComplete={handleTestComplete}
                  showMetrics={true}
                />
              ))}
            </div>
          </TabsContent>

          {/* Responsive Design Tests */}
          <TabsContent value="responsive" className="space-y-6">
            <ResponsiveGridTester
              component={<SectionCards data={MOCK_DASHBOARD_STATS} />}
              title="Dashboard Statistics Responsive Test"
              description="Testing how statistics cards adapt to different screen sizes"
            />
            
            <ResponsiveGridTester
              component={<ChartAreaInteractive />}
              title="Chart Component Responsive Test"
              description="Testing chart responsiveness and mobile optimization"
            />
          </TabsContent>

          {/* Component State Testing */}
          <TabsContent value="states" className="space-y-6">
            <ComponentStateTester
              title="Dashboard Statistics Cards"
              Component={SectionCards}
              scenarios={sectionCardsScenarios}
            />

            <Card>
              <CardHeader>
                <CardTitle>Error State Testing</CardTitle>
                <CardDescription>
                  Testing how components handle error conditions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border-2 border-dashed border-red-200 rounded-lg">
                    <div className="text-red-600 font-medium">Network Error Simulation</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Component should display error boundary with retry options
                    </div>
                  </div>
                  
                  <div className="p-4 border-2 border-dashed border-yellow-200 rounded-lg">
                    <div className="text-yellow-600 font-medium">Slow Loading Simulation</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Component should show loading indicators after 200ms
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Visual Regression Testing */}
          <TabsContent value="regression" className="space-y-6">
            <VisualRegressionTester
              title="Dashboard Statistics Layout"
              currentComponent={<SectionCards data={MOCK_DASHBOARD_STATS} />}
              referenceComponent={
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg bg-muted/20">
                      <div className="text-2xl font-bold mb-1">###</div>
                      <div className="text-sm text-muted-foreground">Reference Card {i + 1}</div>
                    </div>
                  ))}
                </div>
              }
            />

            <AccessibilityTester
              component={<SectionCards data={MOCK_DASHBOARD_STATS} />}
              title="Dashboard Statistics"
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}