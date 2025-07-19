import { AuthService } from '../../auth/auth.service';
import { PrismaService } from 'nestjs-prisma';
import type { ValidatedUser } from '../../auth/auth.service';
import type { FastifyRequest, FastifyReply } from 'fastify';
export interface Context {
    req: FastifyRequest;
    res: FastifyReply;
    user?: ValidatedUser;
    prisma: PrismaService;
    authService: AuthService;
}
export interface ContextOptions {
    req: FastifyRequest;
    res: FastifyReply;
}
export declare class AppContext {
    private readonly authService;
    private readonly prisma;
    constructor(authService: AuthService, prisma: PrismaService);
    create(opts: ContextOptions): Promise<Context>;
}
//# sourceMappingURL=app.context.d.ts.map