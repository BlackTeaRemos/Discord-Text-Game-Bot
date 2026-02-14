/**
 * Safely parse a JSON string property from a node
 * Returns null if the property is missing, not a string, or invalid JSON
 *
 * @param value unknown Raw property value from the node
 * @returns T | null Parsed value or null
 *
 * @example ParseJsonProperty<number[]>('[1,2,3]') // [1,2,3]
 */
export function ParseJsonProperty<T>(value: unknown): T | null {
    if (typeof value !== `string`) {
        return null;
    }
    try {
        return JSON.parse(value) as T;
    } catch {
        return null;
    }
}
