"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseUtil = void 0;
class ResponseUtil {
    static success(data, meta) {
        return {
            data,
            meta: {
                timestamp: new Date().toISOString(),
                ...meta
            }
        };
    }
    static error(code, message, details, meta) {
        return {
            error: {
                code,
                message,
                details
            },
            meta: {
                timestamp: new Date().toISOString(),
                ...meta
            }
        };
    }
    static clean(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
}
exports.ResponseUtil = ResponseUtil;
