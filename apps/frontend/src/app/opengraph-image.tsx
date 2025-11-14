import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'TenantFlow - Simplify Property Management'
export const size = {
	width: 1200,
	height: 630
}
export const contentType = 'image/png'

export default async function Image() {
	return new ImageResponse(
		(
			<div
				style={{
					fontSize: 60,
					background: 'var(--color-primary)',
					width: '100%',
					height: '100%',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					color: 'var(--color-fill-primary)',
					fontFamily: 'Inter, sans-serif'
				}}
			>
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						justifyContent: 'center',
						textAlign: 'center',
						maxWidth: '900px',
						padding: '0 40px'
					}}
				>
					<div
						style={{
							fontSize: 72,
							fontWeight: 'bold',
							marginBottom: 30,
							background:
								'linear-gradient(45deg, var(--color-fill-primary), var(--color-fill-primary))',
							backgroundClip: 'text',
							WebkitBackgroundClip: 'text',
							color: 'transparent'
						}}
					>
						Simplify
					</div>
					<div
						style={{
							fontSize: 48,
							fontWeight: '600',
							marginBottom: 40,
							opacity: 0.9
						}}
					>
						Property Management
					</div>
					<div
						style={{
							fontSize: 24,
							opacity: 0.8,
							textAlign: 'center',
							lineHeight: 1.4
						}}
					>
						Professional property management software trusted by thousands
					</div>
				</div>

				{/* Logo/Brand Mark */}
				<div
					style={{
						position: 'absolute',
						bottom: 60,
						right: 60,
						fontSize: 32,
						fontWeight: 'bold',
						opacity: 0.7
					}}
				>
					TenantFlow
				</div>

				{/* Background Pattern */}
				<div
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						width: '100%',
						height: '100%',
						opacity: 0.1,
						background: `
              radial-gradient(circle at 25% 25%, var(--color-background, white) 0%, transparent 50%),
              radial-gradient(circle at 75% 75%, var(--color-background, white) 0%, transparent 50%)
            `
					}}
				/>
			</div>
		),
		{
			...size
		}
	)
}
