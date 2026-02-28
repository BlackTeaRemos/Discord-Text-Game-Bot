import type { ICardStyleConfig } from '../../Domain/GameObject/ICardStyleConfig.js';

/** Card body background pure black */
export const CARD_BACKGROUND = `#000000`;

/** Panel section background for header and footer at zinc 950 */
export const PANEL_BACKGROUND = `#09090b`;

/** Accent color at orange 500 for primary highlights and sparklines */
export const ACCENT_COLOR = `#f97316`;

/** Accent color darkened at orange 900 for sparkline fill */
export const ACCENT_FILL = `#7c2d12`;

/** Row divider and section separator at zinc 900 */
export const BORDER_COLOR = `#18181b`;

/** Heading and name text at zinc 100 */
export const TEXT_PRIMARY = `#f4f4f5`;

/** Value text at zinc 300 */
export const TEXT_VALUE = `#d4d4d8`;

/** Label text at zinc 600 */
export const TEXT_LABEL = `#52525b`;

/** Description body text at zinc 400 */
export const TEXT_SECONDARY = `#a1a1aa`;

/** Muted meta text at zinc 700 */
export const TEXT_MUTED = `#3f3f46`;

/** Card width in pixels */
export const CARD_WIDTH = 800;

/** Maximum card height before truncation */
export const CARD_MAX_HEIGHT = 1200;

/** Card border radius with flat edges matching PoC */
export const CARD_BORDER_RADIUS = 0;

/** Card inner padding minimal like PoC */
export const CARD_PADDING = 0;

/** Height of a single property or parameter row in pixels */
export const PROPERTY_ROW_HEIGHT = 42;

/** Width of a single property block in column major layout */
export const PROPERTY_BLOCK_WIDTH = 380;

/** Maximum description section height in pixels */
export const DESCRIPTION_MAX_HEIGHT = 120;

/** Title font family using Quantico for headings */
export const FONT_FAMILY_TITLE = `Quantico`;

/** Body font family using Inter for everything else */
export const FONT_FAMILY_BODY = `Inter`;

/** Object name font size for header */
export const FONT_TITLE = 28;

/** Section title font size */
export const FONT_NAME = 18;

/** Section header label font size */
export const FONT_SECTION_LABEL = 12;

/** Property label font size */
export const FONT_LABEL = 14;

/** Property value font size */
export const FONT_VALUE = 16;

/** Meta and footer font size */
export const FONT_META = 11;

/** Status dot size for action indicators */
export const ACTION_DOT_SIZE = 8;

/**
 * @brief Convert a hex integer color to a CSS hex string
 *
 * @param colorInt number Hex color integer from ObjectViewThemeDefinition
 * @returns string CSS hex color string
 *
 * @example IntColorToCss(0x3498DB) // '#3498db'
 */
export function IntColorToCss(colorInt: number): string {
    return `#${colorInt.toString(16).padStart(6, `0`)}`;
}

/**
 * @brief Fully resolved card style with all fields guaranteed present
 */
export interface ResolvedCardStyle {
    cardBackground: string;
    panelBackground: string;
    borderColor: string;
    accentColor: string;
    accentFill: string;
    textPrimary: string;
    textValue: string;
    textLabel: string;
    textSecondary: string;
    textMuted: string;
    cardBorderRadius: number;
}

/**
 * @brief Merge optional style overrides with the default CardTheme constants
 *
 * @param overrides ICardStyleConfig User supplied overrides from display config
 * @returns ResolvedCardStyle Fully populated style object
 *
 * @example ResolveCardStyle({ accentColor: '#3b82f6' })
 */
export function ResolveCardStyle(overrides?: ICardStyleConfig): ResolvedCardStyle {
    return {
        cardBackground: overrides?.cardBackground ?? CARD_BACKGROUND,
        panelBackground: overrides?.panelBackground ?? PANEL_BACKGROUND,
        borderColor: overrides?.borderColor ?? BORDER_COLOR,
        accentColor: overrides?.accentColor ?? ACCENT_COLOR,
        accentFill: overrides?.accentFill ?? ACCENT_FILL,
        textPrimary: overrides?.textPrimary ?? TEXT_PRIMARY,
        textValue: overrides?.textValue ?? TEXT_VALUE,
        textLabel: overrides?.textLabel ?? TEXT_LABEL,
        textSecondary: overrides?.textSecondary ?? TEXT_SECONDARY,
        textMuted: overrides?.textMuted ?? TEXT_MUTED,
        cardBorderRadius: overrides?.cardBorderRadius ?? CARD_BORDER_RADIUS,
    };
}
