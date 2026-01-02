import type { ObjectTypeKey } from '../../Common/Flow/ObjectRegistry.js';

export const VIEW_PARAMETER_BUTTON_ID = `view_parameters`;

/**
 * Build custom id for the parameter view button.
 * @param type ObjectTypeKey Target object type.
 * @param id string Target object uid.
 * @returns string Custom id.
 */
export function BuildViewParameterButtonId(type: ObjectTypeKey, id: string): string {
    const customId = `${VIEW_PARAMETER_BUTTON_ID}:${type}:${id}`;
    if (customId.length > 100) {
        throw new Error(`Parameter action customId is too long (${customId.length}).`);
    }
    return customId;
}

/**
 * Parse custom id for the parameter view button.
 * @param customId string Custom id.
 * @returns { type: ObjectTypeKey; id: string } Parsed fields.
 */
export function ParseViewParameterButtonId(customId: string): { type: ObjectTypeKey; id: string } {
    const parts = customId.split(`:`);
    if (parts.length < 3) {
        throw new Error(`Invalid parameter customId.`);
    }

    const type = parts[1] as ObjectTypeKey;
    const id = parts.slice(2).join(`:`);

    return { type, id };
}
