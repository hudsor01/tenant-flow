"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageLimit = exports.USAGE_LIMIT_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.USAGE_LIMIT_KEY = 'usage_limit';
const UsageLimit = (config) => (0, common_1.SetMetadata)(exports.USAGE_LIMIT_KEY, config);
exports.UsageLimit = UsageLimit;
