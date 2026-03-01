import type { ObjectViewPage } from './ObjectViewTypes.js';

/**
 * A resolved section anchor mapping section name to its first page index
 */
export interface SectionAnchor {
    section: string;
    pageIndex: number;
}

/**
 * Extract unique section anchors from pages in order of first appearance returning empty when fewer than two exist
 *
 * @param pages ObjectViewPage array All pages to scan for section tags
 * @returns SectionAnchor array Ordered list of unique sections and their start indices
 *
 * @example
 * const anchors = ResolveSectionAnchors(model.pages);
 * // [{ section: 'overview', pageIndex: 0 }, { section: 'relationships', pageIndex: 2 }]
 */
export function ResolveSectionAnchors(pages: ObjectViewPage[]): SectionAnchor[] {
    const seen = new Set<string>();
    const anchors: SectionAnchor[] = [];

    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        const section = pages[pageIndex].section;
        if (section && !seen.has(section)) {
            seen.add(section);
            anchors.push({ section, pageIndex });
        }
    }

    // No point showing section buttons when there is only one section
    if (anchors.length < 2) {
        return [];
    }

    return anchors;
}
