/**
 * @brief Format a parameter value for human friendly display
 * @param rawValue string Raw parameter value string
 * @returns string Parsed and formatted display string
 *
 * @example FormatParameterValue('[1,2,3]') // '`1`, `2`, `3`'
 * @example FormatParameterValue('{"hp":"100"}') // 'hp: `100`'
 */
export function FormatParameterValue(rawValue: string): string {
    const trimmed = rawValue.trim();
    if (!trimmed) {
        return `_empty_`;
    }

    // Try to parse JSON for structured display
    if (trimmed.startsWith(`[`) || trimmed.startsWith(`{`)) {
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                if (parsed.length === 0) {
                    return `_empty list_`;
                }
                return parsed.map(item => { return `\`${String(item)}\``; }).join(`, `);
            }
            if (typeof parsed === `object` && parsed !== null) {
                const entries = Object.entries(parsed);
                if (entries.length === 0) {
                    return `_empty_`;
                }
                return entries
                    .map(([entryKey, entryValue]) => { return `${entryKey}: \`${String(entryValue)}\``; })
                    .join(` | `);
            }
        } catch {
            // Not valid JSON so fall through to plain display
        }
    }

    if (trimmed.length > 200) {
        return `\`${trimmed.slice(0, 197)}...\``;
    }
    return `\`${trimmed}\``;
}
