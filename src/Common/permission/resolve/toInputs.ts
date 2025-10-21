import type { PermissionToken, PermissionTokenInput } from '../types.js';

export function ToInputs(tokens: PermissionToken[]): PermissionTokenInput[] {
    return tokens.map(token => {
        return [...token];
    });
}
