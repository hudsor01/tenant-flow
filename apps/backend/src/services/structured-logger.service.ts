import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class StructuredLoggerService {
  private readonly logger = new Logger(StructuredLoggerService.name)

  log(message: string, context?: string | Record<string, unknown>, metadata?: Record<string, unknown>): void {
    const contextStr = typeof context === 'string' ? context : undefined
    const meta = typeof context === 'object' ? { ...context, ...metadata } : metadata
    
    this.logger.log(JSON.stringify({
      message,
      context: contextStr,
      metadata: meta,
      timestamp: new Date().toISOString()
    }))
  }

  error(message: string, trace?: string, context?: string | Record<string, unknown>): void {
    const contextStr = typeof context === 'string' ? context : JSON.stringify(context)
    
    this.logger.error(JSON.stringify({
      message,
      trace,
      context: contextStr,
      timestamp: new Date().toISOString()
    }))
  }

  warn(message: string, context?: string | Record<string, unknown>): void {
    const contextStr = typeof context === 'string' ? context : JSON.stringify(context)
    
    this.logger.warn(JSON.stringify({
      message,
      context: contextStr,
      timestamp: new Date().toISOString()
    }))
  }

  debug(message: string, context?: string | Record<string, unknown>): void {
    const contextStr = typeof context === 'string' ? context : JSON.stringify(context)
    
    this.logger.debug(JSON.stringify({
      message,
      context: contextStr,
      timestamp: new Date().toISOString()
    }))
  }

  info(message: string, context?: string | Record<string, unknown>): void {
    const contextStr = typeof context === 'string' ? context : JSON.stringify(context)
    
    this.logger.log(JSON.stringify({
      message,
      context: contextStr,
      timestamp: new Date().toISOString()
    }))
  }
}