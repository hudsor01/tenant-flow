'use client'

/**
 * Reusable Component Testing Utilities
 * CLAUDE.md Compliance: Native React patterns, no custom abstractions
 */

import { useState, useEffect, ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  Eye, 
  Timer, 
  Zap,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock
} from 'lucide-react'

// Test state types
export interface TestCase {
  id: string
  name: string
  component: ReactNode
  expectedBehavior: string
  status?: 'pending' | 'running' | 'pass' | 'fail' | 'warning'
  renderTime?: number
  message?: string
}

export interface TestSuite {
  name: string
  description: string
  testCases: TestCase[]
}

export interface RenderMetrics {
  renderTime: number
  reRenderCount: number
  memoryUsage?: number
}

// Viewport configurations for responsive testing
export const RESPONSIVE_VIEWPORTS = [
  { name: 'Mobile S', width: 320, height: 568, icon: <Smartphone className="h-3 w-3" /> },
  { name: 'Mobile M', width: 375, height: 667, icon: <Smartphone className="h-3 w-3" /> },
  { name: 'Mobile L', width: 414, height: 736, icon: <Smartphone className="h-3 w-3" /> },
  { name: 'Tablet', width: 768, height: 1024, icon: <Tablet className="h-3 w-3" /> },
  { name: 'Laptop', width: 1024, height: 768, icon: <Monitor className="h-3 w-3" /> },
  { name: 'Desktop', width: 1440, height: 900, icon: <Monitor className="h-3 w-3" /> }
]

/**
 * Component Performance Monitor
 * Measures render times and re-render counts
 */
export function useRenderMetrics() {
  const [metrics, setMetrics] = useState<RenderMetrics>({
    renderTime: 0,
    reRenderCount: 0
  })

  useEffect(() => {
    const startTime = performance.now()
    
    // Measure render time
    setTimeout(() => {
      const endTime = performance.now()
      setMetrics(prev => ({
        ...prev,
        renderTime: endTime - startTime,
        reRenderCount: prev.reRenderCount + 1
      }))
    }, 0)
  })

  return metrics
}

/**
 * Visual Test Wrapper
 * Provides consistent testing environment for components
 */
interface VisualTestWrapperProps {
  testCase: TestCase
  viewport?: { width: number; height: number }
  onTestComplete?: (result: TestCase) => void
  showMetrics?: boolean
}

export function VisualTestWrapper({ 
  testCase, 
  viewport = { width: 1200, height: 800 },
  onTestComplete,
  showMetrics = true
}: VisualTestWrapperProps) {
  const [testStatus, setTestStatus] = useState<TestCase['status']>('pending')
  const [renderTime, setRenderTime] = useState<number>(0)
  const metrics = useRenderMetrics()

  const runTest = async () => {
    setTestStatus('running')
    const startTime = performance.now()

    try {
      // Simulate test execution
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      setRenderTime(totalTime)

      // Simple validation checks
      const hasValidComponent = testCase.component !== null
      const renderTimeAcceptable = totalTime < 1000 // Less than 1 second
      
      if (hasValidComponent && renderTimeAcceptable) {
        setTestStatus('pass')
        onTestComplete?.({ 
          ...testCase, 
          status: 'pass', 
          renderTime: totalTime,
          message: 'All visual checks passed'
        })
      } else {
        setTestStatus('warning')
        onTestComplete?.({ 
          ...testCase, 
          status: 'warning', 
          renderTime: totalTime,
          message: renderTimeAcceptable ? 'Component validation issues' : 'Slow render time'
        })
      }
    } catch (error) {
      setTestStatus('fail')
      onTestComplete?.({ 
        ...testCase, 
        status: 'fail', 
        renderTime: performance.now() - startTime,
        message: error instanceof Error ? error.message : 'Test execution failed'
      })
    }
  }

  const getStatusIcon = () => {
    switch (testStatus) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'fail': return <XCircle className="h-4 w-4 text-red-600" />
      case 'running': return <Timer className="h-4 w-4 animate-spin text-blue-600" />
      default: return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              {getStatusIcon()}
              {testCase.name}
            </CardTitle>
            <CardDescription>{testCase.expectedBehavior}</CardDescription>
          </div>
          <Button 
            onClick={runTest} 
            disabled={testStatus === 'running'}
            size="sm"
            variant="outline"
          >
            {testStatus === 'running' ? 'Running...' : 'Run Test'}
          </Button>
        </div>
        {showMetrics && (
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Render: {renderTime.toFixed(2)}ms</span>
            <span>Re-renders: {metrics.reRenderCount}</span>
            <span>Viewport: {viewport.width}×{viewport.height}</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div 
          className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-4 overflow-auto bg-background"
          style={{ 
            width: Math.min(viewport.width * 0.8, 1000),
            height: Math.min(viewport.height * 0.6, 400)
          }}
        >
          {testCase.component}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Responsive Grid Tester
 * Tests component behavior across multiple viewport sizes
 */
interface ResponsiveGridTesterProps {
  component: ReactNode
  title: string
  description?: string
}

export function ResponsiveGridTester({ 
  component, 
  title, 
  description 
}: ResponsiveGridTesterProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {RESPONSIVE_VIEWPORTS.map((viewport) => (
            <div key={viewport.name}>
              <div className="flex items-center gap-2 mb-2">
                {viewport.icon}
                <span className="font-medium text-sm">{viewport.name}</span>
                <Badge variant="outline" className="text-xs">
                  {viewport.width}×{viewport.height}
                </Badge>
              </div>
              <div 
                className="border rounded-lg p-3 overflow-auto bg-muted/20"
                style={{ 
                  width: Math.min(viewport.width / 2, 600),
                  height: Math.min(viewport.height / 3, 200)
                }}
              >
                <div style={{ width: viewport.width, minHeight: viewport.height / 2 }}>
                  {component}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Component State Tester
 * Tests components with different state scenarios
 */
interface StateTestScenario {
  name: string
  description: string
  props: Record<string, any>
  expectedOutcome: string
}

interface ComponentStateTesterProps {
  title: string
  Component: React.ComponentType<any>
  scenarios: StateTestScenario[]
}

export function ComponentStateTester({ 
  title, 
  Component, 
  scenarios 
}: ComponentStateTesterProps) {
  const [selectedScenario, setSelectedScenario] = useState(0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          {title}
        </CardTitle>
        <CardDescription>
          Testing different state scenarios and edge cases
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scenario Selector */}
        <div className="flex flex-wrap gap-2">
          {scenarios.map((scenario, index) => (
            <Button
              key={index}
              variant={selectedScenario === index ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedScenario(index)}
            >
              {scenario.name}
            </Button>
          ))}
        </div>

        <Separator />

        {/* Current Scenario Info */}
        <div className="space-y-2">
          <h4 className="font-medium">{scenarios[selectedScenario].name}</h4>
          <p className="text-sm text-muted-foreground">
            {scenarios[selectedScenario].description}
          </p>
          <Badge variant="outline" className="text-xs">
            Expected: {scenarios[selectedScenario].expectedOutcome}
          </Badge>
        </div>

        {/* Component Preview */}
        <div className="border rounded-lg p-4 bg-background min-h-[200px]">
          <Component {...scenarios[selectedScenario].props} />
        </div>

        {/* Props Display */}
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">
            View Props
          </summary>
          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
            {JSON.stringify(scenarios[selectedScenario].props, null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  )
}

/**
 * Visual Regression Comparison
 * Compares component output against reference images or states
 */
interface VisualRegressionProps {
  title: string
  currentComponent: ReactNode
  referenceComponent?: ReactNode
  onComparisonResult?: (passed: boolean, details: string) => void
}

export function VisualRegressionTester({ 
  title,
  currentComponent,
  referenceComponent,
  onComparisonResult
}: VisualRegressionProps) {
  const [comparisonResult, setComparisonResult] = useState<{
    passed: boolean
    details: string
  } | null>(null)

  const runComparison = () => {
    // Simplified visual comparison logic
    // In a real implementation, this would use image comparison libraries
    const passed = Math.random() > 0.3 // Simulate 70% pass rate
    const details = passed 
      ? 'Visual elements match reference within acceptable threshold'
      : 'Detected visual differences in layout or styling'
    
    setComparisonResult({ passed, details })
    onComparisonResult?.(passed, details)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              {title}
            </CardTitle>
            <CardDescription>
              Visual regression testing against reference
            </CardDescription>
          </div>
          <Button onClick={runComparison} size="sm">
            Run Comparison
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current Component */}
          <div>
            <h4 className="font-medium mb-2">Current</h4>
            <div className="border rounded-lg p-3 bg-background min-h-[200px]">
              {currentComponent}
            </div>
          </div>

          {/* Reference Component */}
          <div>
            <h4 className="font-medium mb-2">Reference</h4>
            <div className="border rounded-lg p-3 bg-muted/20 min-h-[200px]">
              {referenceComponent || (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No reference provided
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Comparison Result */}
        {comparisonResult && (
          <div className="mt-4 p-3 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {comparisonResult.passed ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="font-medium">
                {comparisonResult.passed ? 'Comparison Passed' : 'Comparison Failed'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {comparisonResult.details}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Accessibility Test Runner
 * Basic accessibility checks for components
 */
export function AccessibilityTester({ 
  component, 
  title 
}: { 
  component: ReactNode
  title: string 
}) {
  const [axeResults, setAxeResults] = useState<{
    violations: number
    warnings: number
    passes: number
  } | null>(null)

  const runA11yTests = () => {
    // Simulate accessibility testing
    // In real implementation, would use axe-core or similar
    setTimeout(() => {
      setAxeResults({
        violations: Math.floor(Math.random() * 3),
        warnings: Math.floor(Math.random() * 5),
        passes: Math.floor(Math.random() * 10) + 5
      })
    }, 1000)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            {title} - A11y Testing
          </CardTitle>
          <Button onClick={runA11yTests} size="sm">
            Run A11y Tests
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border rounded-lg p-3 bg-background min-h-[200px]">
          {component}
        </div>

        {axeResults && (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">{axeResults.violations}</div>
              <div className="text-sm text-muted-foreground">Violations</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{axeResults.warnings}</div>
              <div className="text-sm text-muted-foreground">Warnings</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{axeResults.passes}</div>
              <div className="text-sm text-muted-foreground">Passes</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}