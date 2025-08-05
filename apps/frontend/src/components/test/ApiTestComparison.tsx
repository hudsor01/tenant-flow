/**
 * API Test Comparison Component
 * Used to test and compare direct API calls vs React Query hooks
 * Helpful for debugging authentication and API connectivity issues
 */

import { useState } from 'react'
import { useMe } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api/axios-client'
import type { AuthUser } from '@repo/shared'

export function ApiTestComparison() {
  const [apiResult, setApiResult] = useState<AuthUser | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  
  // Current API Query
  const { data: currentUser, error: currentError } = useMe()
  
  const testApiDirectly = async () => {
    try {
      setApiError(null)
      // Test using axios client directly
      const result = await api.auth.me()
      setApiResult(result.data)
      console.warn('API direct result:', result.data)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setApiError(errorMessage)
      console.error('API direct error:', error)
    }
  }
  
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">API Test (NestJS + Axios)</h1>
      
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Current API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold">Query Result:</h3>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                {currentUser ? JSON.stringify(currentUser, null, 2) : 'No data'}
              </pre>
              {currentError && (
                <p className="text-red-500 mt-2">Error: {currentError.message}</p>
              )}
            </div>
            
            <Button 
              onClick={() => void testApiDirectly()}
              variant="outline"
            >
              Test Direct Axios Call
            </Button>
            
            {apiResult !== null && (
              <div>
                <h3 className="font-semibold">Direct Call Result:</h3>
                <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                  {JSON.stringify(apiResult, null, 2)}
                </pre>
              </div>
            )}
            
            {apiError && (
              <p className="text-red-500">Direct Call Error: {apiError}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}