import { randomUUID } from 'crypto';

/**
 * @brief Describes a detachable description definition that is not persisted automatically
 */
export interface DescriptionDefinition {
    uid: string;
    text: string;
    refUid?: string;
}

/**
 * @brief Options used when building a description definition
 */
export interface DescriptionDefinitionOptions {
    text?: string;
    uid?: string;
    refUid?: string;
}

/**
 * @brief Builds a description definition without persisting it
 * @param options DescriptionDefinitionOptions Optional seed values for the definition @example const def = BuildDescriptionDefinition({ text: " Demo ", refUid: "game_123" })
 * @returns DescriptionDefinition Normalized definition object ready for further processing
 */
export function BuildDescriptionDefinition(options?: DescriptionDefinitionOptions): DescriptionDefinition {
    const definitionUid = options?.uid ?? buildDescriptionUid();
    const normalizedText = sanitizeDescriptionText(options?.text);

    return {
        uid: definitionUid,
        text: normalizedText,
        refUid: options?.refUid,
    };
}

/**
 * @brief Generates a unique description identifier using a UUID v4 string
 * @returns string Identifier prefixed with desc_ @example const uid = buildDescriptionUid();
 */
export function buildDescriptionUid(): string {
    return `desc_${randomUUID().replace(/-/g, ``)}`;
}

/**
 * @brief Normalizes raw description text by trimming and replacing empty input with a fallback message
 * @param value string or undefined Raw description text captured from the user @example sanitizeDescriptionText("  ")
 * @returns string Normalized description text with fallback applied when necessary
 */
export function sanitizeDescriptionText(value?: string): string {
    const trimmed = value?.trim();
    if (trimmed && trimmed.length > 0) {
        return trimmed;
    }
    return `No description provided yet.`;
}
