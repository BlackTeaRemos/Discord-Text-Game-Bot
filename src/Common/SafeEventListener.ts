/**
 * Provides a defensive wrapper for event listeners ensuring errors never escape as unhandled rejections
 */

export interface SafeEventListenerOptions {
    /**
     * Optional diagnostic name for the listener used in error reporting
     * @example 'discord:interactionCreate'
     */
    name?: string;

    /**
     * Error callback invoked when the listener throws or rejects
     * @param error unknown The error thrown or rejected @example new Error('boom')
     * @param name string or undefined The diagnostic name if provided @example 'discord:interactionCreate'
     * @returns void No return value
     */
    onError?: (error: unknown, name?: string) => void;
}

/**
 * Wrap an event listener so it never throws and never rejects
 * @param listener function Original listener @example async () => { throw new Error('boom'); }
 * @param options SafeEventListenerOptions Optional diagnostic naming and error callback
 * @returns function Safe listener that always resolves
 * @example
 * const safe = CreateSafeEventListener(async () => { throw new Error('boom'); }, { name: 'x', onError: console.error });
 * await safe();
 */
export function CreateSafeEventListener(
    listener: (...args: any[]) => unknown,
    options: SafeEventListenerOptions = {},
): (...args: any[]) => Promise<void> {
    const { name, onError } = options;

    return async(...args: any[]): Promise<void> => {
        try {
            await listener(...args);
        } catch (error) {
            try {
                onError?.(error, name);
            } catch {
                // Never allow error reporting to crash the app
            }
        }
    };
}
