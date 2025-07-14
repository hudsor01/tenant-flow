/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_STRIPE_PUBLISHABLE_KEY: string
	readonly VITE_API_URL?: string // Optional backend API URL
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
