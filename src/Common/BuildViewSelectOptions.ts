import { UniqueSelectOptions } from './UniqueSelectOptions.js';

/**
 * Builds select menu options from records with uid and label fields
 * @param records Array<{uid: string, label: string}> Records to convert. @example [{uid: 'abc', label: 'My Item'}]
 * @param maxOptions number Maximum options to return. @example 25
 * @returns Array<{label: string, value: string}> Discord-compatible select options
 * @example BuildViewSelectOptions([{uid: 'x1', label: 'Game'}], 10) -> [{label: 'Game', value: 'x1'}]
 */
export function BuildViewSelectOptions(
    records: Array<{ uid: string; label: string }>,
    maxOptions = 25,
): Array<{ label: string; value: string }> {
    const mapped = records.map(record => {
        const displayLabel = record.label?.slice(0, 100) || record.uid.slice(0, 100);
        return {
            label: displayLabel,
            value: record.uid,
        };
    });

    return UniqueSelectOptions(mapped, maxOptions);
}
