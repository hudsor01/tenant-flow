"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Prisma = exports.PrismaClient = exports.prisma = void 0;
exports.createPrismaClient = createPrismaClient;
exports.createServerlessPrismaClient = createServerlessPrismaClient;
const client_1 = require("./generated/client");
function createPrismaClient(config = {}) {
    const { databaseUrl = process.env.DATABASE_URL, connectionLimit = 10, poolTimeout = 20, enableLogging } = config;
    if (!databaseUrl) {
        throw new Error('DATABASE_URL is required but not provided');
    }
    const url = new URL(databaseUrl);
    url.searchParams.set('connection_limit', connectionLimit.toString());
    url.searchParams.set('pool_timeout', poolTimeout.toString());
    const isDevelopment = process.env.NODE_ENV === 'development';
    const shouldLog = enableLogging ?? isDevelopment;
    const logConfig = shouldLog
        ? isDevelopment
            ? ['query', 'info', 'warn', 'error']
            : ['warn', 'error']
        : [];
    const prisma = new client_1.PrismaClient({
        datasources: {
            db: {
                url: url.toString()
            }
        },
        log: logConfig,
        errorFormat: isDevelopment ? 'pretty' : 'minimal'
    });
    if (isDevelopment && shouldLog) {
        console.log(`🗄️  Prisma Client created with:`);
        console.log(`   Connection limit: ${connectionLimit}`);
        console.log(`   Pool timeout: ${poolTimeout}s`);
        console.log(`   Logging: ${logConfig.join(', ')}`);
    }
    return prisma;
}
function createServerlessPrismaClient(config = {}) {
    return createPrismaClient({
        connectionLimit: 5,
        poolTimeout: 10,
        enableLogging: false,
        ...config
    });
}
exports.prisma = createPrismaClient();
var client_2 = require("./generated/client");
Object.defineProperty(exports, "PrismaClient", { enumerable: true, get: function () { return client_2.PrismaClient; } });
Object.defineProperty(exports, "Prisma", { enumerable: true, get: function () { return client_2.Prisma; } });
