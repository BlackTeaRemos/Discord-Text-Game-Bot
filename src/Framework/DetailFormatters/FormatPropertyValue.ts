/**
 * Format a property value for display, truncating long strings
 *
 * @param value unknown Raw property value of any type
 * @returns string Formatted display string
 *
 * @example FormatPropertyValue(true) // 'Yes'
 * @example FormatPropertyValue('hello') // '`hello`'
 */
export function FormatPropertyValue(value: unknown): string {
    if (value === null || value === undefined) {
        return `_empty_`;
    }
    if (typeof value === `boolean`) {
        return value ? `Yes` : `No`;
    }
    if (typeof value === `number`) {
        return String(value);
    }
    if (typeof value === `string`) {
        if (value.length > 200) {
            return `\`${value.slice(0, 197)}...\``;
        }
        return `\`${value}\``;
    }
    if (Array.isArray(value)) {
        return value.map(item => { return `\`${String(item)}\``; }).join(`, `);
    }
    return `\`${JSON.stringify(value).slice(0, 200)}\``;
}
