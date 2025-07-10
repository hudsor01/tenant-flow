// Catch-all API route for NestJS backend
const handler = require('../../backend/dist/serverless.js')

module.exports = async (req, res) => {
  // Add the API prefix to match NestJS global prefix
  req.url = `/api/v1${req.url}`
  return handler(req, res)
}