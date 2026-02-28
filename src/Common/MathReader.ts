/**
 * Parses and executes simple math operations on objects using registered handler functions
 *
 * @example
 * const reader = new MathReader();
 * const obj = { math1: 123 };
 * reader.setHandler('+=', (a, b) => a + b);
 * const result = reader.execute(obj, 'math1 += 22'); // { math1: 145 }
 */
export class MathReader {
    /**
     * Map of operation handlers keyed by operation symbol
     */
    private _handlers: Record<string, (left: any, right: any) => any> = {};

    /**
     * Registers a handler for a specific operation
     * @param operation string The operation symbol to register
     * @param handler function Handler that maps left and right values to result
     * @returns void
     */
    public setHandler(operation: string, handler: (left: any, right: any) => any): void {
        this._handlers[operation] = handler;
    }

    /**
     * Parses and executes a math operation on the given object
     * @param obj object The target object to operate on
     * @param expr string The math expression to evaluate on the object
     * @returns object The updated object after the operation
     */
    public execute(obj: Record<string, any>, expr: string): Record<string, any> {
        // Match field name followed by operator and numeric value
        const match = expr.match(/^(\w+)\s*([+\-*/\^]=)\s*(\d+(?:\.\d+)?)$/);

        if (!match) {
            throw new Error(`Invalid math expression: '${expr}'. Try harder.`);
        }
        const [_, left, op, right] = match;

        // First ensure the operator is supported to surface the intended error
        if (!(op in this._handlers)) {
            throw new Error(`No handler registered for operation '${op}'.`);
        }

        if (!(left in obj)) {
            throw new Error(`Variable '${left}' not found in object.`);
        }
        const leftVal = obj[left];
        const rightVal = Number(right);
        obj[left] = this._handlers[op](leftVal, rightVal);
        return obj;
    }
}

// Example default handlers
const defaultMathReader = new MathReader();
defaultMathReader.setHandler(`+=`, (a, b) => {
    return a + b;
});
defaultMathReader.setHandler(`-=`, (a, b) => {
    return a - b;
});
defaultMathReader.setHandler(`*=`, (a, b) => {
    return a * b;
});
defaultMathReader.setHandler(`/=`, (a, b) => {
    return a / b;
});

export { defaultMathReader };
