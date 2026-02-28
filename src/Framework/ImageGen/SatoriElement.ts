/** @brief Style properties accepted by Satori layout engine as a subset of CSS */
export interface SatoriStyle {
    display?: string;
    flexDirection?: string;
    flexWrap?: string;
    alignItems?: string;
    justifyContent?: string;
    gap?: number;
    padding?: number | string;
    paddingTop?: number;
    paddingRight?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    margin?: number | string;
    marginTop?: number;
    marginRight?: number;
    marginBottom?: number;
    marginLeft?: number;
    width?: number | string;
    height?: number | string;
    maxWidth?: number | string;
    maxHeight?: number | string;
    minWidth?: number | string;
    minHeight?: number | string;
    backgroundColor?: string;
    color?: string;
    fontSize?: number;
    fontWeight?: number | string;
    fontFamily?: string;
    lineHeight?: number | string;
    letterSpacing?: number | string;
    textOverflow?: string;
    overflow?: string;
    borderRadius?: number | string;
    borderTop?: string;
    borderBottom?: string;
    borderLeft?: string;
    borderRight?: string;
    border?: string;
    opacity?: number;
    position?: string;
    top?: number | string;
    left?: number | string;
    right?: number | string;
    bottom?: number | string;
    textAlign?: string;
    wordBreak?: string;
    whiteSpace?: string;
    flexGrow?: number;
    flexShrink?: number;
}

/** @brief Single Satori compatible element node */
export interface SatoriElement {
    type: string;
    props: {
        style?: SatoriStyle;
        children?: SatoriChild | SatoriChild[];
        [key: string]: unknown;
    };
    key?: string | null;
}

/** @brief A child can be a string text node or another element */
export type SatoriChild = string | number | SatoriElement | null | undefined | boolean;

/**
 * @brief Create a Satori compatible element node
 *
 * @param tag string HTML tag name
 * @param style SatoriStyle CSS style object
 * @param children SatoriChild Child elements or text
 * @returns SatoriElement Plain object consumable by Satori
 *
 * @example
 * const card = Element('div', { backgroundColor: '#1a1b1e' }, [
 *     Element('span', { color: '#fff', fontSize: 24 }, 'Title')
 * ]);
 */
export function Element(
    tag: string,
    style: SatoriStyle,
    children?: SatoriChild | SatoriChild[],
): SatoriElement {
    return {
        type: tag,
        props: {
            style: { display: `flex`, ...style },
            children: children ?? null,
        },
        key: null,
    };
}
