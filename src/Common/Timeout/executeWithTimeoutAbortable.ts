/**
 * Abort-capable timeout helper.
 * Aborts the given operation after `timeoutMs` and throws a `TimeoutError`.
 *
 * @param operation - Function that receives an AbortSignal and returns a Promise<T>
 * @param timeoutMs - Timeout in milliseconds
 * @param desc - Optional description used in the TimeoutError message
 * @returns Promise<T> - Result of `operation` when it completes in time
 */
import { TimeoutError } from './TimeoutError.js';

export async function executeWithTimeoutAbortable<T>(
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
