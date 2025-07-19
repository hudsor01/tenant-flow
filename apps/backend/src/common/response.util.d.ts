export interface ApiResponse<T = unknown> {
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: object;
    };
    meta?: {
        timestamp: string;
        requestId?: string;
    };
}
export declare class ResponseUtil {
    static success<T>(data: T, meta?: {
        requestId?: string;
    }): ApiResponse<T>;
    static error(code: string, message: string, details?: object, meta?: {
        requestId?: string;
    }): ApiResponse<null>;
    static clean<T>(obj: T): T;
}
//# sourceMappingURL=response.util.d.ts.map