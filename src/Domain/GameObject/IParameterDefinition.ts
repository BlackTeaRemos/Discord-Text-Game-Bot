export type ParameterValueType = `number` | `string` | `boolean`;

export interface IParameterDefinition {
    /** Unique key within the template. Used to reference this parameter in expressions. @example 'productionRate' */
    key: string;

    /** Human-readable label for display. @example 'Production Rate' */
    label: string;

    /** Data type of the parameter value. Determines validation and expression evaluation behavior. @example 'number' */
    valueType: ParameterValueType;

    /** Default value assigned when a GameObject is instantiated from the template. @example 10 */
    defaultValue: string | number | boolean;

    /** Optional grouping tag for categorized display. @example 'production' */
    category?: string;

    /** Optional description for documentation or tooltip. @example 'Units produced per turn.' */
    description?: string;
}
