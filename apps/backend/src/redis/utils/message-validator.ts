import type { ZodSchema } from 'zod'
import { Logger } from '@nestjs/common'

/**
 * Message validation and serialization utilities for Redis Pub/Sub
 */
export class PubSubMessageValidator {
  private static readonly logger = new Logger(PubSubMessageValidator.name)

  /**
   * Validate a message against a Zod schema
   */
  static validate<T>(message: unknown, schema: ZodSchema<T>): T | null {
    try {
      return schema.parse(message)
    } catch (_error) {
      this.logger.error('Message validation failed')
      return null
    }
  }

  /**
   * Safely parse a JSON string message
   */
  static parseMessage(message: string): unknown {
    try {
      return JSON.parse(message)
    } catch (_error) {
      // If parsing fails, return the original string
      return message
    }
  }

  /**
   * Serialize a message for Redis Pub/Sub
   */
  static serialize(message: unknown): string {
    if (typeof message === 'string') {
      return message
    }
    
    try {
      return JSON.stringify(message, null, 0)
    } catch (_error) {
      this.logger.error('Message serialization failed:', _error)
      throw new Error('Failed to serialize message')
    }
  }

  /**
   * Create a standardized message envelope
   */
  static createEnvelope(
    type: string,
    payload: unknown,
    metadata?: Record<string, unknown>
  ): string {
    const envelope = {
      id: this.generateMessageId(),
      type,
      payload,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    }
    
    return this.serialize(envelope)
  }

  /**
   * Extract payload from a message envelope
   */
  static extractPayload(envelopeString: string): unknown {
    const parsed = this.parseMessage(envelopeString)
    
    if (typeof parsed === 'object' && parsed !== null && 'payload' in parsed) {
      return (parsed as Record<string, unknown>).payload
    }
    
    return parsed
  }

  /**
   * Generate a unique message ID
   */
  static generateMessageId(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 9)
    return `msg_${timestamp}_${random}`
  }

  /**
   * Validate channel name format
   */
  static isValidChannelName(channel: string): boolean {
    // Channel names should not contain spaces or special characters except : and -
    const channelRegex = /^[a-zA-Z0-9:_-]+$/
    return channelRegex.test(channel)
  }

  /**
   * Sanitize a channel name
   */
  static sanitizeChannelName(channel: string): string {
    return channel
      .toLowerCase()
      .replace(/[^a-z0-9:_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
  }

  /**
   * Check if a message is expired based on TTL
   */
  static isMessageExpired(timestamp: string | Date, ttlSeconds: number): boolean {
    const messageTime = new Date(timestamp).getTime()
    const now = Date.now()
    const expirationTime = messageTime + (ttlSeconds * 1000)
    
    return now > expirationTime
  }

  /**
   * Create a batch of messages with shared metadata
   */
  static createBatch(
    messages: { type: string; payload: unknown }[],
    sharedMetadata?: Record<string, unknown>
  ): string[] {
    const batchId = this.generateMessageId()
    
    return messages.map((msg, index) => 
      this.createEnvelope(msg.type, msg.payload, {
        ...sharedMetadata,
        batchId,
        batchIndex: index,
        batchSize: messages.length
      })
    )
  }

  /**
   * Validate message size (Redis Pub/Sub has a practical limit)
   */
  static validateMessageSize(message: string, maxSizeKB = 512): boolean {
    const sizeInBytes = new TextEncoder().encode(message).length
    const sizeInKB = sizeInBytes / 1024
    
    if (sizeInKB > maxSizeKB) {
      this.logger.warn(`Message size ${sizeInKB.toFixed(2)}KB exceeds limit of ${maxSizeKB}KB`)
      return false
    }
    
    return true
  }

  /**
   * Compress large messages (for future implementation)
   */
  static compressMessage(message: string): string {
    // TODO: Implement compression for large messages
    // Could use zlib or similar compression library
    return message
  }

  /**
   * Decompress messages (for future implementation)
   */
  static decompressMessage(message: string): string {
    // TODO: Implement decompression for compressed messages
    return message
  }
}
