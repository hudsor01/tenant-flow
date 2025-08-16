import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { FastifyInstance, FastifyRequest } from 'fastify'
import { WebSocket } from 'ws'
import { AuthUser } from '@repo/shared'

/**
 * Production-ready Fastify WebSocket Plugin for TenantFlow
 * 
 * Single Responsibility: WebSocket connection management and routing
 * Follows DRY principles with clean separation of concerns
 */

// Type definitions removed - not used

interface WebSocketMessage {
  type: string
  [key: string]: unknown
}

interface ConnectionMetrics {
  total: number
  byOrganization: Map<string, number>
  messagesSent: number
  messagesReceived: number
  errors: number
}

@Injectable()
export class FastifyWebSocketPlugin {
  private readonly logger = new Logger(FastifyWebSocketPlugin.name)
  private readonly connections = new Map<string, Set<WebSocket>>()
  private readonly userConnections = new Map<string, WebSocket>()
  private readonly metrics: ConnectionMetrics = {
    total: 0,
    byOrganization: new Map(),
    messagesSent: 0,
    messagesReceived: 0,
    errors: 0
  }

  async register(fastify: FastifyInstance, configService: ConfigService): Promise<void> {
    try {
      const fastifyWebsocket = await import('@fastify/websocket')
      const isProduction = configService.get<string>('NODE_ENV') === 'production'

      // Register WebSocket with production-optimized settings
      await fastify.register(fastifyWebsocket.default, {
        options: {
          maxPayload: isProduction ? 1048576 : 10485760, // 1MB prod, 10MB dev
          perMessageDeflate: isProduction ? {
            zlibDeflateOptions: { chunkSize: 1024, memLevel: 7, level: 3 },
            zlibInflateOptions: { chunkSize: 10 * 1024 },
            threshold: 1024,
            concurrencyLimit: 10
          } : false,
          verifyClient: (info: { origin: string; secure: boolean; req: { headers: Record<string, string | string[] | undefined>; socket: { remoteAddress?: string } } }) => {
            return this.verifyClient(info, configService)
          }
        },
        errorHandler: (error: Error, socket: WebSocket, request: FastifyRequest) => {
          this.handleError(error, socket, request)
        }
      })

      // Register authenticated WebSocket routes
      this.registerRoutes(fastify)
      
      // Add Fastify decorators for external usage
      this.addDecorators(fastify)
      
      // Setup graceful shutdown
      this.setupShutdown(fastify)

      this.logger.log('✅ WebSocket plugin registered successfully')
    } catch (error) {
      this.logger.error('Failed to register WebSocket plugin:', error)
      throw error
    }
  }

  /**
   * Verify client connection with production security checks
   */
  private verifyClient(
    info: { origin: string; secure: boolean; req: { headers: Record<string, string | string[] | undefined>; socket: { remoteAddress?: string } } },
    configService: ConfigService
  ): boolean {
    const { origin } = info
    const clientIP = info.req.socket.remoteAddress

    // Production origin validation
    if (configService.get('NODE_ENV') === 'production' && origin) {
      const allowedOrigins = configService.get<string>('CORS_ORIGINS', '')
        .split(',')
        .map(o => o.trim())
        .filter(Boolean)

      if (allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
        this.logger.warn(`WebSocket rejected: invalid origin ${origin} from ${clientIP}`)
        return false
      }
    }

    // Rate limiting check
    if (clientIP && this.isRateLimited(clientIP)) {
      this.logger.warn(`WebSocket rejected: rate limited ${clientIP}`)
      return false
    }

    return true
  }

  /**
   * Simple IP-based rate limiting (use Redis in production)
   */
  private isRateLimited(ip: string): boolean {
    const maxConnectionsPerIP = 10
    let connectionsFromIP = 0

    for (const connections of this.connections.values()) {
      for (const ws of connections) {
        const socket = ws as WebSocket & { clientIP?: string }
        if (socket.clientIP === ip) {
          connectionsFromIP++
          if (connectionsFromIP >= maxConnectionsPerIP) {
            return true
          }
        }
      }
    }

    return false
  }

  /**
   * Register WebSocket routes with proper authentication
   */
  private registerRoutes(fastify: FastifyInstance): void {
    // Main notifications endpoint
    fastify.register(async (fastify) => {
      fastify.get('/ws/notifications', {
        websocket: true,
        preHandler: [this.createAuthHandler()]
      }, (socket: WebSocket, request: FastifyRequest) => {
        this.handleConnection(socket, request, 'notifications')
      })
    })

    // Property-specific maintenance updates
    fastify.register(async (fastify) => {
      fastify.get('/ws/maintenance/:propertyId', {
        websocket: true,
        preHandler: [this.createPropertyAuthHandler()]
      }, (socket: WebSocket, request: FastifyRequest) => {
        this.handleConnection(socket, request, 'maintenance')
      })
    })

    // Admin broadcast endpoint
    fastify.register(async (fastify) => {
      fastify.get('/ws/admin', {
        websocket: true,
        preHandler: [this.createAdminAuthHandler()]
      }, (socket: WebSocket, request: FastifyRequest) => {
        this.handleConnection(socket, request, 'admin')
      })
    })
  }

  /**
   * Create authentication preHandler
   */
  private createAuthHandler() {
    return async (request: FastifyRequest & { user?: AuthUser }, reply: { code: (code: number) => { send: (data: unknown) => void } }) => {
      const token = this.extractToken(request)
      if (!token) {
        reply.code(401).send({ error: 'Authentication required' })
        return
      }

      const user = await this.verifyToken(token)
      if (!user) {
        reply.code(401).send({ error: 'Invalid token' })
        return
      }

      request.user = user
    }
  }

  /**
   * Create property-specific authentication handler
   */
  private createPropertyAuthHandler() {
    return async (request: FastifyRequest & { user?: AuthUser; propertyId?: string }, reply: { code: (code: number) => { send: (data: unknown) => void } }) => {
      // First authenticate
      await this.createAuthHandler()(request, reply)
      
      if (!request.user) return

      // Then verify property access
      const params = request.params as { propertyId?: string }
      const propertyId = params?.propertyId
      
      if (!propertyId) {
        reply.code(400).send({ error: 'Property ID required' })
        return
      }

      const hasAccess = await this.verifyPropertyAccess(request.user.id, propertyId)
      if (!hasAccess) {
        reply.code(403).send({ error: 'Access denied to this property' })
        return
      }

      request.propertyId = propertyId
    }
  }

  /**
   * Create admin authentication handler
   */
  private createAdminAuthHandler() {
    return async (request: FastifyRequest & { user?: AuthUser }, reply: { code: (code: number) => { send: (data: unknown) => void } }) => {
      await this.createAuthHandler()(request, reply)
      
      if (!request.user) return

      if (request.user.role !== 'ADMIN') {
        reply.code(403).send({ error: 'Admin access required' })
        return
      }
    }
  }

  /**
   * Handle WebSocket connection with proper cleanup
   */
  private handleConnection(
    socket: WebSocket & { userId?: string; organizationId?: string; clientIP?: string; connectedAt?: Date },
    request: FastifyRequest & { user?: AuthUser; propertyId?: string },
    type: 'notifications' | 'maintenance' | 'admin'
  ): void {
    const user = request.user

    if (!user) {
      socket.close(1008, 'User not authenticated')
      return
    }

    // Store metadata on socket
    socket.userId = user.id
    socket.organizationId = user.organizationId || 'default'
    socket.clientIP = request.ip
    socket.connectedAt = new Date()

    // Add to appropriate room
    const roomKey = type === 'maintenance' && request.propertyId 
      ? `maintenance:${request.propertyId}`
      : type === 'admin' 
      ? 'admin:broadcast'
      : socket.organizationId

    this.addToRoom(roomKey, socket)
    this.userConnections.set(user.id, socket)

    // Update metrics
    this.updateMetrics('connect', socket.organizationId)

    this.logger.log(`WebSocket connected: ${type} for user ${user.id}`)

    // Send welcome message
    this.sendMessage(socket, {
      type: 'connected',
      userId: user.id,
      connectionType: type,
      timestamp: new Date().toISOString()
    })

    // Setup message handler
    socket.on('message', (data: Buffer) => {
      this.handleMessage(socket, data, user)
    })

    // Setup error handler
    socket.on('error', (error: Error) => {
      this.logger.error(`WebSocket error for user ${user.id}:`, error)
      this.metrics.errors++
    })

    // Setup close handler
    socket.on('close', () => {
      this.handleDisconnect(socket, user, roomKey)
    })

    // Setup ping/pong for connection health
    socket.on('ping', () => socket.pong())
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(socket: WebSocket, data: Buffer, user: AuthUser): void {
    try {
      const message = JSON.parse(data.toString()) as WebSocketMessage
      this.metrics.messagesReceived++

      this.logger.debug(`Message from ${user.id}: ${message.type}`)

      // Route message based on type
      switch (message.type) {
        case 'ping':
          this.sendMessage(socket, { type: 'pong', timestamp: Date.now() })
          break

        case 'broadcast':
          if (user.role === 'ADMIN') {
            this.broadcastToAll({ ...message, from: user.id })
          }
          break

        default:
          this.sendMessage(socket, {
            type: 'error',
            message: `Unknown message type: ${message.type}`
          })
      }
    } catch (error) {
      this.logger.error('Error processing message:', error)
      this.sendMessage(socket, {
        type: 'error',
        message: 'Invalid message format'
      })
    }
  }

  /**
   * Handle client disconnect with cleanup
   */
  private handleDisconnect(socket: WebSocket & { userId?: string; organizationId?: string }, user: AuthUser, roomKey: string): void {
    // Remove from room
    const room = this.connections.get(roomKey)
    if (room) {
      room.delete(socket)
      if (room.size === 0) {
        this.connections.delete(roomKey)
      }
    }

    // Remove from user connections
    this.userConnections.delete(user.id)

    // Update metrics
    if (socket.organizationId) {
      this.updateMetrics('disconnect', socket.organizationId)
    }

    this.logger.log(`WebSocket disconnected: User ${user.id}`)
  }

  /**
   * Add socket to room
   */
  private addToRoom(roomKey: string, socket: WebSocket): void {
    if (!this.connections.has(roomKey)) {
      this.connections.set(roomKey, new Set())
    }
    const room = this.connections.get(roomKey)
    if (room) {
      room.add(socket)
    }
  }

  /**
   * Update connection metrics
   */
  private updateMetrics(action: 'connect' | 'disconnect', organizationId: string): void {
    if (action === 'connect') {
      this.metrics.total++
      const orgCount = this.metrics.byOrganization.get(organizationId) || 0
      this.metrics.byOrganization.set(organizationId, orgCount + 1)
    } else {
      this.metrics.total = Math.max(0, this.metrics.total - 1)
      const orgCount = this.metrics.byOrganization.get(organizationId) || 0
      if (orgCount > 1) {
        this.metrics.byOrganization.set(organizationId, orgCount - 1)
      } else {
        this.metrics.byOrganization.delete(organizationId)
      }
    }
  }

  /**
   * Send message to socket safely
   */
  private sendMessage(socket: WebSocket, message: WebSocketMessage): boolean {
    if (socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify(message))
        this.metrics.messagesSent++
        return true
      } catch (error) {
        this.logger.error('Failed to send message:', error)
        return false
      }
    }
    return false
  }

  /**
   * Extract token from request
   */
  private extractToken(request: FastifyRequest): string | null {
    const authHeader = request.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7)
    }
    
    const query = request.query as { token?: string }
    return query?.token || null
  }

  /**
   * Verify JWT token (integrate with your auth service)
   */
  private async verifyToken(token: string): Promise<AuthUser | null> {
    // TODO: Integrate with actual auth service
    // This is a placeholder - replace with actual verification
    if (!token || token.length < 10) return null
    
    return {
      id: 'user123',
      supabaseId: 'supabase123',
      stripeCustomerId: null,
      name: 'Test User',
      email: 'test@example.com',
      phone: null,
      bio: null,
      avatarUrl: null,
      role: 'OWNER',
      organizationId: 'org123',
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: true
    }
  }

  /**
   * Verify property access (integrate with your property service)
   */
  private async verifyPropertyAccess(_userId: string, _propertyId: string): Promise<boolean> {
    // TODO: Check if user has access to property
    return true
  }

  /**
   * Handle WebSocket errors
   */
  private handleError(error: Error, socket: WebSocket | null, request: FastifyRequest): void {
    this.logger.error('WebSocket error:', {
      error: error.message,
      ip: request.ip
    })
    
    this.metrics.errors++
    
    if (socket) {
      socket.close(1011, 'Server error')
    }
  }

  /**
   * Add Fastify decorators for external usage
   */
  private addDecorators(fastify: FastifyInstance): void {
    fastify.decorate('sendToUser', (userId: string, message: WebSocketMessage) => {
      const socket = this.userConnections.get(userId)
      return socket ? this.sendMessage(socket, message) : false
    })

    fastify.decorate('sendToOrganization', (organizationId: string, message: WebSocketMessage) => {
      const room = this.connections.get(organizationId)
      if (!room) return 0
      
      let sent = 0
      for (const socket of room) {
        if (this.sendMessage(socket, message)) sent++
      }
      return sent
    })

    fastify.decorate('broadcastToProperty', (propertyId: string, message: WebSocketMessage) => {
      const room = this.connections.get(`maintenance:${propertyId}`)
      if (!room) return 0
      
      let sent = 0
      for (const socket of room) {
        if (this.sendMessage(socket, message)) sent++
      }
      return sent
    })

    fastify.decorate('getWebSocketStats', () => ({
      totalConnections: this.metrics.total,
      connectionsByOrganization: Object.fromEntries(this.metrics.byOrganization),
      totalChannels: this.connections.size,
      messagesSent: this.metrics.messagesSent,
      messagesReceived: this.metrics.messagesReceived,
      errors: this.metrics.errors,
      uptime: process.uptime()
    }))
  }

  /**
   * Broadcast to all connections
   */
  private broadcastToAll(message: WebSocketMessage): number {
    let sent = 0
    for (const room of this.connections.values()) {
      for (const socket of room) {
        if (this.sendMessage(socket, message)) sent++
      }
    }
    return sent
  }

  /**
   * Setup graceful shutdown
   */
  private setupShutdown(fastify: FastifyInstance): void {
    const shutdown = () => {
      this.logger.log('Closing all WebSocket connections...')
      
      for (const room of this.connections.values()) {
        for (const socket of room) {
          if (socket.readyState === WebSocket.OPEN) {
            this.sendMessage(socket, {
              type: 'server_shutdown',
              message: 'Server is restarting'
            })
            socket.close(1001, 'Server restart')
          }
        }
      }
      
      this.connections.clear()
      this.userConnections.clear()
    }

    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)
    
    fastify.addHook('onClose', async () => shutdown())
  }
}