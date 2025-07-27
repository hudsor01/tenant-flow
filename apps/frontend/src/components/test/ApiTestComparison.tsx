import { useState } from 'react'
import { useMe } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ApiTestComparison() {
  const [honoDirectResult, setHonoDirectResult] = useState<unknown>(null)
  const [honoDirectError, setHonoDirectError] = useState<string | null>(null)
  
  // Hono Query
  const { data: honoUser, error: honoError } = useMe()
  
  const testHonoDirectly = async () => {
    try {
      setHonoDirectError(null)
      const result = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/hono/api/v1/auth/me`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      const data = await result.json()
      setHonoDirectResult(data)
      console.log('Hono direct result:', data)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setHonoDirectError(errorMessage)
      console.error('Hono direct error:', error)
    }
  }
  
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">API Test Comparison (Hono Only)</h1>
      
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Hono API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold">Query Result:</h3>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                {honoUser ? JSON.stringify(honoUser, null, 2) : 'No data'}
              </pre>
              {honoError && (
                <p className="text-red-500 mt-2">Error: {honoError.message}</p>
              )}
            </div>
            
            <div>
              <Button onClick={testHonoDirectly}>Test Direct Fetch</Button>
              {honoDirectResult != null && (
                <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto mt-2">
                  {JSON.stringify(honoDirectResult, null, 2)}
                </pre>
              )}
              {honoDirectError && (
                <p className="text-red-500 mt-2">Error: {honoDirectError}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}