import { IsEnum, IsISO8601, IsNumber, IsOptional, IsString } from 'class-validator'

export enum WebVitalMetricName {
	CLS = 'CLS',
	FCP = 'FCP',
	FID = 'FID',
	INP = 'INP',
	LCP = 'LCP',
	TTFB = 'TTFB'
}

export enum WebVitalRating {
	GOOD = 'good',
	NEEDS_IMPROVEMENT = 'needs-improvement',
	POOR = 'poor'
}

export enum WebVitalLabel {
	WEB_VITAL = 'web-vital',
	CUSTOM = 'custom'
}

export enum WebVitalNavigationType {
	NAVIGATE = 'navigate',
	RELOAD = 'reload',
	BACK_FORWARD = 'back-forward',
	PRERENDER = 'prerender'
}

export class WebVitalsDto {
	@IsEnum(WebVitalMetricName)
	name!: WebVitalMetricName

	@IsNumber()
	value!: number

	@IsEnum(WebVitalRating)
	rating!: WebVitalRating

	@IsNumber()
	delta!: number

	@IsString()
	id!: string

	@IsOptional()
	@IsEnum(WebVitalLabel)
	label?: WebVitalLabel

	@IsOptional()
	@IsEnum(WebVitalNavigationType)
	navigationType?: WebVitalNavigationType

	@IsOptional()
	@IsString()
	page?: string

	@IsOptional()
	@IsISO8601()
	timestamp?: string

	@IsOptional()
	@IsString()
	sessionId?: string

	@IsOptional()
	@IsString()
	userId?: string
}
