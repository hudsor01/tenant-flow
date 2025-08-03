import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/test')({
    component: () => {
        return (
            <div style={{ padding: '50px', textAlign: 'center' }}>
                <h1>Test Page - App is Working!</h1>
                <p>If you can see this, the React app is running.</p>
                <a href="/">Go to Home</a>
            </div>
        )
    }
})