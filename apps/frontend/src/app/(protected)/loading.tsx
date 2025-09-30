import { PageLoadingState } from '@/components/ui/loading-state'

export default function ProtectedLoading() {
	return <PageLoadingState text="Authenticating..." />
}
