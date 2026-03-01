/**
 * Waits for a Promise to settle and rejects with TimeoutError if it does not complete within timeoutMs
 *
 * @param promise Promise The source promise to race against timeout
 * @param timeoutMs number Timeout in milliseconds
 * @param desc string Optional description included in errors
 */
import { TimeoutError } from './TimeoutError.js';

export async function ExecuteWithTimeout<T>(promise: Promise<T>, timeoutMs: number, desc?: string): Promise<T> {
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
