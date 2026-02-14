/**
 * Format a snake_case or camelCase property key to a readable label
 *
 * @param key string Raw property key
 * @returns string Human-readable label
 *
 * @example FormatPropertyKey('owner_user_id') // 'Owner User Id'
 */
export function FormatPropertyKey(key: string): string {
    return key
        .replace(/_/g, ` `)
        .replace(/([a-z])([A-Z])/g, `$1 $2`)
        .replace(/\b\w/g, char => { return char.toUpperCase(); });
}
