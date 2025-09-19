'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useState } from 'react'

// Create client directly without using the shared proxy
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function OAuthSimpleTestPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')

  const testGoogleOAuth = async () => {
    setLoading(true)
    setResult('Initiating Google OAuth...')

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      })

      if (error) {
        setResult(`Error: ${error.message}`)
      } else if (data?.url) {
        setResult(`Success! Redirecting to: ${data.url}`)
        // The OAuth flow will redirect automatically
        window.location.href = data.url
      }
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      padding: '40px',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <h1>OAuth Simple Test (Direct Supabase Client)</h1>
      <p>This bypasses the shared package proxy to test OAuth directly.</p>

      <div style={{ margin: '20px 0' }}>
        <h2>OAuth Fix Status:</h2>
        <ul>
          <li>✅ OAuth callback route: /auth/callback</li>
          <li>✅ All login pages updated to use correct callback</li>
          <li>✅ Removed redundant /auth/oauth route</li>
          <li>✅ Using direct Supabase client (no proxy)</li>
        </ul>
      </div>

      <div style={{ margin: '20px 0' }}>
        <button
          onClick={testGoogleOAuth}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4285f4',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1
          }}
        >
          {loading ? 'Loading...' : 'Test Google Sign-In'}
        </button>
      </div>

      {result && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f0f0f0',
          borderRadius: '6px',
          fontFamily: 'monospace',
          fontSize: '14px',
          whiteSpace: 'pre-wrap'
        }}>
          {result}
        </div>
      )}
    </div>
  )
}