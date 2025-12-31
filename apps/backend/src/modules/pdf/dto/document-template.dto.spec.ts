import {
	documentTemplatePayloadSchema,
	templateDefinitionSchema,
	safeCssColorSchema,
	brandingSchema
} from './document-template.dto'

describe('Document Template DTOs', () => {
	describe('safeCssColorSchema', () => {
		it('should accept valid hex colors', () => {
			expect(() => safeCssColorSchema.parse('#fff')).not.toThrow()
			expect(() => safeCssColorSchema.parse('#ffffff')).not.toThrow()
			expect(() => safeCssColorSchema.parse('#FF5500')).not.toThrow()
			expect(() => safeCssColorSchema.parse('#ff550088')).not.toThrow()
		})

		it('should accept valid OKLCH colors', () => {
			expect(() => safeCssColorSchema.parse('oklch(0.35 0.08 250)')).not.toThrow()
			expect(() => safeCssColorSchema.parse('oklch(0.5 0.1 180)')).not.toThrow()
			expect(() => safeCssColorSchema.parse('oklch(0.7 0.05 90)')).not.toThrow()
		})

		it('should accept valid named colors', () => {
			expect(() => safeCssColorSchema.parse('red')).not.toThrow()
			expect(() => safeCssColorSchema.parse('steelblue')).not.toThrow()
			expect(() => safeCssColorSchema.parse('darkslategray')).not.toThrow()
		})

		it('should reject CSS injection attempts', () => {
			expect(() =>
				safeCssColorSchema.parse('red; background: url(evil.com)')
			).toThrow()
			expect(() => safeCssColorSchema.parse('expression(alert(1))')).toThrow()
			expect(() => safeCssColorSchema.parse('url("javascript:alert(1)")')).toThrow()
		})

		it('should reject overly long values', () => {
			const longValue = 'a'.repeat(101)
			expect(() => safeCssColorSchema.parse(longValue)).toThrow()
		})

		it('should use default color when undefined', () => {
			const result = safeCssColorSchema.parse(undefined)
			expect(result).toBe('#1f3b66')
		})
	})

	describe('brandingSchema', () => {
		it('should accept valid branding object', () => {
			const branding = {
				companyName: 'Test Company',
				logoUrl: 'https://example.com/logo.png',
				primaryColor: '#ff5500'
			}
			expect(() => brandingSchema.parse(branding)).not.toThrow()
		})

		it('should accept data URL for logo', () => {
			const branding = {
				logoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='
			}
			expect(() => brandingSchema.parse(branding)).not.toThrow()
		})

		it('should reject http URLs for logo', () => {
			const branding = {
				logoUrl: 'http://insecure.com/logo.png'
			}
			expect(() => brandingSchema.parse(branding)).toThrow()
		})

		it('should reject invalid logo URLs', () => {
			const branding = {
				logoUrl: 'ftp://ftp.example.com/logo.png'
			}
			expect(() => brandingSchema.parse(branding)).toThrow()
		})

		it('should reject overly long company names', () => {
			const branding = {
				companyName: 'A'.repeat(201)
			}
			expect(() => brandingSchema.parse(branding)).toThrow()
		})

		it('should reject overly large logo URLs (data URLs)', () => {
			const branding = {
				logoUrl: 'data:image/png;base64,' + 'A'.repeat(500_001)
			}
			expect(() => brandingSchema.parse(branding)).toThrow()
		})

		it('should accept null logoUrl', () => {
			const branding = { logoUrl: null }
			const result = brandingSchema.parse(branding)
			expect(result?.logoUrl).toBeNull()
		})
	})

	describe('documentTemplatePayloadSchema', () => {
		it('should accept valid payload', () => {
			const payload = {
				templateTitle: 'My Template',
				state: 'CA',
				branding: {
					companyName: 'Test Company',
					primaryColor: '#ff5500'
				},
				customFields: [{ label: 'Field 1', value: 'Value 1' }],
				clauses: [{ text: 'This is a clause.' }],
				data: { propertyName: 'Test Property' }
			}
			expect(() => documentTemplatePayloadSchema.parse(payload)).not.toThrow()
		})

		it('should accept empty payload', () => {
			expect(() => documentTemplatePayloadSchema.parse({})).not.toThrow()
		})

		it('should normalize state to uppercase', () => {
			const payload = { state: 'ca' }
			const result = documentTemplatePayloadSchema.parse(payload)
			expect(result.state).toBe('CA')
		})

		it('should reject invalid state codes', () => {
			expect(() =>
				documentTemplatePayloadSchema.parse({ state: 'California' })
			).toThrow()
			expect(() =>
				documentTemplatePayloadSchema.parse({ state: 'C' })
			).toThrow()
		})

		it('should reject too many custom fields', () => {
			const payload = {
				customFields: Array.from({ length: 51 }, () => ({
					label: 'Field',
					value: 'Value'
				}))
			}
			expect(() => documentTemplatePayloadSchema.parse(payload)).toThrow()
		})

		it('should reject too many clauses', () => {
			const payload = {
				clauses: Array.from({ length: 21 }, () => ({
					text: 'Clause text'
				}))
			}
			expect(() => documentTemplatePayloadSchema.parse(payload)).toThrow()
		})

		it('should reject overly long template title', () => {
			const payload = {
				templateTitle: 'A'.repeat(201)
			}
			expect(() => documentTemplatePayloadSchema.parse(payload)).toThrow()
		})

		it('should reject overly long custom field labels', () => {
			const payload = {
				customFields: [{ label: 'A'.repeat(101), value: 'Value' }]
			}
			expect(() => documentTemplatePayloadSchema.parse(payload)).toThrow()
		})

		it('should reject overly long clause text', () => {
			const payload = {
				clauses: [{ text: 'A'.repeat(5001) }]
			}
			expect(() => documentTemplatePayloadSchema.parse(payload)).toThrow()
		})
	})

	describe('templateDefinitionSchema', () => {
		it('should accept valid template definition', () => {
			const definition = {
				fields: [
					{
						name: 'customField1',
						label: 'Custom Field',
						type: 'text' as const,
						placeholder: 'Enter value',
						section: 'Custom fields',
						fullWidth: true
					}
				]
			}
			expect(() => templateDefinitionSchema.parse(definition)).not.toThrow()
		})

		it('should accept all field types', () => {
			const fieldTypes = [
				'text',
				'email',
				'tel',
				'date',
				'textarea',
				'select',
				'checkbox',
				'number',
				'list'
			] as const

			fieldTypes.forEach(type => {
				const definition = {
					fields: [{ name: 'field1', label: 'Field', type }]
				}
				expect(() => templateDefinitionSchema.parse(definition)).not.toThrow()
			})
		})

		it('should accept select field with options', () => {
			const definition = {
				fields: [
					{
						name: 'selectField',
						label: 'Select Field',
						type: 'select' as const,
						options: [
							{ value: 'option1', label: 'Option 1' },
							{ value: 'option2', label: 'Option 2' }
						]
					}
				]
			}
			expect(() => templateDefinitionSchema.parse(definition)).not.toThrow()
		})

		it('should accept textarea with rows', () => {
			const definition = {
				fields: [
					{
						name: 'textareaField',
						label: 'Textarea Field',
						type: 'textarea' as const,
						rows: 5
					}
				]
			}
			expect(() => templateDefinitionSchema.parse(definition)).not.toThrow()
		})

		it('should reject invalid field type', () => {
			const definition = {
				fields: [
					{
						name: 'field1',
						label: 'Field',
						type: 'invalid-type'
					}
				]
			}
			expect(() => templateDefinitionSchema.parse(definition)).toThrow()
		})

		it('should reject too many fields', () => {
			const definition = {
				fields: Array.from({ length: 101 }, (_, idx) => ({
					name: `field${idx}`,
					label: `Field ${idx}`,
					type: 'text' as const
				}))
			}
			expect(() => templateDefinitionSchema.parse(definition)).toThrow()
		})

		it('should reject too many options', () => {
			const definition = {
				fields: [
					{
						name: 'selectField',
						label: 'Select',
						type: 'select' as const,
						options: Array.from({ length: 51 }, (_, idx) => ({
							value: `opt${idx}`,
							label: `Option ${idx}`
						}))
					}
				]
			}
			expect(() => templateDefinitionSchema.parse(definition)).toThrow()
		})

		it('should reject invalid rows value', () => {
			const definitionLow = {
				fields: [
					{
						name: 'textareaField',
						label: 'Textarea',
						type: 'textarea' as const,
						rows: 0
					}
				]
			}
			expect(() => templateDefinitionSchema.parse(definitionLow)).toThrow()

			const definitionHigh = {
				fields: [
					{
						name: 'textareaField',
						label: 'Textarea',
						type: 'textarea' as const,
						rows: 21
					}
				]
			}
			expect(() => templateDefinitionSchema.parse(definitionHigh)).toThrow()
		})

		it('should accept empty fields array', () => {
			expect(() => templateDefinitionSchema.parse({ fields: [] })).not.toThrow()
		})

		it('should accept undefined fields', () => {
			expect(() => templateDefinitionSchema.parse({})).not.toThrow()
		})
	})
})
