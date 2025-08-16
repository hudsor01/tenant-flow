import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { BaseQueryOptions } from '../services/base-crud.service'

/**
 * Abstract base class for all query DTOs
 * Provides common pagination, sorting, and filtering functionality
 *
 * @abstract
 * @implements {BaseQueryOptions}
 */
export abstract class BaseQueryDto implements BaseQueryOptions {
	/**
	 * Number of items to return
	 * @default 20
	 * @minimum 1
	 * @maximum 100
	 */
	@IsOptional()
	@Type(() => Number)
	@IsInt({ message: 'Limit must be an integer' })
	@Min(1, { message: 'Limit must be at least 1' })
	@Max(100, { message: 'Limit cannot exceed 100' })
	limit?: number = 20

	/**
	 * Number of items to skip
	 * @default 0
	 * @minimum 0
	 */
	@IsOptional()
	@Type(() => Number)
	@IsInt({ message: 'Offset must be an integer' })
	@Min(0, { message: 'Offset cannot be negative' })
	offset?: number = 0

	/**
	 * Sort order for results
	 * @default 'desc'
	 */
	@IsOptional()
	@IsEnum(['asc', 'desc'], {
		message: 'Sort order must be either asc or desc'
	})
	sortOrder?: 'asc' | 'desc' = 'desc'

	/**
	 * Field to sort by - must be defined by each implementing class
	 */
	abstract sortBy?: string

	/**
	 * Optional search term for filtering
	 */
	@IsOptional()
	@IsString()
	@Transform(({ value }) => value?.trim())
	search?: string;

	/**
	 * Index signature to satisfy BaseQueryOptions interface
	 */
	[key: string]: unknown
}

/**
 * Base class for query DTOs with predefined sort fields
 * Use this when sort fields are known at compile time
 */
export abstract class BaseQueryDtoWithSort<
	T extends string
> extends BaseQueryDto {
	/**
	 * Field to sort by
	 * @default 'createdAt'
	 */
	@IsOptional()
	@IsString()
	abstract override sortBy?: T
}
