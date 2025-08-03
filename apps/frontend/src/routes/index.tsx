import { createFileRoute } from '@tanstack/react-router'
import LandingPage from '@/pages/LandingPage'

export const Route = createFileRoute('/')({
	component: () => {
		console.warn('[Index Route] Rendering landing page directly without layout')
		
		return <LandingPage />
	}
})
