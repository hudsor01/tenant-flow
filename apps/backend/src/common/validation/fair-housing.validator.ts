import { registerDecorator, type ValidationOptions, type ValidationArguments } from 'class-validator'

/**
 * Custom validator decorator to prevent Fair Housing Act violations
 * Blocks field names that could collect protected class information
 */
export function IsFairHousingCompliant(validationOptions?: ValidationOptions) {
  return function (object: unknown, propertyName: string) {
    registerDecorator({
      name: 'isFairHousingCompliant',
      target: (object as Record<string, unknown>).constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          // Check if the property name itself suggests protected class collection
          const propertyName = args.property.toLowerCase()
          const prohibitedFields = [
            'race', 'color', 'religion', 'sex', 'gender', 'national_origin',
            'familial_status', 'disability', 'age', 'marital_status'
          ]

          for (const prohibited of prohibitedFields) {
            if (propertyName.includes(prohibited) || propertyName.includes(prohibited.replace('_', ''))) {
              return false
            }
          }

          // Check if the value contains discriminatory language (for text fields)
          if (typeof value === 'string' && value.length > 0) {
            const discriminatoryTerms = [
              'no_kids', 'no_children', 'adults_only', 'no_section_8', 
              'no_vouchers', 'male_only', 'female_only'
            ]

            const lowerValue = value.toLowerCase()
            for (const term of discriminatoryTerms) {
              if (lowerValue.includes(term.replace('_', ' ')) || lowerValue.includes(term)) {
                return false
              }
            }
          }

          return true
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} violates Fair Housing Act compliance requirements`
        }
      }
    })
  }
}

/**
 * Additional validator for text fields that might contain discriminatory language
 */
export function NoDiscriminatoryLanguage(validationOptions?: ValidationOptions) {
  return function (object: unknown, propertyName: string) {
    registerDecorator({
      name: 'noDiscriminatoryLanguage',
      target: (object as Record<string, unknown>).constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (!value || typeof value !== 'string') return true

          const discriminatoryTerms = [
            'no kids', 'no children', 'adults only', 'no section 8', 
            'no vouchers', 'male only', 'female only', 'disabled', 'handicapped'
          ]

          const lowerValue = value.toLowerCase()
          return !discriminatoryTerms.some(term => lowerValue.includes(term))
        },
        defaultMessage() {
          return 'Text contains discriminatory language that violates Fair Housing Act'
        }
      }
    })
  }
}