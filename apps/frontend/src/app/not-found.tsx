import Link from 'next/link'

export default function NotFound() {
	return (
		<div style={{
			minHeight: '100vh',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			padding: '2rem',
			fontFamily: 'system-ui',
			textAlign: 'center'
		}}>
			<div style={{ maxWidth: '28rem', width: '100%' }}>
				<div style={{
					fontSize: '8rem',
					lineHeight: '1',
					fontWeight: '900',
					marginBottom: '2rem',
					background: 'linear-gradient(to right, #0066cc, #0052a3)',
					WebkitBackgroundClip: 'text',
					WebkitTextFillColor: 'transparent'
				}}>
					404
				</div>

				<div style={{ marginBottom: '2rem' }}>
					<h1 style={{
						fontSize: '2rem',
						fontWeight: 'bold',
						marginBottom: '1rem'
					}}>
						Page not found
					</h1>
					<p style={{
						color: '#666',
						marginBottom: '2rem'
					}}>
						The page you're looking for doesn't exist or has been moved.
					</p>
				</div>

				<div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
					<Link
						href="/"
						style={{
							padding: '0.75rem 1.5rem',
							backgroundColor: '#0066cc',
							color: 'white',
							textDecoration: 'none',
							borderRadius: '0.5rem',
							fontWeight: '500'
						}}
					>
						← Back to Home
					</Link>

					<Link
						href="/contact"
						style={{
							padding: '0.75rem 1.5rem',
							border: '2px solid #0066cc',
							color: '#0066cc',
							textDecoration: 'none',
							borderRadius: '0.5rem',
							fontWeight: '500'
						}}
					>
						Get Help
					</Link>
				</div>
			</div>
		</div>
	)
}
