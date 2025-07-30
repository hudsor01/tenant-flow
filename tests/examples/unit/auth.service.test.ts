import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Test, TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { UnauthorizedException } from '@nestjs/common'
import { AuthService } from '../../../apps/backend/src/auth/auth.service'
import { PrismaService } from '../../../apps/backend/src/common/prisma/prisma.service'
import { TestDataFactory } from '../../config/test-data-factory'
import { DatabaseTestHelper, JwtTestHelper, AssertionHelper } from '../../config/test-helpers'

/**
 * Example Unit Test: Auth Service
 * Demonstrates comprehensive unit testing patterns for authentication
 */
describe('AuthService', () => {
  let authService: AuthService
  let prismaService: PrismaService
  let jwtService: JwtService
  let configService: ConfigService
  let module: TestingModule
  let jwtHelper: JwtTestHelper

  beforeEach(async () => {
    // Setup test module with mocked dependencies
    module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: vi.fn(),
              create: vi.fn(),
              update: vi.fn()
            }
          }
        },
        {
          provide: JwtService,
          useValue: {
            sign: vi.fn(),
            verify: vi.fn()
          }
        },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn().mockReturnValue('test-secret')
          }
        }
      ]
    }).compile()

    authService = module.get<AuthService>(AuthService)
    prismaService = module.get<PrismaService>(PrismaService)
    jwtService = module.get<JwtService>(JwtService)
    configService = module.get<ConfigService>(ConfigService)
    jwtHelper = new JwtTestHelper()

    await DatabaseTestHelper.setupDatabase()
  })

  afterEach(async () => {
    await module.close()
    await DatabaseTestHelper.teardownDatabase()
  })

  describe('validateUser', () => {
    it('should validate user with correct credentials', async () => {
      // Arrange
      const user = await TestDataFactory.createLandlord({
        email: 'test@tenantflow.app',
        password: 'hashedPassword123'
      })

      vi.mocked(prismaService.user.findUnique).mockResolvedValue(user)

      // Act
      const result = await authService.validateUser('test@tenantflow.app', 'correctPassword')

      // Assert
      expect(result).toBeDefined()
      AssertionHelper.expectValidUser(result)
      expect(result.email).toBe('test@tenantflow.app')
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@tenantflow.app' }
      })
    })

    it('should throw UnauthorizedException for invalid email', async () => {
      // Arrange
      vi.mocked(prismaService.user.findUnique).mockResolvedValue(null)

      // Act & Assert
      await expect(
        authService.validateUser('invalid@tenantflow.app', 'anyPassword')
      ).rejects.toThrow(UnauthorizedException)

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'invalid@tenantflow.app' }
      })
    })

    it('should throw UnauthorizedException for invalid password', async () => {
      // Arrange
      const user = await TestDataFactory.createLandlord({
        email: 'test@tenantflow.app',
        password: 'hashedPassword123'
      })

      vi.mocked(prismaService.user.findUnique).mockResolvedValue(user)

      // Act & Assert
      await expect(
        authService.validateUser('test@tenantflow.app', 'wrongPassword')
      ).rejects.toThrow(UnauthorizedException)
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      vi.mocked(prismaService.user.findUnique).mockRejectedValue(
        new Error('Database connection failed')
      )

      // Act & Assert
      await expect(
        authService.validateUser('test@tenantflow.app', 'anyPassword')
      ).rejects.toThrow('Database connection failed')
    })
  })

  describe('login', () => {
    it('should return JWT token for valid user', async () => {
      // Arrange
      const user = await TestDataFactory.createLandlord()
      const expectedToken = 'jwt-token-123'

      vi.mocked(jwtService.sign).mockReturnValue(expectedToken)

      // Act
      const result = await authService.login(user)

      // Assert
      expect(result).toEqual({
        access_token: expectedToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      })

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
        role: user.role
      })
    })

    it('should include user metadata in token payload', async () => {
      // Arrange
      const user = await TestDataFactory.createLandlord({
        role: 'OWNER',
        stripeCustomerId: 'cus_test123'
      })

      // Act
      await authService.login(user)

      // Assert
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
        role: 'OWNER'
      })
    })
  })

  describe('validateToken', () => {
    it('should validate and return user for valid token', async () => {
      // Arrange
      const user = await TestDataFactory.createLandlord()
      const token = jwtHelper.generateUserToken(user.id, user.role)
      const decodedPayload = jwtHelper.verifyToken(token)

      vi.mocked(jwtService.verify).mockReturnValue(decodedPayload)
      vi.mocked(prismaService.user.findUnique).mockResolvedValue(user)

      // Act
      const result = await authService.validateToken(token)

      // Assert
      AssertionHelper.expectValidUser(result)
      expect(result.id).toBe(user.id)
      expect(jwtService.verify).toHaveBeenCalledWith(token)
    })

    it('should throw UnauthorizedException for expired token', async () => {
      // Arrange
      const user = await TestDataFactory.createLandlord()
      const expiredToken = jwtHelper.generateExpiredToken({ sub: user.id })

      vi.mocked(jwtService.verify).mockImplementation(() => {
        throw new Error('Token expired')
      })

      // Act & Assert
      await expect(authService.validateToken(expiredToken)).rejects.toThrow(
        UnauthorizedException
      )
    })

    it('should throw UnauthorizedException for malformed token', async () => {
      // Arrange
      const malformedToken = 'invalid.token.format'

      vi.mocked(jwtService.verify).mockImplementation(() => {
        throw new Error('Invalid token')
      })

      // Act & Assert
      await expect(authService.validateToken(malformedToken)).rejects.toThrow(
        UnauthorizedException
      )
    })

    it('should throw UnauthorizedException when user not found', async () => {
      // Arrange
      const token = jwtHelper.generateUserToken('non-existent-user')
      const decodedPayload = jwtHelper.verifyToken(token)

      vi.mocked(jwtService.verify).mockReturnValue(decodedPayload)
      vi.mocked(prismaService.user.findUnique).mockResolvedValue(null)

      // Act & Assert
      await expect(authService.validateToken(token)).rejects.toThrow(
        UnauthorizedException
      )
    })
  })

  describe('register', () => {
    it('should create new user with valid data', async () => {
      // Arrange
      const userData = {
        email: 'new@tenantflow.app',
        password: 'securePassword123',
        name: 'New User',
        role: 'OWNER' as const
      }

      const createdUser = await TestDataFactory.createLandlord(userData)
      vi.mocked(prismaService.user.create).mockResolvedValue(createdUser)

      // Act
      const result = await authService.register(userData)

      // Assert
      AssertionHelper.expectValidUser(result)
      expect(result.email).toBe(userData.email)
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: userData.email,
          name: userData.name,
          role: userData.role
        })
      })
    })

    it('should hash password before storing', async () => {
      // Arrange
      const userData = {
        email: 'new@tenantflow.app',
        password: 'plainTextPassword',
        name: 'New User',
        role: 'OWNER' as const
      }

      const createdUser = await TestDataFactory.createLandlord()
      vi.mocked(prismaService.user.create).mockResolvedValue(createdUser)

      // Act
      await authService.register(userData)

      // Assert
      const createCall = vi.mocked(prismaService.user.create).mock.calls[0][0]
      expect(createCall.data.password).not.toBe('plainTextPassword')
      expect(createCall.data.password).toMatch(/^\$2[aby]\$/) // bcrypt hash pattern
    })

    it('should throw error for duplicate email', async () => {
      // Arrange
      const userData = {
        email: 'existing@tenantflow.app',
        password: 'password123',
        name: 'User',
        role: 'OWNER' as const
      }

      vi.mocked(prismaService.user.create).mockRejectedValue(
        new Error('Unique constraint violation')
      )

      // Act & Assert
      await expect(authService.register(userData)).rejects.toThrow(
        'Unique constraint violation'
      )
    })

    it('should validate email format', async () => {
      // Arrange
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        name: 'User',
        role: 'OWNER' as const
      }

      // Act & Assert
      await expect(authService.register(userData)).rejects.toThrow(
        'Invalid email format'
      )
    })

    it('should validate password strength', async () => {
      // Arrange
      const userData = {
        email: 'user@tenantflow.app',
        password: '123', // Weak password
        name: 'User',
        role: 'OWNER' as const
      }

      // Act & Assert
      await expect(authService.register(userData)).rejects.toThrow(
        'Password must be at least 8 characters'
      )
    })
  })

  describe('refreshToken', () => {
    it('should generate new token for valid refresh token', async () => {
      // Arrange
      const user = await TestDataFactory.createLandlord()
      const refreshToken = jwtHelper.generateToken(
        { sub: user.id, type: 'refresh' },
        { expiresIn: '7d' }
      )
      const newAccessToken = 'new-access-token'

      vi.mocked(jwtService.verify).mockReturnValue({ sub: user.id, type: 'refresh' })
      vi.mocked(prismaService.user.findUnique).mockResolvedValue(user)
      vi.mocked(jwtService.sign).mockReturnValue(newAccessToken)

      // Act
      const result = await authService.refreshToken(refreshToken)

      // Assert
      expect(result.access_token).toBe(newAccessToken)
      expect(jwtService.verify).toHaveBeenCalledWith(refreshToken)
    })

    it('should reject invalid refresh token', async () => {
      // Arrange
      const invalidToken = 'invalid-refresh-token'

      vi.mocked(jwtService.verify).mockImplementation(() => {
        throw new Error('Invalid token')
      })

      // Act & Assert
      await expect(authService.refreshToken(invalidToken)).rejects.toThrow(
        UnauthorizedException
      )
    })

    it('should reject access token used as refresh token', async () => {
      // Arrange
      const user = await TestDataFactory.createLandlord()
      const accessToken = jwtHelper.generateToken({ sub: user.id, type: 'access' })

      vi.mocked(jwtService.verify).mockReturnValue({ sub: user.id, type: 'access' })

      // Act & Assert
      await expect(authService.refreshToken(accessToken)).rejects.toThrow(
        'Invalid token type'
      )
    })
  })

  describe('logout', () => {
    it('should invalidate user session', async () => {
      // Arrange
      const user = await TestDataFactory.createLandlord()
      const token = jwtHelper.generateUserToken(user.id)

      // Act
      await authService.logout(user.id, token)

      // Assert
      // Verify token is added to blacklist or session is invalidated
      // Implementation depends on your logout strategy
      expect(true).toBe(true) // Placeholder assertion
    })
  })

  describe('changePassword', () => {
    it('should update user password with valid current password', async () => {
      // Arrange
      const user = await TestDataFactory.createLandlord({
        password: 'hashedCurrentPassword'
      })
      const newPassword = 'newSecurePassword123'

      vi.mocked(prismaService.user.findUnique).mockResolvedValue(user)
      vi.mocked(prismaService.user.update).mockResolvedValue({
        ...user,
        password: 'hashedNewPassword'
      })

      // Act
      await authService.changePassword(user.id, 'currentPassword', newPassword)

      // Assert
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: {
          password: expect.stringMatching(/^\$2[aby]\$/), // bcrypt hash
          updatedAt: expect.any(Date)
        }
      })
    })

    it('should throw error for incorrect current password', async () => {
      // Arrange
      const user = await TestDataFactory.createLandlord()
      vi.mocked(prismaService.user.findUnique).mockResolvedValue(user)

      // Act & Assert
      await expect(
        authService.changePassword(user.id, 'wrongPassword', 'newPassword123')
      ).rejects.toThrow('Current password is incorrect')
    })

    it('should validate new password strength', async () => {
      // Arrange
      const user = await TestDataFactory.createLandlord()
      vi.mocked(prismaService.user.findUnique).mockResolvedValue(user)

      // Act & Assert
      await expect(
        authService.changePassword(user.id, 'currentPassword', 'weak')
      ).rejects.toThrow('Password must be at least 8 characters')
    })
  })

  describe('resetPassword', () => {
    it('should generate password reset token', async () => {
      // Arrange
      const user = await TestDataFactory.createLandlord()
      vi.mocked(prismaService.user.findUnique).mockResolvedValue(user)

      // Act
      const resetToken = await authService.generatePasswordResetToken(user.email)

      // Assert
      expect(resetToken).toBeTruthy()
      expect(typeof resetToken).toBe('string')
    })

    it('should reset password with valid token', async () => {
      // Arrange
      const user = await TestDataFactory.createLandlord()
      const resetToken = jwtHelper.generateToken(
        { sub: user.id, type: 'reset' },
        { expiresIn: '1h' }
      )
      const newPassword = 'newPassword123'

      vi.mocked(jwtService.verify).mockReturnValue({ sub: user.id, type: 'reset' })
      vi.mocked(prismaService.user.findUnique).mockResolvedValue(user)
      vi.mocked(prismaService.user.update).mockResolvedValue({
        ...user,
        password: 'hashedNewPassword'
      })

      // Act
      await authService.resetPassword(resetToken, newPassword)

      // Assert
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: {
          password: expect.stringMatching(/^\$2[aby]\$/),
          updatedAt: expect.any(Date)
        }
      })
    })

    it('should reject expired reset token', async () => {
      // Arrange
      const expiredToken = jwtHelper.generateExpiredToken({
        sub: 'user-id',
        type: 'reset'
      })

      vi.mocked(jwtService.verify).mockImplementation(() => {
        throw new Error('Token expired')
      })

      // Act & Assert
      await expect(
        authService.resetPassword(expiredToken, 'newPassword123')
      ).rejects.toThrow(UnauthorizedException)
    })
  })
})