/**
 * Supabase Realtime Presence Hooks
 * Track online users and presence state
 */

'use client'

import { createClient } from '@/lib/supabase/client'
import { logger } from '@repo/shared/lib/frontend-logger'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

interface PresenceState {
	userId: string
	username?: string
	online_at: string
	[key: string]: unknown
}

/**
 * Hook for tracking presence (online users)
 * Useful for collaborative features, chat, live indicators
 *
 * Example:
 * const { presences, track } = useRealtimePresence('room:123')
 * useEffect(() => {
 *   track({ userId: user.id, username: user.name })
 * }, [user])
 */
export function useRealtimePresence(channelName: string) {
	const [presences, setPresences] = useState<Record<string, PresenceState[]>>(
		{}
	)
	const [channel, setChannel] = useState<RealtimeChannel | null>(null)
	const supabase = createClient()

	useEffect(() => {
		const presenceChannel = supabase.channel(channelName, {
			config: { presence: { key: 'user' } }
		})

		presenceChannel
			.on('presence', { event: 'sync' }, () => {
				const state = presenceChannel.presenceState<PresenceState>()
				setPresences(state)
				logger.debug('Presence synced', {
					action: 'presence_sync',
					metadata: { channel: channelName, count: Object.keys(state).length }
				})
			})
			.on('presence', { event: 'join' }, ({ key, newPresences }) => {
				logger.debug('User joined', {
					action: 'presence_join',
					metadata: { channel: channelName, key, count: newPresences.length }
				})
			})
			.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
				logger.debug('User left', {
					action: 'presence_leave',
					metadata: { channel: channelName, key, count: leftPresences.length }
				})
			})
			.subscribe(async status => {
				if (status === 'SUBSCRIBED') {
					logger.info('Presence channel subscribed', {
						action: 'presence_subscribed',
						metadata: { channel: channelName }
					})
				}
			})

		setChannel(presenceChannel)

		return () => {
			presenceChannel.unsubscribe()
			logger.debug('Presence channel unsubscribed', {
				action: 'presence_cleanup',
				metadata: { channel: channelName }
			})
		}
	}, [channelName, supabase])

	const track = async (state: Partial<PresenceState>) => {
		if (!channel) return

		await channel.track({
			online_at: new Date().toISOString(),
			...state
		})
	}

	const untrack = async () => {
		if (!channel) return
		await channel.untrack()
	}

	// Get flattened list of all present users
	const onlineUsers = Object.values(presences).flat()

	return {
		presences,
		onlineUsers,
		track,
		untrack,
		count: onlineUsers.length
	}
}

/**
 * Hook for tracking typing indicators
 * Common pattern for chat or collaborative editing
 *
 * Example:
 * const { typingUsers, setTyping } = useTypingIndicator('room:123')
 * <Input onChange={() => setTyping(true)} onBlur={() => setTyping(false)} />
 */
export function useTypingIndicator(channelName: string, userId: string) {
	const [typingUsers, setTypingUsers] = useState<string[]>([])
	const [channel, setChannel] = useState<RealtimeChannel | null>(null)
	const supabase = createClient()

	useEffect(() => {
		const typingChannel = supabase.channel(channelName)

		typingChannel
			.on('broadcast', { event: 'typing' }, ({ payload }) => {
				const { userId: typingUserId, isTyping } = payload as {
					userId: string
					isTyping: boolean
				}

				setTypingUsers(prev => {
					if (isTyping && !prev.includes(typingUserId)) {
						return [...prev, typingUserId]
					} else if (!isTyping) {
						return prev.filter(id => id !== typingUserId)
					}
					return prev
				})
			})
			.subscribe()

		setChannel(typingChannel)

		return () => {
			typingChannel.unsubscribe()
		}
	}, [channelName, supabase])

	const setTyping = (isTyping: boolean) => {
		if (!channel) return

		channel.send({
			type: 'broadcast',
			event: 'typing',
			payload: { userId, isTyping }
		})
	}

	return {
		typingUsers: typingUsers.filter(id => id !== userId), // Exclude self
		setTyping
	}
}
