/**
 * Edge function for selective cache purging
 * Allows targeted cache invalidation for specific routes or patterns
 */
export const config = {
  runtime: 'edge',
  regions: ['iad1', 'sfo1', 'lhr1', 'hnd1', 'bom1']
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { routes, tags, token } = await req.json()
    
    // Validate auth token
    if (token !== process.env.CACHE_PURGE_TOKEN) {
      return new Response('Unauthorized', { status: 401 })
    }

    const purgeResults = []

    // Purge specific routes
    if (routes && Array.isArray(routes)) {
      for (const route of routes) {
        try {
          // Use Vercel's purge API
          const purgeResponse = await fetch(`https://api.vercel.com/v1/purge`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              files: [route]
            })
          })

          purgeResults.push({
            route,
            success: purgeResponse.ok,
            status: purgeResponse.status
          })
        } catch (error) {
          purgeResults.push({
            route,
            success: false,
            error: error.message
          })
        }
      }
    }

    // Purge by cache tags (if supported)
    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        try {
          const purgeResponse = await fetch(`https://api.vercel.com/v1/purge`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              tags: [tag]
            })
          })

          purgeResults.push({
            tag,
            success: purgeResponse.ok,
            status: purgeResponse.status
          })
        } catch (error) {
          purgeResults.push({
            tag,
            success: false,
            error: error.message
          })
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      purged: purgeResults.length,
      results: purgeResults,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    })
  }
}