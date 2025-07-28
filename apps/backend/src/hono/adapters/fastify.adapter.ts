/// <reference lib="dom" />
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import type { Hono } from 'hono'

export function honoFastifyAdapter(app: Hono) {
  return async (fastify: FastifyInstance, opts: { prefix?: string } = {}) => {
    const prefix = opts.prefix || ''
    const route = prefix ? `${prefix}/*` : '/*'
    
    // Add a catch-all route for Hono
    fastify.all(route, async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Build the full URL
        const url = new URL(request.url, `http://${request.hostname}`)
        
        // Create Web API Request from Fastify request
        const headers = new Headers()
        Object.entries(request.headers).forEach(([key, value]) => {
          if (value) {
            if (Array.isArray(value)) {
              value.forEach(v => headers.append(key, v))
            } else {
              headers.set(key, value)
            }
          }
        })

        // Get body based on method
        let body: BodyInit | undefined
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          if (request.body) {
            body = JSON.stringify(request.body)
            headers.set('content-type', 'application/json')
          }
        }

        // Create Web API Request
        const webRequest = new Request(url.toString(), {
          method: request.method,
          headers,
          body
        })

        // Process with Hono
        const webResponse = await app.fetch(webRequest)

        // Set status code
        reply.code(webResponse.status)

        // Copy headers from Hono response to Fastify reply
        webResponse.headers.forEach((value, key) => {
          reply.header(key, value)
        })

        // Send response body
        const responseBody = await webResponse.text()
        return reply.send(responseBody)
      } catch (error) {
        console.error('Error in Hono Fastify adapter:', error)
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })
  }
}