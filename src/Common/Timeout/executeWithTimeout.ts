/**
 * Waits for a Promise to settle and rejects with `TimeoutError` if it does not
 * complete within `timeoutMs` milliseconds.
 *
 * This helper does not cancel the underlying operation.
 *
 * @param promise - Promise to wait for
 * @param timeoutMs - Timeout in milliseconds
 * @param desc - Optional description included in errors
 */
import { TimeoutError } from './TimeoutError.js';

export async function executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number, desc?: string): Promise<T> {
    let timer: NodeJS.Timeout | null = null;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
            return reject(new TimeoutError(`Timeout after ${timeoutMs}ms: ${desc ?? ``}`));
        }, timeoutMs);
    });
    try {
        return await Promise.race([promise, timeout]);
    } finally {
        if (timer) {
            clearTimeout(timer);
        }
    }
}
