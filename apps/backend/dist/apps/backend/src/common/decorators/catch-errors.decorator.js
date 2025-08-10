"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatchErrors = CatchErrors;
exports.CatchAllErrors = CatchAllErrors;
exports.ValidateAndCatch = ValidateAndCatch;
const common_1 = require("@nestjs/common");
function CatchErrors(errorMessage, throwAs) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        const logger = new common_1.Logger(target.constructor.name);
        descriptor.value = async function (...args) {
            try {
                return await originalMethod.apply(this, args);
            }
            catch (error) {
                const methodName = String(propertyKey);
                const className = target.constructor.name;
                const err = error instanceof Error ? error : new Error(String(error));
                logger.error(`Error in ${className}.${methodName}: ${err.message}`, {
                    className,
                    methodName,
                    error: err.message,
                    stack: err.stack,
                    args: args.map((arg, index) => ({
                        index,
                        type: typeof arg,
                        value: typeof arg === 'object' ? JSON.stringify(arg) : arg
                    }))
                });
                if (throwAs) {
                    const err = error instanceof Error ? error : new Error(String(error));
                    throw new throwAs(errorMessage || err.message);
                }
                if (errorMessage) {
                    throw new Error(errorMessage);
                }
                throw error;
            }
        };
        return descriptor;
    };
}
function CatchAllErrors(errorMessage, throwAs) {
    return function (constructor) {
        const logger = new common_1.Logger(constructor.name);
        const methodNames = Object.getOwnPropertyNames(constructor.prototype)
            .filter(name => name !== 'constructor' && typeof constructor.prototype[name] === 'function');
        methodNames.forEach(methodName => {
            const originalMethod = constructor.prototype[methodName];
            constructor.prototype[methodName] = async function (...args) {
                try {
                    return await originalMethod.apply(this, args);
                }
                catch (error) {
                    const err = error instanceof Error ? error : new Error(String(error));
                    logger.error(`Error in ${constructor.name}.${methodName}: ${err.message}`, {
                        className: constructor.name,
                        methodName,
                        error: err.message,
                        stack: err.stack
                    });
                    if (throwAs) {
                        const err = error instanceof Error ? error : new Error(String(error));
                        throw new throwAs(errorMessage || err.message);
                    }
                    if (errorMessage) {
                        throw new Error(errorMessage);
                    }
                    throw error;
                }
            };
        });
        return constructor;
    };
}
function ValidateAndCatch(validator, errorMessage) {
    return function (target, propertyKey, parameterIndex) {
        const existingMetadata = Reflect.getMetadata('validation:parameters', target) || [];
        existingMetadata.push({
            index: parameterIndex,
            validator,
            errorMessage,
            methodName: propertyKey
        });
        Reflect.defineMetadata('validation:parameters', existingMetadata, target);
    };
}
