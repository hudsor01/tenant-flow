import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface WebVitalsPayload {
  name: string;
  value: number;
  id: string;
  delta: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  url: string;
  userAgent: string;
  connectionType?: string;
  timestamp: number;
}

export async function POST(request: NextRequest) {
  try {
    const payload: WebVitalsPayload = await request.json();
    
    // Validate payload
    if (!payload.name || !payload.value || !payload.url) {
      return NextResponse.json(
        { error: 'Invalid payload' }, 
        { status: 400 }
      );
    }

    // In production, metrics are sent to:
    // 1. Vercel Analytics for performance tracking
    // 2. PostHog for product analytics
    // 3. DataDog for infrastructure monitoring

    // Log critical performance issues
    if (payload.rating === 'poor') {
      console.warn(`[WebVitals] Poor ${payload.name}: ${payload.value}ms on ${payload.url}`);
    } else {
      console.log('Web Vitals Metric:', {
        name: payload.name,
        value: payload.value,
        rating: payload.rating,
        url: new URL(payload.url).pathname,
      });
    }

    // Send to external services in production
    if (process.env.NODE_ENV === 'production') {
      await Promise.allSettled([
        sendToVercelAnalytics(payload),
        sendToPostHog(payload),
        sendToDataDog(payload),
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Web Vitals API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// External service integrations
async function sendToVercelAnalytics(payload: WebVitalsPayload) {
  // Vercel Analytics integration
  try {
    // This would typically be handled client-side, but we can also track server-side
    console.log(`[Vercel Analytics] ${payload.name}: ${payload.value}ms`);
  } catch (error) {
    console.error('[WebVitals] Failed to send to Vercel Analytics:', error);
  }
}

async function sendToPostHog(payload: WebVitalsPayload) {
  if (!process.env.POSTHOG_API_KEY) return;
  
  try {
    await fetch('https://app.posthog.com/capture/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: process.env.POSTHOG_API_KEY,
        event: 'web_vital_measurement',
        properties: {
          metric_name: payload.name,
          metric_value: payload.value,
          metric_rating: payload.rating,
          url: payload.url,
          user_agent: payload.userAgent,
          connection_type: payload.connectionType,
        },
        timestamp: new Date(payload.timestamp).toISOString(),
      }),
    });
  } catch (error) {
    console.error('[WebVitals] Failed to send to PostHog:', error);
  }
}

async function sendToDataDog(payload: WebVitalsPayload) {
  if (!process.env.DATADOG_API_KEY) return;
  
  try {
    await fetch('https://api.datadoghq.com/api/v1/series', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': process.env.DATADOG_API_KEY,
      },
      body: JSON.stringify({
        series: [
          {
            metric: `web_vitals.${payload.name.toLowerCase()}`,
            points: [[Math.floor(payload.timestamp / 1000), payload.value]],
            tags: [
              `rating:${payload.rating}`,
              `url:${new URL(payload.url).pathname}`,
            ],
          },
        ],
      }),
    });
  } catch (error) {
    console.error('[WebVitals] Failed to send to DataDog:', error);
  }
}