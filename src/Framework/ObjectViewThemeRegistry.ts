/**
 * Visual theme applied when rendering an object embed
 * @property color number Embed sidebar color as integer. Example: 0x5865F2
 * @property accentEmoji string Emoji prepended to embed title. Example: '🎮'
 * @property thumbnailUrl string | undefined Default thumbnail when object has none. Example: 'https://cdn.example.com/game.png'
 */
export interface ObjectViewThemeDefinition {
    color: number;
    accentEmoji: string;
    thumbnailUrl?: string;
}

/** Default fallback theme used when no type-specific theme is registered */
const _DEFAULT_THEME: ObjectViewThemeDefinition = {
    color: 0x5865F2,
    accentEmoji: `📄`,
};

/** Internal registry of type -> theme mappings */
const _themeRegistry = new Map<string, ObjectViewThemeDefinition>();

/**
 * Register a visual theme for a specific object type
 *
 * @param objectType string Object type discriminator. Example: 'game'
 * @param theme ObjectViewThemeDefinition Visual theme definition. Example: { color: 0x3498DB, accentEmoji: '🎮' }
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
 * Falls back to default when no type-specific theme is registered
 *
 * @param objectType string Object type discriminator. Example: 'game'
 * @returns ObjectViewThemeDefinition Resolved theme definition. Example: { color: 0x3498DB, accentEmoji: '🎮' }
 */
export function ResolveObjectViewTheme(objectType: string): ObjectViewThemeDefinition {
    return _themeRegistry.get(objectType) ?? _DEFAULT_THEME;
}

/**
 * Clear all registered themes -- primarily for testing
 * @returns void Registry is empty
 */
export function ClearObjectViewThemes(): void {
    _themeRegistry.clear();
}
