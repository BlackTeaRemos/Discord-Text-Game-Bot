import type { PermissionToken, PermissionTokenInput } from '../Types.js';

export function ToInputs(tokens: PermissionToken[]): PermissionTokenInput[] {
    return tokens.map(token => {
        return [...token];
    });
}
