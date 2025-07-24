
interface TenantFlowLogoProps {
	width?: number
	height?: number
	className?: string
	variant?: 'full' | 'icon' | 'text'
	color?: 'primary' | 'white' | 'dark'
}

export const TenantFlowLogo: React.FC<TenantFlowLogoProps> = ({
	width = 200,
	height = 80,
	className = '',
	variant = 'full',
	color = 'primary'
}) => {
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

	if (variant === 'icon') {
		return (
			<svg
				width={height}
				height={height}
				viewBox="0 0 80 80"
				className={className}
				xmlns="http://www.w3.org/2000/svg"
			>
				<defs>
					<linearGradient
						id="logoGradient"
						x1="0%"
						y1="0%"
						x2="100%"
						y2="0%"
					>
						<stop offset="0%" stopColor={theme.gradient[0]} />
						<stop offset="100%" stopColor={theme.gradient[1]} />
					</linearGradient>
				</defs>
				{/* Main container with rounded corners */}
				<rect
					x="10"
					y="15"
					width="60"
					height="50"
					rx="8"
					fill="url(#logoGradient)"
				/>
				{/* Buildings */}
				<rect
					x="20"
					y="25"
					width="8"
					height="30"
					fill={theme.background}
				/>
				<rect
					x="30"
					y="30"
					width="6"
					height="25"
					fill={theme.background}
				/>
				<rect
					x="38"
					y="28"
					width="5"
					height="27"
					fill={theme.background}
				/>
				<rect
					x="45"
					y="32"
					width="4"
					height="23"
					fill={theme.background}
				/>
				{/* Windows */}
				<rect
					x="22"
					y="28"
					width="2"
					height="2"
					fill={theme.gradient[0]}
				/>
				<rect
					x="25"
					y="28"
					width="2"
					height="2"
					fill={theme.gradient[0]}
				/>
				<rect
					x="22"
					y="32"
					width="2"
					height="2"
					fill={theme.gradient[0]}
				/>
				<rect
					x="25"
					y="32"
					width="2"
					height="2"
					fill={theme.gradient[0]}
				/>
				<rect
					x="31"
					y="33"
					width="1"
					height="2"
					fill={theme.gradient[0]}
				/>
				<rect
					x="33"
					y="33"
					width="1"
					height="2"
					fill={theme.gradient[0]}
				/>
			</svg>
		)
	}

	if (variant === 'text') {
		return (
			<div className={`flex items-center ${className}`}>
				<span
					className="font-bold"
					style={{
						fontSize: `${height * 0.4}px`,
						color: theme.text
					}}
				>
					TenantFlow
				</span>
			</div>
		)
	}

	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 200 80"
			className={className}
			xmlns="http://www.w3.org/2000/svg"
		>
			<defs>
				<linearGradient
					id="logoGradient"
					x1="0%"
					y1="0%"
					x2="100%"
					y2="0%"
				>
					<stop offset="0%" stopColor={theme.gradient[0]} />
					<stop offset="100%" stopColor={theme.gradient[1]} />
				</linearGradient>
			</defs>
			{/* Background */}
			<rect width="200" height="80" fill={theme.background} />
			{/* Logo container */}
			<rect
				x="10"
				y="15"
				width="50"
				height="50"
				rx="8"
				fill="url(#logoGradient)"
			/>
			{/* Buildings */}
			<rect x="17" y="25" width="8" height="30" fill={theme.background} />
			<rect x="27" y="30" width="6" height="25" fill={theme.background} />
			<rect x="35" y="28" width="5" height="27" fill={theme.background} />
			<rect x="42" y="32" width="4" height="23" fill={theme.background} />
			{/* Windows */}
			<rect x="19" y="28" width="2" height="2" fill={theme.gradient[0]} />
			<rect x="22" y="28" width="2" height="2" fill={theme.gradient[0]} />
			<rect x="19" y="32" width="2" height="2" fill={theme.gradient[0]} />
			<rect x="22" y="32" width="2" height="2" fill={theme.gradient[0]} />
			<rect x="28" y="33" width="1" height="2" fill={theme.gradient[0]} />
			<rect x="30" y="33" width="1" height="2" fill={theme.gradient[0]} />
			{/* Company name */}
			<text
				x="70"
				y="45"
				fontFamily="Arial, sans-serif"
				fontSize="24"
				fontWeight="bold"
				fill={theme.text}
			>
				TenantFlow
			</text>
			{/* Tagline */}
			<text
				x="70"
				y="60"
				fontFamily="Arial, sans-serif"
				fontSize="12"
				fill={theme.gradient[1]}
			>
				Property Management Solutions
			</text>
		</svg>
	)
}
