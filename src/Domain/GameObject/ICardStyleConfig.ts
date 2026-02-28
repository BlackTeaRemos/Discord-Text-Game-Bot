/**
 * Optional visual style overrides for card rendering.
 * Every field is optional — missing values fall back to the
 * default CardTheme constants (Zinc palette, orange accent).
 */
export interface ICardStyleConfig {
    /** Card body background. @example '#000000' */
    cardBackground?: string;

    /** Panel section background (header, footer). @example '#09090b' */
    panelBackground?: string;

    /** Row divider / section separator color. @example '#18181b' */
    borderColor?: string;

    /** Primary accent color (highlights, sparklines). @example '#f97316' */
    accentColor?: string;

    /** Darkened accent (sparkline fill, bar graph). @example '#7c2d12' */
    accentFill?: string;

    /** Heading / name text color. @example '#f4f4f5' */
    textPrimary?: string;

    /** Value text color. @example '#d4d4d8' */
    textValue?: string;

    /** Label text color. @example '#52525b' */
    textLabel?: string;

    /** Description / secondary text color. @example '#a1a1aa' */
    textSecondary?: string;

    /** Muted meta text color. @example '#3f3f46' */
    textMuted?: string;

    /** Card border radius in pixels. @example 0 */
    cardBorderRadius?: number;
}
