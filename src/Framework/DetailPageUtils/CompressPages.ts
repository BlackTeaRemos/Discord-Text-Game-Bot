import type { ObjectViewPage } from '../ObjectViewTypes.js';
import { MAX_PAGE_LENGTH, SECTION_SEPARATOR } from './Constants.js';

/**
 * @brief Group of consecutive pages sharing the same section tag
 */
interface SectionGroup {
    section: string | undefined;
    pages: ObjectViewPage[];
}

/**
 * @brief Compress pages within the same section into a single page when content fits
 *
 * @param pages ObjectViewPage All section pages to attempt compressing
 * @returns ObjectViewPage Compressed pages preserving section boundaries
 *
 * @example
 * // Two overview pages merge into one, relationships stay separate
 * CompressPages([overviewA, overviewB, relationsA, relationsB])
 */
export function CompressPages(pages: ObjectViewPage[]): ObjectViewPage[] {
    const groups = __GroupBySection(pages);
    const result: ObjectViewPage[] = [];

    for (const group of groups) {
        if (group.pages.length <= 1) {
            result.push(...group.pages);
            continue;
        }

        const merged = __MergeGroup(group);
        if (merged) {
            result.push(merged);
        } else {
            result.push(...group.pages);
        }
    }

    return result;
}

/**
 * Group consecutive pages by their section tag
 */
function __GroupBySection(pages: ObjectViewPage[]): SectionGroup[] {
    const groups: SectionGroup[] = [];
    let currentGroup: SectionGroup | null = null;

    for (const page of pages) {
        if (!currentGroup || currentGroup.section !== page.section) {
            currentGroup = { section: page.section, pages: [] };
            groups.push(currentGroup);
        }
        currentGroup.pages.push(page);
    }

    return groups;
}

/**
 * @brief Attempt to merge all pages in a group into a single page
 */
function __MergeGroup(group: SectionGroup): ObjectViewPage | null {
    const sectionTexts: string[] = [];
    for (const page of group.pages) {
        if (page.title) {
            sectionTexts.push(`**${page.title}**\n${page.description}`);
        } else {
            sectionTexts.push(page.description);
        }
    }

    const mergedDescription = sectionTexts.join(SECTION_SEPARATOR);
    if (mergedDescription.length > MAX_PAGE_LENGTH) {
        return null;
    }

    const mergedFields = group.pages.flatMap(page => { return page.fields ?? []; });

    return {
        title: group.pages[0].title,
        description: mergedDescription,
        section: group.section,
        fields: mergedFields.length > 0 ? mergedFields : undefined,
    };
}
