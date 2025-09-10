import { LoggerService } from '@nestjs/common'

/**
 * Silent logger for tests - prevents console spam during test runs
 * Still maintains the interface expected by test mocks
 */
export class SilentLogger implements LoggerService {
	log(): void {}
	error(): void {}
	warn(): void {}
	debug(): void {}
	verbose(): void {}
	info(): void {} // Add info method for compatibility
}