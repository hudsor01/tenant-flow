import type { ConnectedAccount } from './core.js'
import type { IdentityVerificationRecord } from './identity.js'

/**
 * Connects identity verification metadata with the connected account row data.
 * This shape mirrors the payload returned by /api/v1/stripe/connect/account.
 */
export type ConnectedAccountWithIdentity = ConnectedAccount & {
	identityVerification: IdentityVerificationRecord
}
