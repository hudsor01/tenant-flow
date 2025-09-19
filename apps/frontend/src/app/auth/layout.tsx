export default function AuthLayout({
	children
}: {
	children: React.ReactNode
}) {
	return (
		<div className="light min-h-screen">
			{children}
		</div>
	)
}