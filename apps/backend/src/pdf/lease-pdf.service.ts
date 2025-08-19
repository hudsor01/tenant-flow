import { Injectable } from '@nestjs/common'
import type { PDFGenerationResult } from './pdf-generator.service'

/**
 * Lease PDF service - temporarily simplified for compilation
 * Will be fully restored after basic build is working
 */
@Injectable()
export class LeasePDFService {
	async generateLeasePdf(
		_leaseId?: string,
		_userId?: string,
		_options?: Record<string, unknown>
	): Promise<PDFGenerationResult> {
		return {
			filename: 'lease.pdf',
			mimeType: 'application/pdf',
			size: 0,
			buffer: Buffer.from([])
		}
	}
}