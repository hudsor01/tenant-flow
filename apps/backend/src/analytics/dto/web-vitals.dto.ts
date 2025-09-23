import {
	WebVitalLabel,
	WebVitalMetricName,
	WebVitalNavigationType,
	WebVitalRating
} from '@repo/shared'
import {
	IsEnum,
	IsISO8601,
	IsNumber,
	IsOptional,
	IsString
} from 'class-validator'

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
