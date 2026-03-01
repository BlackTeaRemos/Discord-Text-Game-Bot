/**
 * Abortable timeout helper that aborts the given operation after timeoutMs
 *
 * @param operation Function Async function receiving an AbortSignal
 * @param timeoutMs number Timeout in milliseconds
 * @param desc string Optional description for the TimeoutError message
 * @returns Promise Result of operation when it completes in time
 */
import { TimeoutError } from './TimeoutError.js';

export async function ExecuteWithTimeoutAbortable<T>(
    operation: (signal: AbortSignal) => Promise<T>,
    timeoutMs: number,
    desc?: string,
): Promise<T> {
    const controller = new AbortController();
    const timer: NodeJS.Timeout = setTimeout(() => {
        return controller.abort();
    }, timeoutMs);

    try {
        return await operation(controller.signal);
    } catch(err: unknown) {
        if (controller.signal.aborted) {
            throw new TimeoutError(`Timeout after ${timeoutMs}ms: ${desc ?? ``}`);
        }
        throw err;
    } finally {
        clearTimeout(timer);
    }
}
