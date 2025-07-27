import type { Express } from 'express'
import type { Hono } from 'hono'
import { handle } from 'hono/node-server'

export function setupHonoExpress(expressApp: Express, honoApp: Hono, basePath = '/api/hono') {
  // Mount Hono app at specified path
  expressApp.use(basePath, (req, res) => {
    return handle(honoApp, req, res)
  })
}