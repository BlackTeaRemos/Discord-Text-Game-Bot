import type { ObjectViewPage } from './ObjectViewTypes.js';

/**
 * A resolved section anchor mapping section name to its first page index
 * @property section string Section identifier, e.g "overview", "properties"
 * @property pageIndex number Zero-based index of the first page in this section
 */
export interface SectionAnchor {
    section: string;
    pageIndex: number;
}

/**
 * Extract unique section anchors from pages in order of first appearance
 * Only includes pages that have a section tag defined
 * Returns empty array when fewer than two unique sections exist (no nav needed)
 *
 * @param pages ObjectViewPage[] All pages to scan for section tags
 * @returns SectionAnchor[] Ordered list of unique sections and their start indices
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
