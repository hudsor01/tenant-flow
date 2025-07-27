import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { HTTPException } from 'hono/http-exception'
import type { AuthService } from '../../auth/auth.service'
import type { EmailService } from '../../email/email.service'
import { authMiddleware, requireAuth, type Variables } from '../middleware/auth.middleware'
import {
  updateProfileSchema,
  profileUpdateResponseSchema,
  sessionSchema,
  userSchema
} from '../schemas/auth.schemas'
// ApiError type is handled by handleRouteError function
import { handleRouteError } from '../utils/error-handler'

export const createAuthRoutes = (
  authService: AuthService,
  emailService: EmailService
) => {
  const app = new Hono<{ Variables: Variables }>()

  // Apply auth middleware to all routes
  app.use('*', authMiddleware)

  // GET /auth/me - Get current user
  app.get('/me', requireAuth, async (c) => {
    const user = c.get('user')!
    
    try {
      const userData = await authService.findUserById(user.id)
      if (!userData) {
        throw new HTTPException(404, { message: 'User not found' })
      }

      const response = userSchema.parse({
        id: userData.id,
        email: userData.email,
        name: userData.name,
        avatarUrl: userData.avatarUrl,
        phone: userData.phone,
        role: userData.role,
        emailVerified: userData.emailVerified,
        createdAt: userData.createdAt.toISOString(),
        updatedAt: userData.updatedAt.toISOString()
      })

      return c.json(response)
    } catch (error) {
      return handleRouteError(error, c)
    }
  })

  // PUT /auth/profile - Update profile
  app.put(
    '/profile',
    requireAuth,
    zValidator('json', updateProfileSchema),
    async (c) => {
      const user = c.get('user')!
      const input = c.req.valid('json')

      try {
        const updatedUser = await authService.updateProfile(user.id, input)
        
        const response = profileUpdateResponseSchema.parse({
          message: 'Profile updated successfully',
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            avatarUrl: updatedUser.avatarUrl,
            phone: updatedUser.phone,
            role: updatedUser.role,
            emailVerified: updatedUser.emailVerified,
            createdAt: updatedUser.createdAt.toISOString(),
            updatedAt: updatedUser.updatedAt.toISOString()
          }
        })

        return c.json(response)
      } catch (error) {
        return handleRouteError(error, c)
      }
    }
  )

  // GET /auth/session - Validate session
  app.get('/session', requireAuth, async (c) => {
    const user = c.get('user')!

    try {
      const validatedUser = await authService.validateSession(user.id)
      
      const response = sessionSchema.parse({
        isValid: true,
        user: {
          id: validatedUser.id,
          email: validatedUser.email,
          name: validatedUser.name,
          avatarUrl: validatedUser.avatarUrl,
          phone: validatedUser.phone,
          role: validatedUser.role,
          emailVerified: validatedUser.emailVerified,
          createdAt: validatedUser.createdAt.toISOString(),
          updatedAt: validatedUser.updatedAt.toISOString()
        },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      })

      return c.json(response)
    } catch (error) {
      return handleRouteError(error, c)
    }
  })

  // POST /auth/welcome-email - Send welcome email
  app.post(
    '/welcome-email',
    requireAuth,
    zValidator('json', userSchema.pick({ name: true, email: true })),
    async (c) => {
      const input = c.req.valid('json')

      try {
        const result = await emailService.sendWelcomeEmail({
          to: input.email,
          name: input.name
        })

        return c.json({
          success: true,
          message: 'Welcome email sent successfully',
          messageId: result.messageId
        })
      } catch (error) {
        return handleRouteError(error, c)
      }
    }
  )

  return app
}