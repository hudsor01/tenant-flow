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
import { LeasesService } from './leases.service'
import type { RequestWithUser } from '../auth/auth.types'
import type { CreateLeaseInput, UpdateLeaseInput } from '@tenantflow/shared/types/api-inputs'



@Controller('leases')
export class LeasesController {
	constructor(private readonly leasesService: LeasesService) {}

	@Get()
		async getLeases(@Request() req: RequestWithUser) {
		try {
			return await this.leasesService.getLeasesByOwner(req.user.id)
		} catch {
			throw new HttpException(
				'Failed to fetch leases',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	@Get('stats')
		async getLeaseStats(@Request() req: RequestWithUser) {
		try {
			return await this.leasesService.getLeaseStats(req.user.id)
		} catch {
			throw new HttpException(
				'Failed to fetch lease statistics',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	@Get('expiring')
		async getExpiringLeases(
		@Request() req: RequestWithUser,
		@Query('days') days?: string
	) {
		try {
			const daysNumber = days ? parseInt(days, 10) : 30
			return await this.leasesService.getExpiringLeases(
				req.user.id,
				daysNumber
			)
		} catch {
			throw new HttpException(
				'Failed to fetch expiring leases',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	@Get(':id')
		async getLease(@Param('id') id: string, @Request() req: RequestWithUser) {
		try {
			const lease = await this.leasesService.getLeaseById(id, req.user.id)

			if (!lease) {
				throw new HttpException('Lease not found', HttpStatus.NOT_FOUND)
			}

			return lease
		} catch (error) {
			if (error instanceof HttpException) {
				throw error
			}
			throw new HttpException(
				'Failed to fetch lease',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	@Post()
		async createLease(
		@Body() createLeaseDto: CreateLeaseInput,
		@Request() req: RequestWithUser
	) {
		try {
			// Provide default security deposit if not specified
			const leaseData = {
				...createLeaseDto,
				securityDeposit: createLeaseDto.securityDeposit ?? 0
			}
			return await this.leasesService.createLease(
				req.user.id,
				leaseData
			)
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
				error.message === 'Tenant not found or access denied'
			) {
				throw new HttpException(
					'Tenant not found or access denied',
					HttpStatus.NOT_FOUND
				)
			}
			if (
				error instanceof Error &&
				error.message ===
					'Unit has overlapping lease for the specified dates'
			) {
				throw new HttpException(
					'Unit has overlapping lease for the specified dates',
					HttpStatus.BAD_REQUEST
				)
			}
			throw new HttpException(
				'Failed to create lease',
				HttpStatus.BAD_REQUEST
			)
		}
	}

	@Put(':id')
		async updateLease(
		@Param('id') id: string,
		@Body() updateLeaseDto: UpdateLeaseInput,
		@Request() req: RequestWithUser
	) {
		try {
			return await this.leasesService.updateLease(
				id,
				req.user.id,
				updateLeaseDto
			)
		} catch (error) {
			if (
				error instanceof Error &&
				error.message === 'Lease not found or access denied'
			) {
				throw new HttpException(
					'Lease not found or access denied',
					HttpStatus.NOT_FOUND
				)
			}
			if (
				error instanceof Error &&
				error.message ===
					'Unit has overlapping lease for the specified dates'
			) {
				throw new HttpException(
					'Unit has overlapping lease for the specified dates',
					HttpStatus.BAD_REQUEST
				)
			}
			throw new HttpException(
				'Failed to update lease',
				HttpStatus.BAD_REQUEST
			)
		}
	}

	@Delete(':id')
		async deleteLease(
		@Param('id') id: string,
		@Request() req: RequestWithUser
	) {
		try {
			await this.leasesService.deleteLease(id, req.user.id)
			return { message: 'Lease deleted successfully' }
		} catch (error) {
			if (
				error instanceof Error &&
				error.message === 'Lease not found or access denied'
			) {
				throw new HttpException(
					'Lease not found or access denied',
					HttpStatus.NOT_FOUND
				)
			}
			if (
				error instanceof Error &&
				error.message === 'Cannot delete active lease'
			) {
				throw new HttpException(
					'Cannot delete active lease',
					HttpStatus.BAD_REQUEST
				)
			}
			if (
				error instanceof Error &&
				error.message === 'Cannot delete lease with payment history'
			) {
				throw new HttpException(
					'Cannot delete lease with payment history',
					HttpStatus.BAD_REQUEST
				)
			}
			throw new HttpException(
				'Failed to delete lease',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	@Get('rent-reminders')
		async getRentReminders(@Request() req: RequestWithUser) {
		try {
			return await this.leasesService.getRentReminders(req.user.id)
		} catch {
			throw new HttpException(
				'Failed to fetch rent reminders',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	@Post('rent-reminders/:id/send')
		async sendRentReminder(
		@Param('id') reminderId: string,
		@Request() req: RequestWithUser
	) {
		try {
			return await this.leasesService.sendRentReminder(
				reminderId,
				req.user.id
			)
		} catch {
			throw new HttpException(
				'Failed to send rent reminder',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	@Post('rent-reminders/send-bulk')
		async sendBulkRentReminders(
		@Body('reminderIds') reminderIds: string[],
		@Request() req: RequestWithUser
	) {
		try {
			return await this.leasesService.sendBulkRentReminders(
				reminderIds,
				req.user.id
			)
		} catch {
			throw new HttpException(
				'Failed to send bulk rent reminders',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}
}
