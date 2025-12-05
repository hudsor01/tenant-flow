import { Global, Module } from '@nestjs/common'
import { WinstonModule } from 'nest-winston'
import { AppConfigService } from '../config/app-config.service'
import { SharedModule } from '../shared/shared.module'
import { AppLogger } from './app-logger.service'
import {
	DEFAULT_LOG_DIR,
	DEFAULT_SERVICE_NAME
} from './winston.config'
import {
	baseLoggerOptions,
	createConsoleTransport,
	createDailyRotateFileTransport,
	ensureLogDirectory
} from './winston.utils'

@Global()
@Module({
	imports: [
		WinstonModule.forRootAsync({
			imports: [SharedModule],
			inject: [AppConfigService],
			useFactory: (config: AppConfigService) => {
				const level = config.getLogLevel()
				const isDev = config.isDevelopment()
				const logDir = ensureLogDirectory(DEFAULT_LOG_DIR)

				const consoleTransport = createConsoleTransport({
					level,
					serviceName: DEFAULT_SERVICE_NAME,
					enableColors: isDev
				})

				const fileTransport = createDailyRotateFileTransport({
					level,
					logDir,
					filename: 'backend-%DATE%.log'
				})

				return {
					...baseLoggerOptions(level),
					defaultMeta: { service: DEFAULT_SERVICE_NAME },
					exceptionHandlers: [consoleTransport, fileTransport],
					rejectionHandlers: [consoleTransport, fileTransport],
					transports: [consoleTransport, fileTransport]
				}
			}
		})
	],
	providers: [AppLogger],
	exports: [AppLogger]
})
export class LoggerModule {}
