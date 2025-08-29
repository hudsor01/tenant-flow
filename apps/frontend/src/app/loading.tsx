export default function Loading() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-1">
			<div className="space-y-4 text-center">
				<div className="animate-spin h-8 w-8 mx-auto border-2 border-blue-6 border-t-transparent rounded-full" />
				<p className="text-sm text-gray-6">Loading...</p>
			</div>
		</div>
	)
}