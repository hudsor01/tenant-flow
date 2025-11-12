"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.createLogger = void 0;
const isDevelopment = () => process.env["NODE_ENV"] === 'development';
const devConsole = typeof globalThis !== 'undefined'
    ? globalThis['console']
    : undefined;
const developmentConsoleFallback = (entry) => {
    if (!isDevelopment())
        return;
    const timestamp = entry.timestamp;
    const contextStr = entry.context?.component
        ? `[${entry.context.component}]`
        : '';
    const message = `${timestamp} [${entry.level}]${contextStr} ${entry.message}`;
    switch (entry.level) {
        case 'DEBUG':
        case 'INFO':
            devConsole?.info?.(message, entry.context?.metadata || '', ...(entry.args || []));
            break;
        case 'WARN':
            devConsole?.warn?.(message, entry.context?.metadata || '', ...(entry.args || []));
            break;
        case 'ERROR':
            devConsole?.error?.(message, entry.context?.metadata || '', ...(entry.args || []));
            break;
    }
};
const logEntry = (entry) => {
    developmentConsoleFallback(entry);
};
const createLogger = (defaultContext) => {
    return {
        debug: (message, context, ...args) => {
            if (isDevelopment()) {
                const entry = {
                    level: 'DEBUG',
                    message,
                    context: { ...defaultContext, ...context },
                    timestamp: new Date().toISOString(),
                    args
                };
                logEntry(entry);
            }
        },
        info: (message, context, ...args) => {
            const entry = {
                level: 'INFO',
                message,
                context: { ...defaultContext, ...context },
                timestamp: new Date().toISOString(),
                args
            };
            logEntry(entry);
        },
        warn: (message, context, ...args) => {
            const entry = {
                level: 'WARN',
                message,
                context: { ...defaultContext, ...context },
                timestamp: new Date().toISOString(),
                args
            };
            logEntry(entry);
        },
        error: (message, context, ...args) => {
            const entry = {
                level: 'ERROR',
                message,
                context: { ...defaultContext, ...context },
                timestamp: new Date().toISOString(),
                args
            };
            logEntry(entry);
        }
    };
};
exports.createLogger = createLogger;
exports.logger = (0, exports.createLogger)();
exports.default = exports.logger;
//# sourceMappingURL=frontend-logger.js.map