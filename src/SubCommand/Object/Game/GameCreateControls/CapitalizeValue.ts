/**
 * Capitalize the first character of the provided text segment.
 * @param value string Value to capitalize. @example const result = CapitalizeValue('game creation')
 * @returns string Capitalized text. @example 'Game creation'
 */
export function CapitalizeValue(value: string): string {
    if (!value) {
        return value;
    }
    return `${value[0].toUpperCase()}${value.slice(1)}`;
}
