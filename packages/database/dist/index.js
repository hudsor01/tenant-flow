"use strict";
// Database package - Simple re-export of Supabase types and health utilities
// All types and constants now come from @repo/shared
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDatabaseConnection = void 0;
// Re-export Supabase database types
__exportStar(require("@repo/shared/types/supabase-generated"), exports);
// Export health check utilities  
var health_1 = require("./health");
Object.defineProperty(exports, "checkDatabaseConnection", { enumerable: true, get: function () { return health_1.checkDatabaseConnection; } });
//# sourceMappingURL=index.js.map