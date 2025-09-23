export default function AppLoading() {
	return (
		<div
			style={{
				minHeight: '100vh',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				fontFamily: 'system-ui',
				padding: '2rem'
			}}
		>
			<div
				style={{
					textAlign: 'center'
				}}
			>
				<h2
					style={{
						fontSize: '1.5rem',
						fontWeight: 'bold',
						marginBottom: '1rem'
					}}
				>
					Loading TenantFlow...
				</h2>
				<div
					style={{
						width: '40px',
						height: '40px',
						border: '4px solid var(--color-fill-primary)',
						borderTop: '4px solid var(--color-accent-main)',
						borderRadius: '50%',
						margin: '0 auto'
					}}
				/>
			</div>
		</div>
	)
}
