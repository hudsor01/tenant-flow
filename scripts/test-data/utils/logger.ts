/**
 * Enhanced Logger for Test Data Seeding
 * 
 * Provides structured logging with different levels, colors, and formatting
 * for better visibility during test data operations.
 */

import { inspect } from 'util'

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  VERBOSE = 4
}

export interface LoggerOptions {
  level?: LogLevel
  colors?: boolean
  timestamps?: boolean
  prefix?: string
}

export class Logger {
  private level: LogLevel
  private colors: boolean
  private timestamps: boolean
  private prefix: string

  constructor(options: LoggerOptions | boolean = {}) {
    // Handle boolean parameter for backward compatibility
    if (typeof options === 'boolean') {
      options = { level: options ? LogLevel.VERBOSE : LogLevel.INFO }
    }

    this.level = options.level ?? LogLevel.INFO
    this.colors = options.colors ?? true
    this.timestamps = options.timestamps ?? true
    this.prefix = options.prefix ?? '[TestData]'
  }

  error(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.ERROR) {
      this.log('ERROR', message, '❌', '\x1b[31m', args)
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.WARN) {
      this.log('WARN', message, '⚠️', '\x1b[33m', args)
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.INFO) {
      this.log('INFO', message, 'ℹ️', '\x1b[36m', args)
    }
  }

  success(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.INFO) {
      this.log('SUCCESS', message, '✅', '\x1b[32m', args)
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.DEBUG) {
      this.log('DEBUG', message, '🔍', '\x1b[35m', args)
    }
  }

  verbose(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.VERBOSE) {
      this.log('VERBOSE', message, '📝', '\x1b[37m', args)
    }
  }

  private log(level: string, message: string, emoji: string, color: string, args: any[]): void {
    const timestamp = this.timestamps ? new Date().toISOString() : ''
    const resetColor = '\x1b[0m'
    
    let formattedMessage = message
    
    // Add timestamp if enabled
    if (this.timestamps) {
      formattedMessage = `${timestamp} ${formattedMessage}`
    }
    
    // Add prefix
    formattedMessage = `${this.prefix} ${formattedMessage}`
    
    // Add emoji
    formattedMessage = `${emoji} ${formattedMessage}`
    
    // Apply colors if enabled
    if (this.colors) {
      formattedMessage = `${color}${formattedMessage}${resetColor}`
    }
    
    // Log message
    console.log(formattedMessage)
    
    // Log additional arguments if provided
    if (args.length > 0) {
      for (const arg of args) {
        if (typeof arg === 'object') {
          console.log(this.formatObject(arg))
        } else {
          console.log(`   ${arg}`)
        }
      }
    }
  }

  private formatObject(obj: any): string {
    return inspect(obj, {
      colors: this.colors,
      depth: 3,
      compact: false,
      breakLength: 80
    })
  }

  // Progress tracking methods
  startProgress(total: number, description: string = 'Progress'): ProgressTracker {
    return new ProgressTracker(this, total, description)
  }

  // Timing methods
  time(label: string): void {
    console.time(`${this.prefix} ${label}`)
  }

  timeEnd(label: string): void {
    console.timeEnd(`${this.prefix} ${label}`)
  }

  // Table formatting
  table(data: any[]): void {
    console.table(data)
  }
}

export class ProgressTracker {
  private current: number = 0
  private total: number
  private description: string
  private logger: Logger
  private startTime: number
  private lastUpdateTime: number

  constructor(logger: Logger, total: number, description: string) {
    this.logger = logger
    this.total = total
    this.description = description
    this.startTime = Date.now()
    this.lastUpdateTime = this.startTime
  }

  increment(count: number = 1): void {
    this.current += count
    this.update()
  }

  setProgress(current: number): void {
    this.current = current
    this.update()
  }

  private update(): void {
    const now = Date.now()
    const elapsed = now - this.startTime
    const elapsedSinceUpdate = now - this.lastUpdateTime
    
    // Only update every 500ms to avoid spam
    if (elapsedSinceUpdate < 500 && this.current < this.total) {
      return
    }
    
    const percentage = ((this.current / this.total) * 100).toFixed(1)
    const rate = this.current / (elapsed / 1000)
    const remaining = this.total - this.current
    const eta = remaining / rate
    
    let progressBar = this.createProgressBar(this.current, this.total)
    let message = `${this.description}: ${progressBar} ${percentage}% (${this.current}/${this.total})`
    
    if (this.current > 0 && this.current < this.total) {
      message += ` | Rate: ${rate.toFixed(1)}/s | ETA: ${this.formatDuration(eta)}`
    } else if (this.current === this.total) {
      message += ` | Completed in ${this.formatDuration(elapsed / 1000)}`
    }
    
    // Use carriage return to overwrite the line
    if (this.current < this.total) {
      process.stdout.write(`\r${message}`)
    } else {
      // Final message with newline
      process.stdout.write(`\r${message}\n`)
    }
    
    this.lastUpdateTime = now
  }

  private createProgressBar(current: number, total: number, width: number = 30): string {
    const percentage = current / total
    const filled = Math.round(width * percentage)
    const empty = width - filled
    
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds.toFixed(0)}s`
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(0)}s`
    } else {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      return `${hours}h ${minutes}m`
    }
  }

  complete(): void {
    this.setProgress(this.total)
  }
}

// Export singleton instance
export const logger = new Logger({ level: LogLevel.INFO })