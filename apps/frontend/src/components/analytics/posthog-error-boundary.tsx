'use client'

import React from 'react'

interface PostHogErrorBoundaryProps {
	children: React.ReactNode
}

// Simplified error boundary - minimal PostHog integration
export class PostHogErrorBoundary extends React.Component<
	PostHogErrorBoundaryProps,
	{ hasError: boolean }
> {
	constructor(props: PostHogErrorBoundaryProps) {
		super(props)
		this.state = { hasError: false }
	}

	static getDerivedStateFromError() {
		return { hasError: true }
	}

	override componentDidCatch(error: Error) {
		// Simple logging - PostHog handles errors automatically
		console.error('Application error:', error.message)
	}

	override render() {
		if (this.state.hasError) {
			return (
				<div className="flex min-h-screen items-center justify-center">
					<div className="text-center">
						<h2 className="mb-2 text-xl font-semibold">
							Something went wrong
						</h2>
						<button
							onClick={() => this.setState({ hasError: false })}
							className="rounded bg-blue-6 px-4 py-2 text-white hover:bg-blue-7"
						>
							Try again
						</button>
					</div>
				</div>
			)
		}

		return this.props.children
	}
}
