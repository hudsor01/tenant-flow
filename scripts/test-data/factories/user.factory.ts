import { faker } from '@faker-js/faker'
import { PrismaClient, UserRole, PlanType } from '@prisma/client'
import type { User, Subscription } from '@prisma/client'

export interface UserFactoryOptions {
  role?: UserRole
  hasSubscription?: boolean
  subscriptionPlan?: PlanType
  subscriptionStatus?: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'UNPAID'
  isEmailVerified?: boolean
  profile?: {
    completeName?: boolean
    hasPhone?: boolean
    hasBio?: boolean
    hasAvatar?: boolean
  }
}

export class UserFactory {
  constructor(private prisma: PrismaClient) {}

  async createUser(options: UserFactoryOptions = {}): Promise<User & { subscription?: Subscription }> {
    const {
      role = 'OWNER',
      hasSubscription = false,
      subscriptionPlan = 'FREE',
      subscriptionStatus = 'ACTIVE',
      isEmailVerified = true,
      profile = {}
    } = options

    // Generate consistent fake data
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    const domain = faker.helpers.arrayElement(['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'])
    
    const userData = {
      id: faker.string.uuid(),
      supabaseId: faker.string.uuid(),
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
      name: profile.completeName !== false ? `${firstName} ${lastName}` : firstName,
      phone: profile.hasPhone !== false ? faker.phone.number() : null,
      bio: profile.hasBio === true ? faker.lorem.sentence() : null,
      avatarUrl: profile.hasAvatar !== false ? faker.image.avatar() : null,
      role,
      stripeCustomerId: hasSubscription ? `cus_${faker.string.alphanumeric(14)}` : null,
      createdAt: faker.date.past({ years: 2 }),
      updatedAt: new Date()
    }

    const user = await this.prisma.user.create({
      data: userData
    })

    let subscription: Subscription | undefined

    if (hasSubscription && role === 'OWNER') {
      const startDate = faker.date.past({ years: 1 })
      const endDate = new Date(startDate)
      endDate.setMonth(startDate.getMonth() + 1)

      subscription = await this.prisma.subscription.create({
        data: {
          id: faker.string.uuid(),
          userId: user.id,
          status: subscriptionStatus,
          planType: subscriptionPlan,
          startDate,
          endDate: subscriptionStatus === 'CANCELED' ? faker.date.recent() : endDate,
          cancelledAt: subscriptionStatus === 'CANCELED' ? faker.date.recent() : null,
          stripeCustomerId: user.stripeCustomerId,
          stripeSubscriptionId: `sub_${faker.string.alphanumeric(14)}`,
          stripePriceId: this.getPriceIdForPlan(subscriptionPlan),
          planId: `plan_${subscriptionPlan.toLowerCase()}`,
          billingPeriod: 'monthly',
          currentPeriodStart: startDate,
          currentPeriodEnd: endDate,
          trialStart: subscriptionStatus === 'TRIALING' ? faker.date.recent() : null,
          trialEnd: subscriptionStatus === 'TRIALING' ? faker.date.future() : null,
          cancelAtPeriodEnd: subscriptionStatus === 'CANCELED'
        }
      })

      // Create user preferences
      await this.prisma.userPreferences.create({
        data: {
          userId: user.id,
          enableReminders: faker.datatype.boolean(),
          daysBeforeDue: faker.number.int({ min: 1, max: 7 }),
          enableOverdueReminders: faker.datatype.boolean(),
          overdueGracePeriod: faker.number.int({ min: 1, max: 14 }),
          autoSendReminders: faker.datatype.boolean(),
          emailNotifications: faker.datatype.boolean(),
          smsNotifications: faker.datatype.boolean(),
          pushNotifications: faker.datatype.boolean(),
          defaultDashboardView: faker.helpers.arrayElement(['overview', 'properties', 'tenants', 'maintenance']),
          showWelcomeMessage: faker.datatype.boolean()
        }
      })

      // Create feature access based on plan
      await this.prisma.userFeatureAccess.create({
        data: {
          userId: user.id,
          ...this.getFeatureAccessForPlan(subscriptionPlan),
          updateReason: `Initial setup for ${subscriptionPlan} plan`
        }
      })
    }

    return { ...user, subscription }
  }

  async createLandlord(options: Omit<UserFactoryOptions, 'role'> = {}): Promise<User & { subscription?: Subscription }> {
    return this.createUser({ ...options, role: 'OWNER' })
  }

  async createTenant(options: Omit<UserFactoryOptions, 'role' | 'hasSubscription'> = {}): Promise<User> {
    const result = await this.createUser({ 
      ...options, 
      role: 'TENANT',
      hasSubscription: false 
    })
    return result
  }

  async createManager(options: Omit<UserFactoryOptions, 'role'> = {}): Promise<User & { subscription?: Subscription }> {
    return this.createUser({ ...options, role: 'MANAGER' })
  }

  async createAdmin(options: Omit<UserFactoryOptions, 'role'> = {}): Promise<User> {
    const result = await this.createUser({ 
      ...options, 
      role: 'ADMIN',
      hasSubscription: false,
      profile: {
        completeName: true,
        hasPhone: true,
        hasBio: true,
        hasAvatar: true
      }
    })
    return result
  }

  private getPriceIdForPlan(plan: PlanType): string {
    const priceIds = {
      FREE: 'price_free',
      STARTER: 'price_1NqjIvGrz8KkRPNH4H7VmKLh',
      GROWTH: 'price_1NqjJ9Grz8KkRPNH0E3q6H8M',
      ENTERPRISE: 'price_1NqjJQGrz8KkRPNHvK4L6S9P'
    }
    return priceIds[plan] || priceIds.FREE
  }

  private getFeatureAccessForPlan(plan: PlanType) {
    const featureMap = {
      FREE: {
        canExportData: false,
        canAccessAdvancedAnalytics: false,
        canUseBulkOperations: false,
        canAccessAPI: false,
        canInviteTeamMembers: false,
        maxProperties: 1,
        maxUnitsPerProperty: 5,
        maxStorageGB: 0.1,
        hasPrioritySupport: false,
        canUsePremiumIntegrations: false
      },
      STARTER: {
        canExportData: true,
        canAccessAdvancedAnalytics: false,
        canUseBulkOperations: false,
        canAccessAPI: false,
        canInviteTeamMembers: false,
        maxProperties: 5,
        maxUnitsPerProperty: 20,
        maxStorageGB: 1.0,
        hasPrioritySupport: false,
        canUsePremiumIntegrations: false
      },
      GROWTH: {
        canExportData: true,
        canAccessAdvancedAnalytics: true,
        canUseBulkOperations: true,
        canAccessAPI: true,
        canInviteTeamMembers: true,
        maxProperties: 25,
        maxUnitsPerProperty: 100,
        maxStorageGB: 10.0,
        hasPrioritySupport: true,
        canUsePremiumIntegrations: true
      },
      ENTERPRISE: {
        canExportData: true,
        canAccessAdvancedAnalytics: true,
        canUseBulkOperations: true,
        canAccessAPI: true,
        canInviteTeamMembers: true,
        maxProperties: 999,
        maxUnitsPerProperty: 999,
        maxStorageGB: 100.0,
        hasPrioritySupport: true,
        canUsePremiumIntegrations: true
      }
    }
    return featureMap[plan] || featureMap.FREE
  }

  // Create users with realistic distribution
  async createRealisticUserSet(count: number = 50): Promise<{
    landlords: (User & { subscription?: Subscription })[]
    tenants: User[]
    managers: (User & { subscription?: Subscription })[]
    admins: User[]
  }> {
    const landlordCount = Math.floor(count * 0.6) // 60% landlords
    const tenantCount = Math.floor(count * 0.3)   // 30% tenants
    const managerCount = Math.floor(count * 0.08) // 8% managers
    const adminCount = Math.max(1, Math.floor(count * 0.02)) // 2% admins, minimum 1

    const landlords = await Promise.all(
      Array.from({ length: landlordCount }, (_, index) => {
        const planDistribution = index < landlordCount * 0.4 ? 'FREE' :
                                index < landlordCount * 0.7 ? 'STARTER' :
                                index < landlordCount * 0.9 ? 'GROWTH' : 'ENTERPRISE'
        
        return this.createLandlord({
          hasSubscription: true,
          subscriptionPlan: planDistribution as PlanType,
          subscriptionStatus: faker.helpers.arrayElement(['ACTIVE', 'ACTIVE', 'ACTIVE', 'TRIALING', 'PAST_DUE'])
        })
      })
    )

    const tenants = await Promise.all(
      Array.from({ length: tenantCount }, () => this.createTenant())
    )

    const managers = await Promise.all(
      Array.from({ length: managerCount }, () => 
        this.createManager({
          hasSubscription: true,
          subscriptionPlan: 'GROWTH'
        })
      )
    )

    const admins = await Promise.all(
      Array.from({ length: adminCount }, () => this.createAdmin())
    )

    return { landlords, tenants, managers, admins }
  }
}