import type { ObjectViewPage, ObjectViewSelectOption } from '../ObjectViewTypes.js';

/**
 * Distribute select options across relationship pages
 * Each page gets up to 25 options (Discord select menu limit)
 * Options are assigned sequentially in the order they appear
 *
 * @param pages ObjectViewPage[] Target pages to attach options to
 * @param options ObjectViewSelectOption[] All collected select options
 */
export function DistributeSelectOptions(
    pages: ObjectViewPage[],
    options: ObjectViewSelectOption[],
): void {
    const maxOptionsPerPage = 25; // Discord StringSelectMenu limit
    let optionIndex = 0;

    for (const page of pages) {
        if (optionIndex >= options.length) {
            break;
        }

        const pageOptions = options.slice(optionIndex, optionIndex + maxOptionsPerPage);
        page.selectOptions = pageOptions;
        optionIndex += pageOptions.length;
    }
}
