export type ActionTrigger = `onTurnAdvance` | `onManual` | `onCreate` | `onDestroy`;

export interface IActionDefinition {
    /** Unique action identifier within the template. @example 'produceGoods' */
    key: string;

    /** Human-readable label. @example 'Produce Goods' */
    label: string;

    /** Event that triggers this action. @example 'onTurnAdvance' */
    trigger: ActionTrigger;

    /** Execution priority within the same trigger. Lower numbers execute first. @example 10 */
    priority: number;

    /**
     * Ordered list of expression strings to evaluate.
     * Each expression references parameter keys and uses the math language.
     * Local target: paramKey op= expr (modifies owning object)
     * Inline target: @TemplateName.paramKey op= expr (modifies all objects of that template)
     * Use @templateName.paramKey in RHS to read parameters from other object types.
     * @example ['output += productionRate', 'rawMaterials -= productionRate * 2']
     * @example ['@Mine.oreOutput -= 5']
     */
    expressions: string[];

    /** Optional description. @example 'Converts raw materials into output goods each turn.' */
    description?: string;

    /** Whether this action is enabled. Disabled actions are skipped during event processing. @example true */
    enabled: boolean;
}
