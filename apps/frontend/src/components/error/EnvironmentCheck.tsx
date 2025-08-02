import { AlertTriangle } from 'lucide-react'

interface MissingEnvVar {
  name: string
  description: string
  required: boolean
}

export function EnvironmentCheck() {
  // Check for missing required environment variables
  const missingVars: MissingEnvVar[] = []
  
  // Log environment status for debugging
  console.log('Environment Check:', {
    VITE_SUPABASE_URL: !!import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_API_BASE_URL: !!import.meta.env.VITE_API_BASE_URL,
    VITE_STRIPE_PUBLISHABLE_KEY: !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
    NODE_ENV: import.meta.env.MODE
  })

  // Required variables
  if (!import.meta.env.VITE_SUPABASE_URL) {
    missingVars.push({
      name: 'VITE_SUPABASE_URL',
      description: 'Supabase project URL',
      required: true
    })
  }

  if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
    missingVars.push({
      name: 'VITE_SUPABASE_ANON_KEY',
      description: 'Supabase anonymous key',
      required: true
    })
  }

  if (!import.meta.env.VITE_API_BASE_URL) {
    missingVars.push({
      name: 'VITE_API_BASE_URL',
      description: 'Backend API URL',
      required: true
    })
  }

  if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
    missingVars.push({
      name: 'VITE_STRIPE_PUBLISHABLE_KEY',
      description: 'Stripe publishable key',
      required: true
    })
  }

  // If all required variables are present, return null (no error)
  if (missingVars.length === 0) {
    return null
  }

  // Show error page for missing environment variables
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-foreground mb-2">
                Missing Environment Variables
              </h1>
              <p className="text-muted-foreground mb-4">
                The application cannot start because required environment variables are missing.
                Please set the following variables in your Vercel dashboard:
              </p>
              
              <div className="space-y-3">
                {missingVars.map((envVar) => (
                  <div key={envVar.name} className="bg-background rounded-md p-3 border">
                    <code className="text-sm font-mono text-destructive">
                      {envVar.name}
                    </code>
                    <p className="text-sm text-muted-foreground mt-1">
                      {envVar.description}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-muted rounded-md">
                <h2 className="text-sm font-semibold mb-2">How to fix:</h2>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Go to your Vercel dashboard</li>
                  <li>Navigate to Settings → Environment Variables</li>
                  <li>Add the missing variables listed above</li>
                  <li>Redeploy your application</li>
                </ol>
              </div>

              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Development:</strong> Copy <code>.env.example</code> to <code>.env.local</code> and fill in the values.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}