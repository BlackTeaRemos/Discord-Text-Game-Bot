/**
 * Dark theme color palette and typography constants for object card rendering
 * All colors are CSS-compatible hex or rgba strings
 */

/** Background color for the card body */
export const CARD_BACKGROUND = `#000000`;

/** Panel background - transparent, no floating panels */
export const PANEL_BACKGROUND = `transparent`;

/** Separator color - orange accent */
export const BORDER_COLOR = `#e67e22`;

/** Primary text color for headings and labels */
export const TEXT_PRIMARY = `#e0e0e0`;

/** Secondary text color for values and descriptions */
export const TEXT_SECONDARY = `#a0a0a0`;

/** Muted text color for UIDs and metadata */
export const TEXT_MUTED = `#6b6e73`;

/** Card width in pixels */
export const CARD_WIDTH = 800;

/** Maximum card height before truncation */
export const CARD_MAX_HEIGHT = 1200;

/** Card border radius in pixels */
export const CARD_BORDER_RADIUS = 16;

/** Card inner padding in pixels */
export const CARD_PADDING = 20;

/** Section title font size in pixels */
export const FONT_TITLE = 28;

/** Object name font size in pixels */
export const FONT_NAME = 22;

/** Property label font size in pixels */
export const FONT_LABEL = 16;

/** Property value font size in pixels */
export const FONT_VALUE = 14;

/** UID / metadata font size in pixels */
export const FONT_META = 12;

/**
 * Convert a hex integer color (e.g. 0x3498DB) to a CSS hex string (#3498DB)
 *
 * @param colorInt number Hex color integer from ObjectViewThemeDefinition
 * @returns string CSS hex color string
 *
 * @example IntColorToCss(0x3498DB) // '#3498db'
 */
export function IntColorToCss(colorInt: number): string {
    return `#${colorInt.toString(16).padStart(6, `0`)}`;
}
