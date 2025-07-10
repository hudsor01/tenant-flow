import {
	Controller,
	Get,
	Post,
	Body,
	Param,
	Put,
	Delete,
	Query,
	UseGuards,
	Request,
	HttpException,
	HttpStatus
} from '@nestjs/common'
import { MaintenanceService } from './maintenance.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { RequestWithUser } from '../auth/auth.types'
import type {
	CreateMaintenanceDto,
	UpdateMaintenanceDto,
	MaintenanceQuery
} from './dto/create-maintenance.dto'

@Controller('maintenance')
@UseGuards(JwtAuthGuard)
export class MaintenanceController {
	constructor(private readonly maintenanceService: MaintenanceService) {}

	@Post()
	create(@Body() createMaintenanceDto: CreateMaintenanceDto) {
		return this.maintenanceService.create(createMaintenanceDto)
	}

	@Get()
	findAll(@Query() query: MaintenanceQuery) {
		return this.maintenanceService.findAll(query)
	}

	@Get('stats')
	getStats() {
		return this.maintenanceService.getStats()
	}

	@Get(':id')
	findOne(@Param('id') id: string) {
		return this.maintenanceService.findOne(id)
	}

	@Put(':id')
	update(
		@Param('id') id: string,
		@Body() updateMaintenanceDto: UpdateMaintenanceDto
	) {
		return this.maintenanceService.update(id, updateMaintenanceDto)
	}

	@Delete(':id')
	remove(@Param('id') id: string) {
		return this.maintenanceService.remove(id)
	}

	@Post('notifications')
	async sendNotification(
		@Body() notificationData: {
			type: 'new_request' | 'status_update' | 'emergency_alert'
			maintenanceRequestId: string
			recipientEmail: string
			recipientName: string
			recipientRole: 'owner' | 'tenant'
			actionUrl?: string
		},
		@Request() req: RequestWithUser
	) {
		try {
			return await this.maintenanceService.sendNotification(
				notificationData,
				req.user.id
			)
		} catch (error) {
			throw new HttpException(
				`Failed to send notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
				HttpStatus.BAD_REQUEST
			)
		}
	}

	@Post('notifications/log')
	async logNotification(
		@Body() logData: {
			type: 'maintenance_notification'
			recipientEmail: string
			recipientName: string
			subject: string
			maintenanceRequestId: string
			notificationType: string
			status: 'sent' | 'failed'
		},
		@Request() req: RequestWithUser
	) {
		try {
			return await this.maintenanceService.logNotification(
				logData,
				req.user.id
			)
		} catch (error) {
			throw new HttpException(
				`Failed to log notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
				HttpStatus.BAD_REQUEST
			)
		}
	}
}
