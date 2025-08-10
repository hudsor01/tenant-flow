"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ErrorBoundaryGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorBoundaryGuard = void 0;
exports.WithErrorBoundary = WithErrorBoundary;
exports.WithClassErrorBoundary = WithClassErrorBoundary;
const common_1 = require("@nestjs/common");
const error_handler_service_1 = require("../errors/error-handler.service");
const crypto = __importStar(require("crypto"));
let ErrorBoundaryGuard = ErrorBoundaryGuard_1 = class ErrorBoundaryGuard {
    constructor(_errorHandler) {
        this.logger = new common_1.Logger(ErrorBoundaryGuard_1.name);
    }
    canActivate(context) {
        try {
            const request = context.switchToHttp().getRequest();
            const handler = context.getHandler();
            const className = context.getClass().name;
            const methodName = handler.name;
            request.errorBoundary = {
                className,
                methodName,
                timestamp: new Date().toISOString(),
                requestId: request.id || this.generateRequestId()
            };
            return true;
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('Error in ErrorBoundaryGuard', {
                error: err.message,
                stack: err.stack
            });
            return true;
        }
    }
    static handleCriticalError(error, context) {
        const logger = new common_1.Logger('CriticalErrorHandler');
        logger.error('Critical error occurred', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            context,
            timestamp: new Date().toISOString()
        });
        if (process.env.NODE_ENV === 'production') {
            try {
            }
            catch (monitoringError) {
                logger.error('Failed to report critical error to monitoring service', monitoringError);
            }
        }
        throw new common_1.HttpException({
            error: {
                message: 'A critical error occurred',
                code: 'CRITICAL_ERROR',
                statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                timestamp: new Date().toISOString(),
                requestId: context?.requestId
            }
        }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
    }
    generateRequestId() {
        return `req_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    }
};
exports.ErrorBoundaryGuard = ErrorBoundaryGuard;
exports.ErrorBoundaryGuard = ErrorBoundaryGuard = ErrorBoundaryGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [error_handler_service_1.ErrorHandlerService])
], ErrorBoundaryGuard);
function WithErrorBoundary(fallbackValue, customHandler) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        const logger = new common_1.Logger(`${target.constructor.name}.${String(propertyKey)}`);
        descriptor.value = async function (...args) {
            const context = {
                className: target.constructor.name,
                methodName: String(propertyKey),
                timestamp: new Date().toISOString(),
                args: args.length
            };
            try {
                return await originalMethod.apply(this, args);
            }
            catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                logger.error('Error caught by error boundary', {
                    ...context,
                    error: err.message,
                    stack: err.stack
                });
                if (customHandler) {
                    return customHandler(error, context);
                }
                if (fallbackValue !== undefined) {
                    logger.warn('Returning fallback value due to error', {
                        ...context,
                        fallbackValue
                    });
                    return fallbackValue;
                }
                throw error;
            }
        };
        return descriptor;
    };
}
function WithClassErrorBoundary(fallbackValue, customHandler) {
    return function (constructor) {
        const methodNames = Object.getOwnPropertyNames(constructor.prototype)
            .filter(name => name !== 'constructor' && typeof constructor.prototype[name] === 'function');
        methodNames.forEach(methodName => {
            const originalMethod = constructor.prototype[methodName];
            const logger = new common_1.Logger(`${constructor.name}.${methodName}`);
            constructor.prototype[methodName] = async function (...args) {
                const context = {
                    className: constructor.name,
                    methodName,
                    timestamp: new Date().toISOString(),
                    args: args.length
                };
                try {
                    return await originalMethod.apply(this, args);
                }
                catch (error) {
                    const err = error instanceof Error ? error : new Error(String(error));
                    logger.error('Error caught by class error boundary', {
                        ...context,
                        error: err.message,
                        stack: err.stack
                    });
                    if (customHandler) {
                        return customHandler(error, context);
                    }
                    if (fallbackValue !== undefined) {
                        logger.warn('Returning fallback value due to error', {
                            ...context,
                            fallbackValue
                        });
                        return fallbackValue;
                    }
                    throw error;
                }
            };
        });
        return constructor;
    };
}
