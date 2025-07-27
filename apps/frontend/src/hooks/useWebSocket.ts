import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import { useAuth } from './useAuth'
import { supabase } from '@/lib/clients'
import { logger } from '../lib/logger'
import type {
	WebSocketMessage,
	UseWebSocketOptions
} from '@tenantflow/shared'

interface ExtendedWebSocketState {
	isConnected: boolean
	lastMessage: WebSocketMessage | null
	error: string | null
	reconnectCount: number
	socket: Socket | null
}

// Type for maintenance-specific WebSocket updates
interface MaintenanceUpdateData {
	id: string
	type: string
	status?: string
	priority?: string
	unitId?: string
	assignedTo?: string
	timestamp: string | Date
	metadata?: Record<string, string | number | boolean | null>
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
	const {
		autoConnect = true,
		reconnectAttempts = 5,
		reconnectDelay = 1000
	} = options

	const { user } = useAuth()
	const socketRef = useRef<Socket | null>(null)
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const reconnectCountRef = useRef(0)
	const scheduleReconnectRef = useRef<(() => void) | null>(null)

	const [state, setState] = useState<ExtendedWebSocketState>({
		isConnected: false,
		socket: null,
		lastMessage: null,
		error: null,
		reconnectCount: 0
	})

	const updateState = useCallback(
		(updates: Partial<ExtendedWebSocketState>) => {
			setState(prev => ({ ...prev, ...updates }))
		},
		[]
	)

	const connect = useCallback(async () => {
		// Get token from Supabase session
		const { data: { session } } = await supabase.auth.getSession()
		const token = session?.access_token
		if (!user?.id || !token) {
			logger.warn(
				'Cannot connect to WebSocket: No user or token available'
			)
			return
		}

		if (socketRef.current?.connected) {
			logger.info('WebSocket already connected')
			return
		}

		try {
			// Use environment variable or default URL
			const baseUrl =
				import.meta.env.VITE_API_BASE_URL ||
				'https://tenantflow.app/api/v1'
			const wsUrl =
				baseUrl.replace(/^http/, 'ws').replace(/\/api\/v1$/, '') ||
				'wss://tenantflow.app'

			logger.info('Connecting to WebSocket...', undefined, {
				wsUrl,
				userId: user.id
			})

			const socket = io(`${wsUrl}/ws`, {
				auth: {
					token
				},
				transports: ['websocket'],
				autoConnect: false,
				reconnection: false // We'll handle reconnection manually
			})

			// Connection events
			socket.on('connect', () => {
				logger.info('WebSocket connected successfully')
				reconnectCountRef.current = 0
				updateState({
					isConnected: true,
					socket,
					error: null,
					reconnectCount: 0
				})
			})

			socket.on('disconnect', (reason: string) => {
				logger.warn('WebSocket disconnected:', undefined, { reason })
				updateState({
					isConnected: false,
					error: `Disconnected: ${reason}`
				})

				// Attempt reconnection if not manually disconnected
				if (
					reason !== 'io client disconnect' &&
					reconnectCountRef.current < reconnectAttempts
				) {
					scheduleReconnectRef.current?.()
				}
			})

			socket.on('connect_error', (error: Error) => {
				logger.error('WebSocket connection error:', error)
				updateState({
					isConnected: false,
					error: `Connection failed: ${error.message}`
				})

				// Attempt reconnection
				if (reconnectCountRef.current < reconnectAttempts) {
					scheduleReconnectRef.current?.()
				}
			})

			// Message handling
			socket.on('message', (message: WebSocketMessage) => {
				logger.debug('WebSocket message received:', undefined, {
					message
				})
				updateState({ lastMessage: message })
			})

			socket.on(
				'connected',
				(data: Record<string, string | number | boolean | null>) => {
					logger.info(
						'WebSocket authentication successful:',
						undefined,
						{ data }
					)
				}
			)

			socket.on('error', (error: Error) => {
				logger.error('WebSocket error:', error)
				updateState({ error: error.message || 'Unknown error' })
			})

			socket.on('subscribed', (data: { channel: string }) => {
				logger.info('Successfully subscribed to channel:', undefined, {
					channel: data.channel
				})
			})

			socket.on('unsubscribed', (data: { channel: string }) => {
				logger.info(
					'Successfully unsubscribed from channel:',
					undefined,
					{ channel: data.channel }
				)
			})

			socketRef.current = socket
			updateState({ socket })

			// Actually connect
			socket.connect()
		} catch (error) {
			logger.error(
				'Failed to create WebSocket connection:',
				error as Error
			)
			updateState({
				error:
					error instanceof Error ? error.message : 'Failed to connect'
			})
		}
	}, [user?.id, reconnectAttempts, updateState])

	const scheduleReconnect = useCallback(() => {
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current)
		}

		reconnectCountRef.current += 1
		const delay =
			reconnectDelay * Math.pow(2, reconnectCountRef.current - 1) // Exponential backoff

		logger.info(
			`Scheduling reconnect attempt ${reconnectCountRef.current}/${reconnectAttempts} in ${delay}ms`
		)

		updateState({ reconnectCount: reconnectCountRef.current })

		reconnectTimeoutRef.current = setTimeout(() => {
			logger.info(
				`Attempting reconnect ${reconnectCountRef.current}/${reconnectAttempts}`
			)
			connect()
		}, delay)
	}, [connect, reconnectAttempts, reconnectDelay, updateState])

	// Update the ref whenever scheduleReconnect changes
	scheduleReconnectRef.current = scheduleReconnect

	const disconnect = useCallback(() => {
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current)
			reconnectTimeoutRef.current = null
		}

		if (socketRef.current) {
			logger.info('Disconnecting WebSocket...')
			socketRef.current.disconnect()
			socketRef.current = null
		}

		updateState({
			isConnected: false,
			socket: null,
			error: null,
			reconnectCount: 0
		})
		reconnectCountRef.current = 0
	}, [updateState])

	const subscribe = useCallback(
		(
			channel: string,
			filters?: Record<string, string | number | boolean | null>
		) => {
			if (!socketRef.current?.connected) {
				logger.warn('Cannot subscribe: WebSocket not connected')
				return false
			}

			logger.info('Subscribing to channel:', undefined, { channel })
			socketRef.current.emit('subscribe', { channel, filters })
			return true
		},
		[]
	)

	const unsubscribe = useCallback((channel: string) => {
		if (!socketRef.current?.connected) {
			logger.warn('Cannot unsubscribe: WebSocket not connected')
			return false
		}

		logger.info('Unsubscribing from channel:', undefined, { channel })
		socketRef.current.emit('unsubscribe', { channel })
		return true
	}, [])

	const sendMessage = useCallback(
		(
			event: string,
			data: Record<string, string | number | boolean | null> | string
		) => {
			if (!socketRef.current?.connected) {
				logger.warn('Cannot send message: WebSocket not connected')
				return false
			}

			socketRef.current.emit(event, data)
			return true
		},
		[]
	)

	// Auto-connect when user and token are available
	useEffect(() => {
		const checkAndConnect = async () => {
			const { data: { session } } = await supabase.auth.getSession()
			const token = session?.access_token
			if (autoConnect && user?.id && token && !socketRef.current) {
				connect()
			}
		}

		checkAndConnect()

		return () => {
			if (!autoConnect) {
				disconnect()
			}
		}
	}, [user?.id, autoConnect, connect, disconnect])

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			disconnect()
		}
	}, [disconnect])

	return {
		...state,
		connect,
		disconnect,
		subscribe,
		unsubscribe,
		sendMessage,
		isReconnecting: state.reconnectCount > 0,
		isConnected: state.isConnected,
		lastMessage: state.lastMessage
	}
}

// Specialized hook for maintenance request real-time updates
export function useMaintenanceWebSocket() {
	const { user } = useAuth()
	const webSocket = useWebSocket()
	const [maintenanceUpdates, setMaintenanceUpdates] = useState<
		MaintenanceUpdateData[]
	>([])

	// Handle maintenance-specific messages
	useEffect(() => {
		if (webSocket.lastMessage?.type === 'maintenance_update') {
			const messageData = webSocket.lastMessage.data
			if (messageData && typeof messageData === 'object' && 
				'id' in messageData && 'type' in messageData && 'timestamp' in messageData) {
				const update: MaintenanceUpdateData = {
					id: String(messageData.id),
					type: String(messageData.type),
					timestamp: messageData.timestamp as string | Date,
					status: messageData.status ? String(messageData.status) : undefined,
					priority: messageData.priority ? String(messageData.priority) : undefined,
					unitId: messageData.unitId ? String(messageData.unitId) : undefined,
					assignedTo: messageData.assignedTo ? String(messageData.assignedTo) : undefined,
					metadata: messageData.metadata as unknown as Record<string, string | number | boolean | null> | undefined
				}
				setMaintenanceUpdates(prev => [update, ...prev.slice(0, 49)]) // Keep last 50 updates
			}
		}
	}, [webSocket.lastMessage])

	// Subscribe to maintenance updates when connected
	useEffect(() => {
		if (webSocket.isConnected && user?.id) {
			// Subscribe to user-specific maintenance updates
			webSocket.subscribe(`user:${user.id}`)

			// If user is an owner, also subscribe to owner-specific updates
			if (user.role === 'OWNER') {
				webSocket.subscribe(`owner:${user.id}`)
			}

			return () => {
				webSocket.unsubscribe(`user:${user.id}`)
				if (user.role === 'OWNER') {
					webSocket.unsubscribe(`owner:${user.id}`)
				}
			}
		}
		return undefined
	}, [webSocket, user?.id, user?.role])

	return {
		...webSocket,
		maintenanceUpdates,
		clearUpdates: () => setMaintenanceUpdates([])
	}
}
