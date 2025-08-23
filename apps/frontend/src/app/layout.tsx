import './globals.css'

export { viewport, metadata } from './layout.constants'

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="en">
			<body className="bg-white font-sans antialiased">{children}</body>
		</html>
	)
}
