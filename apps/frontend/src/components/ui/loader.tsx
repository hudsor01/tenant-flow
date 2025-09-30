'use client'

const dotBaseClass =
	'h-4 w-4 rounded-full border border-[var(--color-separator)] bg-gradient-to-b from-[var(--color-fill-secondary)] to-[var(--color-fill-tertiary)]'

export function LoaderOne() {
	return (
		<div className="flex items-center gap-2">
			{[0, 1, 2].map(index => (
				<span
					key={index}
					className={`${dotBaseClass} animate-bounce`}
					style={{ animationDelay: `${index * 0.15}s` }}
				/>
			))}
		</div>
	)
}

export function LoaderTwo() {
	return (
		<div className="flex items-center gap-2">
			{[0, 1, 2].map(index => (
				<span
					key={index}
					className={`h-4 w-4 rounded-full bg-[var(--color-fill-primary)] shadow-md dark:bg-[var(--color-fill-secondary)] animate-pulse`}
					style={{ animationDelay: `${index * 0.2}s` }}
				/>
			))}
		</div>
	)
}

export function LoaderThree() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="48"
			height="48"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			className="h-20 w-20 animate-spin stroke-[var(--color-label-tertiary)] dark:stroke-[var(--color-label-primary)]"
		>
			<path stroke="none" d="M0 0h24v24H0z" fill="none" />
			<path d="M13 3v7h6l-8 11v-7H5z" />
		</svg>
	)
}

export function LoaderFour({ text = 'Loading...' }: { text?: string }) {
	return (
		<div className="relative font-bold text-[var(--color-label-primary)] dark:text-[var(--color-label-primary)]">
			<span className="relative z-20 inline-block animate-pulse">{text}</span>
			<span
				aria-hidden
				className="absolute inset-0 animate-ping text-[var(--color-success)] opacity-40 blur-sm"
			>
				{text}
			</span>
		</div>
	)
}
