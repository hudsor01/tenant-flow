import { PageLoader } from '@/components/magicui/loading-spinner'

// Protected Routes Loading State
// Shows while authenticating and loading protected content
export default function ProtectedLoading() {
	return <PageLoader text="Authenticating..." />
}
