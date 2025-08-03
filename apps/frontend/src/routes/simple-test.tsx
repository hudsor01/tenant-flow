import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/simple-test')({
  component: () => {
    console.log('Simple test route rendered')
    return (
      <div style={{ padding: '50px', textAlign: 'center', background: 'white', minHeight: '100vh' }}>
        <h1>Simple Test Page</h1>
        <p>If you see this, routing is working!</p>
        <a href="/">Go to Home</a>
      </div>
    )
  }
})