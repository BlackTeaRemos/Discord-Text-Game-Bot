import type { ObjectViewPage } from '../ObjectViewTypes.js';
import { MAX_PAGE_LENGTH, SECTION_SEPARATOR } from './Constants.js';

/**
 * Compress all sections into a single page when total content fits
 * Returns original pages unchanged when content exceeds MAX_PAGE_LENGTH
 *
 * @param pages ObjectViewPage[] All section pages to attempt compressing
 * @returns ObjectViewPage[] Either a single merged page or the original pages
 */
export function CompressPages(pages: ObjectViewPage[]): ObjectViewPage[] {
    const sectionTexts: string[] = [];
    for (const page of pages) {
        if (page.title) {
            sectionTexts.push(`**${page.title}**\n${page.description}`);
        } else {
            sectionTexts.push(page.description);
        }
    }

    const mergedDescription = sectionTexts.join(SECTION_SEPARATOR);
    if (mergedDescription.length > MAX_PAGE_LENGTH) {
        return pages;
    }

    const mergedFields = pages.flatMap(page => { return page.fields ?? []; });
    const mergedSelectOptions = pages.flatMap(page => { return page.selectOptions ?? []; });

    const compressed: ObjectViewPage = {
        description: mergedDescription,
        fields: mergedFields.length > 0 ? mergedFields : undefined,
        selectOptions: mergedSelectOptions.length > 0 ? mergedSelectOptions : undefined,
    };

    return [compressed];
}
