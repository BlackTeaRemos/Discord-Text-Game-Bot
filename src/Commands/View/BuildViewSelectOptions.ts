import { UniqueSelectOptions } from '../../Common/UniqueSelectOptions.js';

export interface ViewSelectOption {
    label: string;
    value: string;
}

/**
 * Build Discord select menu options for the /view command.
 * Truncates labels to Discord limits and enforces unique values with a max cap.
 *
 * @param records Array<{ uid: string; label: string }> Raw records (example: [{ uid: 'g1', label: 'Game 1' }]).
 * @param max number Maximum options to return (example: 25).
 * @returns ViewSelectOption[] Sanitized options (example: [{ label: 'Game 1', value: 'g1' }]).
 *
 * @example
 * const options = BuildViewSelectOptions([{ uid: 'u1', label: 'Alice' }]);
 */
export function BuildViewSelectOptions(
    records: Array<{ uid: string; label: string }>,
    max: number = 25,
): ViewSelectOption[] {
    const raw = records.map(record => {
        const safeLabel = __NormalizeLabel(record.label, record.uid);
        return {
            label: safeLabel,
            value: String(record.uid),
        };
    });

    return UniqueSelectOptions(raw, max);
}

/**
 * Normalize a record label for safe display inside Discord select menus.
 * @param label string Raw label value (example: 'Very long name...').
 * @param fallback string Fallback when label is empty (example: 'uid_123').
 * @returns string Normalized label (example: 'Very long name...').
 */
function __NormalizeLabel(label: string, fallback: string): string {
    const trimmed = (label ?? ``).toString().trim();
    const chosen = trimmed || (fallback ?? ``).toString().trim() || `Unnamed`;
    return chosen.length > 100 ? chosen.slice(0, 97) + `...` : chosen;
}
