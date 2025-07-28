import type { Express } from 'express'
import type { Hono } from 'hono'
import { serve } from '@hono/node-server'
import type { IncomingMessage, ServerResponse } from 'http'

export function setupHonoExpress(expressApp: Express, honoApp: Hono<any>, basePath = '/api/hono') {
  // Mount Hono app at specified path
  expressApp.use(basePath, async (req, res) => {
    // Convert Express request to standard Request object
    const url = new URL(req.url || '/', `http://${req.headers.host}`)
    const request = new Request(url, {
      method: req.method,
      headers: req.headers as HeadersInit,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined
    })
    
    // Call Hono's fetch handler directly
    const response = await honoApp.fetch(request)
    
    // Copy response to Express response
    res.status(response.status)
    response.headers.forEach((value, key) => {
      res.setHeader(key, value)
    })
    
    if (response.body) {
      const reader = response.body.getReader()
      const pump = async () => {
        const { done, value } = await reader.read()
        if (done) return
        res.write(value)
        await pump()
      }
      await pump()
    }
    
    res.end()
  })
}