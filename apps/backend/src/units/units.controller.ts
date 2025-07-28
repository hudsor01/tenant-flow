import {
	Controller,
	Get,
	Post,
	Put,
	Delete,
	Param,
	Body,
	Request,
	HttpException,
	HttpStatus,
	Query
} from '@nestjs/common'
import type { RequestWithUser } from '../auth/auth.types'
import { UnitsService } from './units.service'
import type { CreateUnitInput, UpdateUnitInput } from '@tenantflow/shared/types/api-inputs'



@Controller('units')
export class UnitsController {
	constructor(private readonly unitsService: UnitsService) {}

	@Get()
		async getUnits(
		@Request() req: RequestWithUser,
		@Query('propertyId') propertyId?: string
	) {
		try {
			if (propertyId) {
				return await this.unitsService.getUnitsByProperty(
					propertyId,
					req.user.id
				)
			}
			return await this.unitsService.getUnitsByOwner(req.user.id)
		} catch (error) {
			if (
				error instanceof Error &&
				error.message === 'Property not found or access denied'
			) {
				throw new HttpException(
					'Property not found or access denied',
					HttpStatus.NOT_FOUND
				)
			}
			throw new HttpException(
				'Failed to fetch units',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	@Get('stats')
		async getUnitStats(@Request() req: RequestWithUser) {
		try {
			return await this.unitsService.getUnitStats(req.user.id)
		} catch {
			throw new HttpException(
				'Failed to fetch unit statistics',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	@Get(':id')
		async getUnit(@Param('id') id: string, @Request() req: RequestWithUser) {
		try {
			const unit = await this.unitsService.getUnitById(id, req.user.id)

			if (!unit) {
				throw new HttpException('Unit not found', HttpStatus.NOT_FOUND)
			}

			return unit
		} catch (error) {
			if (error instanceof HttpException) {
				throw error
			}
			throw new HttpException(
				'Failed to fetch unit',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	@Post()
		async createUnit(
		@Body() createUnitDto: CreateUnitInput,
		@Request() req: RequestWithUser
	) {
		try {
			// Map CreateUnitInput to service-compatible format
			const unitData = {
				...createUnitDto,
				rent: createUnitDto.monthlyRent
			}
			return await this.unitsService.createUnit(
				req.user.id,
				unitData
			)
		} catch (error) {
			if (
				error instanceof Error &&
				error.message === 'Property not found or access denied'
			) {
				throw new HttpException(
					'Property not found or access denied',
					HttpStatus.NOT_FOUND
				)
			}
			if (
				error instanceof Error &&
				'code' in error &&
				error.code === 'P2002'
			) {
				// Unique constraint violation
				throw new HttpException(
					'Unit number already exists for this property',
					HttpStatus.BAD_REQUEST
				)
			}
			throw new HttpException(
				'Failed to create unit',
				HttpStatus.BAD_REQUEST
			)
		}
	}

	@Put(':id')
		async updateUnit(
		@Param('id') id: string,
		@Body() updateUnitDto: UpdateUnitInput,
		@Request() req: RequestWithUser
	) {
		try {
			// Convert lastInspectionDate string to Date if provided
			const unitData = {
				...updateUnitDto,
				lastInspectionDate: updateUnitDto.lastInspectionDate
					? new Date(updateUnitDto.lastInspectionDate)
					: undefined
			}

			return await this.unitsService.updateUnit(id, req.user.id, unitData)
		} catch (error) {
			if (
				error instanceof Error &&
				error.message === 'Unit not found or access denied'
			) {
				throw new HttpException(
					'Unit not found or access denied',
					HttpStatus.NOT_FOUND
				)
			}
			if (
				error instanceof Error &&
				'code' in error &&
				error.code === 'P2002'
			) {
				throw new HttpException(
					'Unit number already exists for this property',
					HttpStatus.BAD_REQUEST
				)
			}
			throw new HttpException(
				'Failed to update unit',
				HttpStatus.BAD_REQUEST
			)
		}
	}

	@Delete(':id')
		async deleteUnit(@Param('id') id: string, @Request() req: RequestWithUser) {
		try {
			await this.unitsService.deleteUnit(id, req.user.id)
			return { message: 'Unit deleted successfully' }
		} catch (error) {
			if (
				error instanceof Error &&
				error.message === 'Unit not found or access denied'
			) {
				throw new HttpException(
					'Unit not found or access denied',
					HttpStatus.NOT_FOUND
				)
			}
			if (
				error instanceof Error &&
				error.message === 'Cannot delete unit with active leases'
			) {
				throw new HttpException(
					'Cannot delete unit with active leases',
					HttpStatus.BAD_REQUEST
				)
			}
			throw new HttpException(
				'Failed to delete unit',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}
}
