import { ResolveTokens } from './ResolveTokens.js';
import type { PermissionToken } from '../Types.js';
import type { TokenResolveContext } from './Types.js';
import { FormatPermissionToken } from '../Engine/FormatPermissionToken.js';

export function CollectEnsureTokens(
    templates: Array<string | import('../Types.js').TokenSegmentInput[]> = [],
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
