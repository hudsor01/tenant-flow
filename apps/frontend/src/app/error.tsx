'use client'

export default function Error({
	error,
	reset
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	return (
		<div style={{
			minHeight: '100vh',
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
			justifyContent: 'center',
			gap: '1rem',
			fontFamily: 'system-ui',
			padding: '2rem'
		}}>
			<h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
				Something went wrong!
			</h2>
			<button
				onClick={() => reset()}
				style={{
					padding: '0.75rem 1.5rem',
					backgroundColor: '#0066cc',
					color: 'white',
					border: 'none',
					borderRadius: '0.5rem',
					fontSize: '1rem',
					cursor: 'pointer'
				}}
			>
				Try again
			</button>
		</div>
	)
}
