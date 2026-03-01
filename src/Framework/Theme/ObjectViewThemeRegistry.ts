/**
 * Visual theme applied when rendering an object embed
 */
export interface ObjectViewThemeDefinition {
    color: number;
    accentEmoji: string;
    thumbnailUrl?: string;
}

/** Default fallback theme used when no type specific theme is registered */
const _DEFAULT_THEME: ObjectViewThemeDefinition = {
    color: 0x5865F2,
    accentEmoji: `📄`,
};

/** Internal registry of type to theme mappings */
const _themeRegistry = new Map<string, ObjectViewThemeDefinition>();

/**
 * Register a visual theme for a specific object type
 *
 * @param objectType string Object type discriminator
 * @param theme ObjectViewThemeDefinition Visual theme definition
 * @returns void Theme is stored in the registry
 *
 * @example
 * RegisterObjectViewTheme('game', { color: 0x3498DB, accentEmoji: '🎮' });
 */
export function RegisterObjectViewTheme(objectType: string, theme: ObjectViewThemeDefinition): void {
    _themeRegistry.set(objectType, theme);
}

/**
 * Retrieve the visual theme for a given object type
 * Falls back to default when no type specific theme is registered
 *
 * @param objectType string Object type discriminator
 * @returns ObjectViewThemeDefinition Resolved theme definition
 */
export function ResolveObjectViewTheme(objectType: string): ObjectViewThemeDefinition {
    return _themeRegistry.get(objectType) ?? _DEFAULT_THEME;
}

/**
 * Clear all registered themes used primarily for testing
 * @returns void Registry is empty
 */
export function ClearObjectViewThemes(): void {
    _themeRegistry.clear();
}
