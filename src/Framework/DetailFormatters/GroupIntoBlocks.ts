/**
 * Group an array of lines into logical blocks separated by empty lines
 * Consecutive non-empty lines form a single block
 *
 * @param lines string[] Raw line array
 * @returns string[][] Array of blocks, each block is an array of non-empty lines
 *
 * @example GroupIntoBlocks(['a','b','','c']) // [['a','b'], ['c']]
 */
export function GroupIntoBlocks(lines: string[]): string[][] {
    const blocks: string[][] = [];
    let currentBlock: string[] = [];

    for (const line of lines) {
        if (line === ``) {
            if (currentBlock.length > 0) {
                blocks.push(currentBlock);
                currentBlock = [];
            }
        } else {
            currentBlock.push(line);
        }
    }

    if (currentBlock.length > 0) {
        blocks.push(currentBlock);
    }

    return blocks;
}
