"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsFairHousingCompliant = IsFairHousingCompliant;
exports.NoDiscriminatoryLanguage = NoDiscriminatoryLanguage;
const class_validator_1 = require("class-validator");
function IsFairHousingCompliant(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'isFairHousingCompliant',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value, args) {
                    const propertyName = args.property.toLowerCase();
                    const prohibitedFields = [
                        'race', 'color', 'religion', 'sex', 'gender', 'national_origin',
                        'familial_status', 'disability', 'age', 'marital_status'
                    ];
                    for (const prohibited of prohibitedFields) {
                        if (propertyName.includes(prohibited) || propertyName.includes(prohibited.replace('_', ''))) {
                            return false;
                        }
                    }
                    if (typeof value === 'string' && value.length > 0) {
                        const discriminatoryTerms = [
                            'no_kids', 'no_children', 'adults_only', 'no_section_8',
                            'no_vouchers', 'male_only', 'female_only'
                        ];
                        const lowerValue = value.toLowerCase();
                        for (const term of discriminatoryTerms) {
                            if (lowerValue.includes(term.replace('_', ' ')) || lowerValue.includes(term)) {
                                return false;
                            }
                        }
                    }
                    return true;
                },
                defaultMessage(args) {
                    return `${args.property} violates Fair Housing Act compliance requirements`;
                }
            }
        });
    };
}
function NoDiscriminatoryLanguage(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'noDiscriminatoryLanguage',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value) {
                    if (!value || typeof value !== 'string')
                        return true;
                    const discriminatoryTerms = [
                        'no kids', 'no children', 'adults only', 'no section 8',
                        'no vouchers', 'male only', 'female only', 'disabled', 'handicapped'
                    ];
                    const lowerValue = value.toLowerCase();
                    return !discriminatoryTerms.some(term => lowerValue.includes(term));
                },
                defaultMessage() {
                    return 'Text contains discriminatory language that violates Fair Housing Act';
                }
            }
        });
    };
}
