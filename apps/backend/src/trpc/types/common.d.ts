import type { Context } from '../context/app.context';
import type { ValidatedUser } from '../../auth/auth.service';
export type AuthenticatedContext = Context & {
    user: ValidatedUser;
};
export type QueryHandler<TInput = undefined, TOutput = unknown> = TInput extends undefined ? (opts: {
    ctx: AuthenticatedContext;
}) => Promise<TOutput> : (opts: {
    input: TInput;
    ctx: AuthenticatedContext;
}) => Promise<TOutput>;
export type MutationHandler<TInput = undefined, TOutput = unknown> = TInput extends undefined ? (opts: {
    ctx: AuthenticatedContext;
}) => Promise<TOutput> : (opts: {
    input: TInput;
    ctx: AuthenticatedContext;
}) => Promise<TOutput>;
export type PublicQueryHandler<TInput = undefined, TOutput = unknown> = TInput extends undefined ? (opts: {
    ctx: Context;
}) => Promise<TOutput> : (opts: {
    input: TInput;
    ctx: Context;
}) => Promise<TOutput>;
export type PublicMutationHandler<TInput = undefined, TOutput = unknown> = TInput extends undefined ? (opts: {
    ctx: Context;
}) => Promise<TOutput> : (opts: {
    input: TInput;
    ctx: Context;
}) => Promise<TOutput>;
//# sourceMappingURL=common.d.ts.map