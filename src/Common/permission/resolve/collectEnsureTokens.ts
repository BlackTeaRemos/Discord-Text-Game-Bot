import { ResolveTokens } from './resolveTokens.js';
import type { PermissionToken } from '../types.js';
import type { TokenResolveContext } from './types.js';
import { FormatPermissionToken } from '../formatPermissionToken.js';

export function CollectEnsureTokens(
    templates: Array<string | import('../types.js').TokenSegmentInput[]> = [],
    context: TokenResolveContext,
): PermissionToken[] {
    const tokens: PermissionToken[] = [];
    const seen = new Set<string>();
    for (const template of templates) {
        const resolved = ResolveTokens(template, context);
        for (const token of resolved) {
            const key = FormatPermissionToken(token);
            if (seen.has(key)) {
                continue;
            }
            seen.add(key);
            tokens.push(token);
        }
    }
    return tokens;
}
