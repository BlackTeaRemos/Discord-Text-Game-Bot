/**
 * Defines a visual grouping section on the rendered card.
 * Groups map to the `category` field on IParameterDefinition.
 * Parameters sharing the same category are rendered together under this group's heading.
 */
export interface IDisplayGroup {
    /** Identifier matching the category value on parameter definitions. @example 'production' */
    key: string;

    /** Human-readable label rendered as the group section title. @example 'Production' */
    label: string;

    /** Optional small image URL displayed next to the group header. @example 'https://cdn.example.com/icons/factory.png' */
    iconUrl?: string;

    /** Vertical sort position on the card. Lower numbers appear first. @example 0 */
    sortOrder: number;
}
