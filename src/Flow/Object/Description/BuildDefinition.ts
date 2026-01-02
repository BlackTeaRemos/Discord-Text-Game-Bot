import { randomUUID } from 'crypto';

/**
 * Describes a detachable description definition that is not persisted automatically.
 * @property uid string Unique identifier assigned to the definition. @example "desc_0f1a2b3c"
 * @property text string Normalized description text. @example "Seasonal ladder with weekly resets."
 * @property refUid string | undefined Optional reference UID metadata (global, type-free). @example "game_123"
 */
export interface DescriptionDefinition {
    uid: string;
    text: string;
    refUid?: string;
}

/**
 * Options used when building a description definition.
 * @property text string | undefined Raw description text to normalize. @example "  Tournament finals  "
 * @property uid string | undefined Explicit identifier to reuse instead of generating one. @example "desc_manual_007"
 * @property refUid string | undefined Optional reference UID metadata (global, type-free). @example "org_42"
 */
export interface DescriptionDefinitionOptions {
    text?: string;
    uid?: string;
    refUid?: string;
}

/**
 * Build a description definition without persisting it.
 * @param options DescriptionDefinitionOptions Optional seed values for the definition. @example const def = BuildDescriptionDefinition({ text: " Demo ", refUid: "game_123" })
 * @returns DescriptionDefinition Normalized definition object ready for further processing.
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
 * Generate a unique description identifier using a UUID v4 string.
 * @returns string Identifier prefixed with `desc_`. @example const uid = buildDescriptionUid();
 */
export function buildDescriptionUid(): string {
    return `desc_${randomUUID().replace(/-/g, ``)}`;
}

/**
 * Normalize raw description text by trimming and replacing empty input with a fallback message.
 * @param value string | undefined Raw description text captured from the user. @example sanitizeDescriptionText("  ")
 * @returns string Normalized description text with fallback applied when necessary.
 */
export function sanitizeDescriptionText(value?: string): string {
    const trimmed = value?.trim();
    if (trimmed && trimmed.length > 0) {
        return trimmed;
    }
    return `No description provided yet.`;
}
