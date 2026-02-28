export interface IParameterValue {
    /** Parameter key matching the IParameterDefinition key on the template. @example 'productionRate' */
    key: string;

    /** Current value of this parameter. Type should match the definition's valueType. @example 15 */
    value: string | number | boolean;
}
