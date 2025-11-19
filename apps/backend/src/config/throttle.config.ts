type ThrottleConfigOptions = {
	envTtlKey: string
	envLimitKey: string
	defaultTtl: number
	defaultLimit: number
}

export function resolveThrottleValue(envKey: string, fallback: number) {
	const rawValue = process.env[envKey]
	if (rawValue === undefined) return fallback

	const parsed = Number(rawValue)
	if (!Number.isFinite(parsed)) return fallback

	const sanitized = Math.floor(parsed)
	return sanitized > 0 ? sanitized : fallback
}

export function createThrottleDefaults({
	envTtlKey,
	envLimitKey,
	defaultTtl,
	defaultLimit
}: ThrottleConfigOptions) {
	return {
		ttl: resolveThrottleValue(envTtlKey, defaultTtl),
		limit: resolveThrottleValue(envLimitKey, defaultLimit)
	}
}
