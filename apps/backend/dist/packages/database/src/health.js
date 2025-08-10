"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDatabaseConnection = checkDatabaseConnection;
async function checkDatabaseConnection(prisma) {
    try {
        await prisma.$queryRaw `SELECT 1`;
        return { healthy: true };
    }
    catch (error) {
        const errorMessage = error instanceof Error
            ? error.message
            : 'Unknown database error';
        return {
            healthy: false,
            error: errorMessage
        };
    }
}
