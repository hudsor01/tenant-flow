import { Spinner } from '#components/ui/spinner'

export default function ProtectedLoading() {
	return (
		<div className="flex items-center justify-center h-full w-full">
			<Spinner />
			<span className="ml-2">Authenticating...</span>
		</div>
	)
}
