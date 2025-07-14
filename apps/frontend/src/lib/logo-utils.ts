// Utility function to generate TenantFlow logo as data URL for PDF generation
export const generateTenantFlowLogoDataUrl = (
	width = 200,
	height = 80,
	color: 'primary' | 'white' | 'dark' = 'primary'
): string => {
	const canvas = document.createElement('canvas')
	canvas.width = width
	canvas.height = height
	const ctx = canvas.getContext('2d')

	if (!ctx) return ''

	const colors = {
		primary: {
			gradient: ['#3498db', '#2980b9'],
			text: '#2563eb',
			background: '#ffffff'
		},
		white: {
			gradient: ['#ffffff', '#f8fafc'],
			text: '#ffffff',
			background: 'transparent'
		},
		dark: {
			gradient: ['#1e293b', '#0f172a'],
			text: '#1e293b',
			background: '#ffffff'
		}
	}

	const theme = colors[color]

	// Clear background
	ctx.fillStyle = theme.background
	ctx.fillRect(0, 0, width, height)

	// Create gradient for logo container
	const gradient = ctx.createLinearGradient(0, 0, width * 0.25, 0)
	gradient.addColorStop(0, theme.gradient[0])
	gradient.addColorStop(1, theme.gradient[1])

	// Logo container with rounded corners effect
	ctx.fillStyle = gradient
	ctx.beginPath()
	ctx.roundRect(
		width * 0.05,
		height * 0.1875,
		width * 0.25,
		height * 0.625,
		height * 0.1
	)
	ctx.fill()

	// Buildings
	ctx.fillStyle = theme.background
	const buildingScale = height / 80
	ctx.fillRect(
		width * 0.085,
		height * 0.3125,
		8 * buildingScale,
		30 * buildingScale
	)
	ctx.fillRect(
		width * 0.135,
		height * 0.375,
		6 * buildingScale,
		25 * buildingScale
	)
	ctx.fillRect(
		width * 0.175,
		height * 0.35,
		5 * buildingScale,
		27 * buildingScale
	)
	ctx.fillRect(
		width * 0.21,
		height * 0.4,
		4 * buildingScale,
		23 * buildingScale
	)

	// Windows
	ctx.fillStyle = theme.gradient[0]
	ctx.fillRect(
		width * 0.095,
		height * 0.35,
		2 * buildingScale,
		2 * buildingScale
	)
	ctx.fillRect(
		width * 0.11,
		height * 0.35,
		2 * buildingScale,
		2 * buildingScale
	)
	ctx.fillRect(
		width * 0.095,
		height * 0.4,
		2 * buildingScale,
		2 * buildingScale
	)
	ctx.fillRect(
		width * 0.11,
		height * 0.4,
		2 * buildingScale,
		2 * buildingScale
	)

	// Company name
	ctx.fillStyle = theme.text
	ctx.font = `bold ${height * 0.3}px Arial, sans-serif`
	ctx.textAlign = 'left'
	ctx.textBaseline = 'middle'
	ctx.fillText('TenantFlow', width * 0.35, height * 0.5)

	// Tagline
	ctx.font = `${height * 0.15}px Arial, sans-serif`
	ctx.fillStyle = theme.gradient[1]
	ctx.fillText('Property Management Solutions', width * 0.35, height * 0.75)

	return canvas.toDataURL('image/png')
}
