'use client'

import { supabaseClient } from '@repo/shared'
import { useState } from 'react'

export default function TestOAuthPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')

  const testGoogleOAuth = async () => {
    setLoading(true)
    setResult('Initiating Google OAuth...')

    try {
      const { data, error } = await supabaseClient.auth.signInWithOAuth({
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
      }
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const testCallbackRoute = async () => {
    setResult('Testing callback route...')
    try {
      const response = await fetch('/auth/callback', {
        method: 'HEAD'
      })
      setResult(`Callback route status: ${response.status} ${response.statusText}`)
    } catch (error) {
      setResult(`Error testing callback: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div style={{
      padding: '40px',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <h1>OAuth Test Page</h1>
      <p>This page tests the OAuth configuration after fixing the redirect loop.</p>

      <div style={{ margin: '20px 0' }}>
        <h2>OAuth Configuration:</h2>
        <ul>
          <li>✅ OAuth callback route: /auth/callback</li>
          <li>✅ Redirect after auth: /dashboard</li>
          <li>✅ Using standard Supabase callback handler</li>
        </ul>
      </div>

      <div style={{ margin: '20px 0' }}>
        <button
          onClick={testCallbackRoute}
          disabled={loading}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: '#000',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1
          }}
        >
          Test Callback Route
        </button>

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