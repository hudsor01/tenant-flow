import './global.css'
import { Inter, JetBrains_Mono } from 'next/font/google'

export { viewport, metadata } from './layout.constants'

// Optimize font loading with Next.js native font optimization
const inter = Inter({
	subsets: ['latin'],
	variable: '--font-inter',
	display: 'swap',
	preload: true,
	fallback: ['system-ui', '-apple-system', 'sans-serif']
})

const jetbrainsMono = JetBrains_Mono({
	subsets: ['latin'],
	variable: '--font-mono',
	display: 'swap',
	preload: true,
	fallback: ['Courier New', 'monospace']
})

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
			<body className="bg-white font-sans antialiased">{children}</body>
		</html>
	)
}
