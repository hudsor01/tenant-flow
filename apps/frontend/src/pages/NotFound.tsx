// React 19 JSX runtime - no need to import React explicitly
import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Building2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
	return (
		<div className="flex min-h-screen">
			{/* Left side - Content */}
			<div className="flex w-full flex-col bg-white lg:w-1/2">
				{/* Header */}
				<div className="flex items-center p-8">
					<Link to="/" className="flex items-center">
						<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
							<Building2 className="h-6 w-6 text-white" />
						</div>
						<span className="ml-3 text-2xl font-bold text-foreground">
							TenantFlow
						</span>
					</Link>
				</div>

				{/* Main content */}
				<div className="flex flex-1 items-center justify-center px-8">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
						className="max-w-md"
					>
						<h1 className="mb-4 text-4xl font-bold text-blue-600 sm:text-5xl md:text-6xl">
							404
						</h1>
						<h2 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
							Page not found
						</h2>
						<p className="mb-8 text-lg text-muted-foreground">
							Sorry, we couldn't find the page you're looking for.
						</p>

						<Link to="/dashboard">
							<Button variant="premium">
								<ArrowLeft className="mr-2 h-4 w-4" />
								Back to home
							</Button>
						</Link>
					</motion.div>
				</div>

				{/* Footer */}
				<div className="p-8">
					<div className="flex items-center space-x-6 text-sm text-muted-foreground">
						<Link
							to="/contact"
							className="transition-colors hover:text-foreground"
						>
							Contact support
						</Link>
						<span>•</span>
						<a
							href="https://status.hudsondigitalsolutions.com"
							target="_blank"
							rel="noopener noreferrer"
							className="transition-colors hover:text-foreground"
						>
							Status
						</a>
					</div>
				</div>
			</div>

			{/* Right side - Image */}
			<motion.div
				className="relative hidden overflow-hidden lg:block lg:w-1/2"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.7, delay: 0.2 }}
			>
				<img
					src="https://images.unsplash.com/photo-1559827260-dc66d52bef19?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
					alt="Desert landscape"
					className="h-full w-full object-cover"
				/>
				<div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
				<div className="absolute right-10 bottom-10 left-10 text-white">
					<p className="text-xl font-medium opacity-90">
						"Not all who wander are lost" - J.R.R. Tolkien
					</p>
				</div>
			</motion.div>
		</div>
	)
}
