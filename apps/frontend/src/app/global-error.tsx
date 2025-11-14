'use client'

export default function GlobalError() {
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
					padding: '2rem'
				}}>
					<h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
						Something went wrong!
					</h2>
					<button
						onClick={() => window.location.reload()}
						style={{
							padding: '0.75rem 1.5rem',
							color: 'white',
							backgroundColor: 'var(--color-accent-main)',
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
