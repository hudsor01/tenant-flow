import {
	Injectable,
	NestInterceptor,
	ExecutionContext,
	CallHandler
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import type { Response } from 'express'

/**
 * PDF Response Type
 */
export interface PdfResponse {
	success: boolean
	contentType: 'application/pdf'
	disposition: 'attachment' | 'inline'
	filename: string
	buffer: Buffer
}

/**
 * PDF Response Interceptor
 * Automatically sets HTTP headers for PDF responses
 * 
 * Usage:
 * @UseInterceptors(PdfResponseInterceptor)
 * @Get('download')
 * async downloadLease(): Promise<PdfResponse> {
 *   return {
 *     success: true,
 *     contentType: 'application/pdf',
 *     disposition: 'attachment',
 *     filename: 'lease.pdf',
 *     buffer: pdfBuffer
 *   }
 * }
 */
@Injectable()
export class PdfResponseInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		return next.handle().pipe(
			map(data => {
				// Check if this is a PDF response
				if (
					data &&
					typeof data === 'object' &&
					'contentType' in data &&
					data.contentType === 'application/pdf'
				) {
					const response = context.switchToHttp().getResponse<Response>()
					const pdfData = data as PdfResponse

					// Set PDF-specific headers
					response.set({
						'Content-Type': 'application/pdf',
						'Content-Disposition': `${pdfData.disposition}; filename="${pdfData.filename}"`,
						'Cache-Control': 'no-cache, no-store, must-revalidate',
						Pragma: 'no-cache',
						Expires: '0'
					})

					// Return the buffer directly
					return pdfData.buffer
				}

				// Return data as-is if not a PDF response
				return data
			})
		)
	}
}
