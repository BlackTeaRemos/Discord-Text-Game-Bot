import type { PermissionToken, PermissionTokenInput, TokenSegmentInput } from './types.js';
import { NormalizeSegment } from './normalizeSegment.js';

export function NormalizeToken(token: PermissionTokenInput): PermissionToken {
    if (Array.isArray(token)) {
        return token.map(segment => {
            return NormalizeSegment(segment);
        }) as PermissionToken;
    }
    if (typeof token === `string`) {
        const trimmed = token.trim();
        if (!trimmed) {
            return [];
        }
        return trimmed.split(`:`).map(part => {
            return NormalizeSegment(part);
        }) as PermissionToken;
    }
    return [];
}
