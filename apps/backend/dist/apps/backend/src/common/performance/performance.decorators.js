"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeasureLoadTime = MeasureLoadTime;
exports.MeasureServiceInit = MeasureServiceInit;
exports.MeasureMethod = MeasureMethod;
exports.AsyncTimeout = AsyncTimeout;
const common_1 = require("@nestjs/common");
const logger = new common_1.Logger('PerformanceDecorator');
function MeasureLoadTime(moduleName) {
    return function (constructor) {
        const name = moduleName || constructor.name;
        const startTime = Date.now();
        return class extends constructor {
            constructor(...args) {
                super(...args);
                const loadTime = Date.now() - startTime;
                if (loadTime > 100) {
                    logger.warn(`⚠️ ${name} took ${loadTime}ms to load`);
                }
                else if (loadTime > 50) {
                    logger.log(`📊 ${name} loaded in ${loadTime}ms`);
                }
                else if (process.env.NODE_ENV === 'development') {
                    logger.debug(`✅ ${name} loaded quickly (${loadTime}ms)`);
                }
            }
        };
    };
}
function MeasureServiceInit(serviceName) {
    return function (constructor) {
        const name = serviceName || constructor.name;
        return class extends constructor {
            constructor(...args) {
                const startTime = performance.now();
                super(...args);
                const endTime = performance.now();
                const initTime = Math.round((endTime - startTime) * 100) / 100;
                if (initTime > 10) {
                    logger.warn(`⚠️ ${name} initialization took ${initTime}ms`);
                }
                else if (process.env.NODE_ENV === 'development') {
                    logger.debug(`✅ ${name} initialized in ${initTime}ms`);
                }
            }
        };
    };
}
function MeasureMethod(threshold = 100) {
    return function (target, propertyName, descriptor) {
        const method = descriptor.value;
        descriptor.value = function (...args) {
            const startTime = performance.now();
            const result = method.apply(this, args);
            if (result && typeof result.then === 'function') {
                return result.finally(() => {
                    const endTime = performance.now();
                    const executionTime = Math.round((endTime - startTime) * 100) / 100;
                    if (executionTime > threshold) {
                        logger.warn(`⚠️ ${target.constructor.name}.${propertyName}() took ${executionTime}ms`);
                    }
                });
            }
            else {
                const endTime = performance.now();
                const executionTime = Math.round((endTime - startTime) * 100) / 100;
                if (executionTime > threshold) {
                    logger.warn(`⚠️ ${target.constructor.name}.${propertyName}() took ${executionTime}ms`);
                }
                return result;
            }
        };
        return descriptor;
    };
}
function AsyncTimeout(timeoutMs = 5000, errorMessage) {
    return function (target, propertyName, descriptor) {
        const method = descriptor.value;
        descriptor.value = function (...args) {
            const result = method.apply(this, args);
            if (result && typeof result.then === 'function') {
                return Promise.race([
                    result,
                    new Promise((_, reject) => {
                        setTimeout(() => {
                            const message = errorMessage || `${target.constructor.name}.${propertyName}() timed out after ${timeoutMs}ms`;
                            reject(new Error(message));
                        }, timeoutMs);
                    })
                ]);
            }
            return result;
        };
        return descriptor;
    };
}
