'use client'

export const dynamic = 'force-dynamic'

interface GlobalErrorProps {
	error: Error & { digest?: string }
	reset: () => void
}

export default function GlobalError({ error: _error, reset }: GlobalErrorProps) {
	return (
		<html lang="en">
			<body>
				<div style={{
					minHeight: '100vh',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					gap: '1rem',
					fontFamily: 'system-ui, sans-serif',
					padding: '2rem',
					backgroundColor: 'var(--color-background)',
					color: 'var(--color-foreground)'
				}}>
					<h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
						Something went wrong!
					</h2>
					<button
						onClick={() => reset()}
						style={{
							padding: '0.75rem 1.5rem',
							color: 'white',
							backgroundColor: 'var(--color-primary)',
							border: 'none',
							borderRadius: '0.5rem',
							fontSize: '1rem',
							cursor: 'pointer'
						}}
					>
						Try again
					</button>
				</div>
			</body>
		</html>
	)
}
