'use server';

import { PostHog } from 'posthog-node';
import type { TenantFlowEvent } from '@/hooks/use-posthog';

// Initialize PostHog for server-side tracking
const posthog = new PostHog(
  process.env.NEXT_PUBLIC_POSTHOG_KEY!,
  { 
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    flushAt: 1, // Send immediately for server actions
    flushInterval: 0, // Don't batch on server
  }
);

/**
 * Track server-side events (for server actions, API routes)
 */
export async function trackServerSideEvent(
  eventName: TenantFlowEvent,
  userId?: string,
  properties?: Record<string, unknown>
): Promise<void> {
  try {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      console.warn('PostHog key not configured for server-side tracking');
      return;
    }

    posthog.capture({
      distinctId: userId || 'anonymous',
      event: eventName,
      properties: {
        ...properties,
        $lib: 'posthog-node',
        $lib_version: '4.0.1',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
      },
    });

    // Ensure event is sent immediately
    await posthog.flush();
  } catch (error) {
    console.error('Failed to track server-side event:', error);
  }
}

/**
 * Identify user for server-side tracking
 */
export async function identifyUser(
  userId: string,
  properties: Record<string, unknown>
): Promise<void> {
  try {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      return;
    }

    posthog.identify({
      distinctId: userId,
      properties: {
        ...properties,
        $set: properties, // Set user properties
      },
    });

    await posthog.flush();
  } catch (error) {
    console.error('Failed to identify user server-side:', error);
  }
}

/**
 * Shutdown PostHog client (for cleanup)
 */
export async function shutdownPostHog(): Promise<void> {
  await posthog.shutdown();
}