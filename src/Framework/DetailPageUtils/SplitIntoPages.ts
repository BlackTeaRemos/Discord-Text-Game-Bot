import type { ObjectViewPage } from '../ObjectViewTypes.js';
import { GroupIntoBlocks } from '../DetailFormatters/GroupIntoBlocks.js';
import { MAX_PAGE_LENGTH } from './Constants.js';

/**
 * Split lines into pages using block-aware logic
 * Consecutive non-empty lines form blocks that transfer together
 * Splits at block boundaries when a page would exceed MAX_PAGE_LENGTH
 *
 * @param lines string[] Content lines to split
 * @param title string Page title applied to each resulting page
 * @param separator string Join separator between blocks in a page
 * @param section string | undefined Section identifier tag for quick-nav buttons
 * @returns ObjectViewPage[] One or more pages with description text
 *
 * @example SplitIntoPages(['a','b','','c','d'], 'Props', '\n', 'properties')
 */
export function SplitIntoPages(
    lines: string[],
    title: string,
    separator: string = `\n`,
    section?: string,
): ObjectViewPage[] {
    const blocks = GroupIntoBlocks(lines);
    const pages: ObjectViewPage[] = [];
    let currentBlocks: string[][] = [];
    let currentLength = 0;

    for (const block of blocks) {
        const blockText = block.join(separator);
        const addedLength = currentLength > 0 ? blockText.length + 2 : blockText.length;

        if (currentLength + addedLength > MAX_PAGE_LENGTH && currentBlocks.length > 0) {
            const pageText = currentBlocks.map(pageBlock => { return pageBlock.join(separator); }).join(`\n\n`);
            pages.push({ title, description: pageText, section });
            currentBlocks = [];
            currentLength = 0;
        }

        currentBlocks.push(block);
        currentLength += currentLength > 0 ? blockText.length + 2 : blockText.length;
    }

    if (currentBlocks.length > 0) {
        const pageText = currentBlocks.map(pageBlock => { return pageBlock.join(separator); }).join(`\n\n`);
        pages.push({ title, description: pageText, section });
    }

    return pages;
}
