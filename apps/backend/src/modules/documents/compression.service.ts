import { Injectable, Logger } from '@nestjs/common'
import { PDFDocument } from 'pdf-lib'
import sharp from 'sharp'
import { performanceConfig } from '../../config/performance.config'

export interface CompressionResult {
	compressed: Buffer
	originalSize: number
	compressedSize: number
	ratio: number
}

@Injectable()
export class CompressionService {
	private readonly logger = new Logger(CompressionService.name)

	/**
	 * Compress document based on MIME type
	 * - Images: Sharp compression (70-80% reduction)
	 * - PDFs: pdf-lib compression (10-30% reduction)
	 * - Other: Return as-is
	 */
	async compressDocument(
		buffer: Buffer,
		mimeType: string
	): Promise<CompressionResult> {
		const originalSize = buffer.length

		this.logger.log(`Compressing file: type=${mimeType}, size=${originalSize}`)

		let compressed: Buffer

		try {
			if (mimeType.startsWith('image/')) {
				compressed = await this.compressImage(buffer, mimeType)
			} else if (mimeType === 'application/pdf') {
				compressed = await this.compressPDF(buffer)
			} else {
				// Unknown type: return as-is
				compressed = buffer
			}

			const compressedSize = compressed.length
			const ratio = compressedSize / originalSize

			this.logger.log(
				`Compression complete: original=${originalSize}, compressed=${compressedSize}, ratio=${(ratio * 100).toFixed(1)}%`
			)

			return {
				compressed,
				originalSize,
				compressedSize,
				ratio
			}
		} catch (error) {
			// If compression fails, return original buffer
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error'
			this.logger.warn(
				`Compression failed for ${mimeType}: ${errorMessage}. Returning original.`
			)

			return {
				compressed: buffer,
				originalSize,
				compressedSize: originalSize,
				ratio: 1.0
			}
		}
	}

	/**
	 * Compress image using Sharp
	 * - Resize to max 2048x2048 (maintains aspect ratio)
	 * - Convert to JPEG with 80% quality
	 * - Progressive rendering
	 * Target: 70-80% size reduction
	 */
	private async compressImage(
		buffer: Buffer,
		mimeType: string
	): Promise<Buffer> {
		this.logger.debug(`Compressing image: ${mimeType}`)

		return await sharp(buffer)
			.resize(2048, 2048, {
				fit: 'inside',
				withoutEnlargement: true
			})
			.jpeg({
				quality: 80,
				progressive: true,
				mozjpeg: true // Better compression
			})
			.toBuffer()
	}

	/**
	 * Compress PDFs by re-saving via pdf-lib using object streams.
	 * Skips work for empty or tiny files to avoid wasted CPU.
	 */
	private async compressPDF(buffer: Buffer): Promise<Buffer> {
		const { threshold } = performanceConfig.optimization.compression
		if (buffer.length === 0) {
			this.logger.debug('Empty PDF buffer received - skipping compression')
			return buffer
		}

		if (buffer.length < threshold) {
			this.logger.debug(
				`PDF size ${buffer.length}B below threshold ${threshold}B - skipping compression`
			)
			return buffer
		}

		this.logger.debug('Compressing PDF using pdf-lib object streams')

		const pdfDoc = await PDFDocument.load(buffer, {
			updateMetadata: false,
			ignoreEncryption: true
		})

		// Drop metadata that often bloats storage
		pdfDoc.setProducer('TenantFlow Compression Service')
		pdfDoc.setCreator('TenantFlow Compression Service')
		pdfDoc.setSubject('Compressed document')

		const compressedBytes = await pdfDoc.save({
			useObjectStreams: true,
			addDefaultPage: false,
			objectsPerTick: 20
		})

		return Buffer.from(compressedBytes)
	}
}
