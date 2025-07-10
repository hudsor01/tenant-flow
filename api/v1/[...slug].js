// Catch-all API route for NestJS backend
const handler = require('../../backend/dist/serverless.js')

module.exports = async (req, res) => {
  // The URL already includes /api/v1 from the file path
  // No need to add it again since NestJS already expects it
  return handler(req, res)
}