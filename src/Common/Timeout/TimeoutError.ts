/**
 * TimeoutError class used to signal operation timeouts
 * @example
 *   throw new TimeoutError('timed out');
 */
export class TimeoutError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = `TimeoutError`;
    }
}
