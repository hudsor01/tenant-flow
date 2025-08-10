import * as winston from 'winston'
import 'winston-daily-rotate-file'
import { utilities as nestWinstonModuleUtilities } from 'nest-winston'

const { combine, timestamp, errors, json, printf, colorize } = winston.format

// Custom format for development
const devFormat = printf(({ level, message, timestamp, context, trace, ...meta }) => {
  const formattedMessage = `${timestamp} [${context || 'Application'}] ${level}: ${message}`
  
  if (trace) {
    return `${formattedMessage}\n${trace}`
  }
  
  if (Object.keys(meta).length > 0) {
    return `${formattedMessage} ${JSON.stringify(meta)}`
  }
  
  return formattedMessage
})

// Production format configuration
const prodFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  errors({ stack: true }),
  json()
)

// Development format configuration
const devFormatConfig = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  errors({ stack: true }),
  colorize({ all: true }),
  devFormat
)

export const createWinstonConfig = (isProduction: boolean) => {
  console.log('=== WINSTON CONFIG DEBUG ===')
  console.log('isProduction:', isProduction)
  console.log('DOCKER_CONTAINER:', process.env.DOCKER_CONTAINER)
  console.log('RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT)
  
  const transports: winston.transport[] = []

  if (isProduction) {
    // Only add file transports if not in Docker container (Docker logs to stdout/stderr)
    const isDocker = process.env.DOCKER_CONTAINER === 'true' || process.env.RAILWAY_ENVIRONMENT
    console.log('isDocker:', isDocker)
    
    if (!isDocker) {
      console.log('=== CREATING FILE TRANSPORTS (NOT IN DOCKER) ===')
      // Daily rotate file for application logs
      transports.push(
        new winston.transports.DailyRotateFile({
          filename: '/app/logs/application-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          level: 'info',
          format: prodFormat,
        })
      )

      // Daily rotate file for error logs
      transports.push(
        new winston.transports.DailyRotateFile({
          filename: '/app/logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '30d',
          level: 'error',
          format: prodFormat,
        })
      )
    }

    // Console transport for production (minimal)
    transports.push(
      new winston.transports.Console({
        level: 'warn',
        format: combine(
          timestamp(),
          nestWinstonModuleUtilities.format.nestLike('TenantFlow', {
            prettyPrint: false,
            colors: false,
          })
        ),
      })
    )
  } else {
    // Console transport for development
    transports.push(
      new winston.transports.Console({
        level: process.env.LOG_LEVEL || 'debug',
        format: combine(
          timestamp(),
          nestWinstonModuleUtilities.format.nestLike('TenantFlow', {
            prettyPrint: true,
            colors: true,
          })
        ),
      })
    )

    // File transport for development (optional)
    if (process.env.LOG_TO_FILE === 'true') {
      transports.push(
        new winston.transports.File({
          filename: '/tmp/logs/development.log',
          level: 'debug',
          format: devFormatConfig,
        })
      )
    }
  }

  return {
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    format: isProduction ? prodFormat : devFormatConfig,
    transports,
    exitOnError: false,
  }
}

// Create logger instance
export const createLogger = () => {
  const isProduction = process.env.NODE_ENV === 'production'
  return winston.createLogger(createWinstonConfig(isProduction))
}