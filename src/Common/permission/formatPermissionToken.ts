import type { PermissionToken } from './types.js';

export function FormatPermissionToken(token: PermissionToken): string {
    if (!token.length) {
        return `EMPTY`;
    }
    return token
        .map(part => {
            if (part === undefined) {
                return `*`;
            }
            return String(part);
        })
        .join(`:`);
}
