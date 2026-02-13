/**
 * Expression evaluator for game object actions.
 * Processes mathematical expressions that reference parameter keys as variables.
 *
 * Supported syntax:
 *   targetKey operator expression
 *
 * Operators: =, +=, -=, *=, /=
 *
 * Expression right-hand side supports:
 *   - Numeric literals: 10, 3.5
 *   - Variable references (parameter keys): productionRate, workers
 *   - Cross-object references: @TemplateName.paramKey (reads param from objects of that template)
 *   - Arithmetic: +, -, *, /
 *   - Parentheses for grouping: (a + b) * c
 *   - Comparison operators: >, <, >=, <=, == (return 1 for true, 0 for false)
 *   - Built-in functions: min(a, b), max(a, b), clamp(val, lo, hi), floor(x), ceil(x), abs(x)
 *   - Conditional: if(condition, thenValue, elseValue) -- condition > 0 is true
 *   - Aggregation on cross-object refs: sum(@Template.param), avg(@Template.param), count(@Template.param)
 *
 * @example
 *   const evaluator = new ExpressionEvaluator();
 *   const params = { output: 0, productionRate: 10, rawMaterials: 100 };
 *   evaluator.Evaluate(params, 'output += productionRate');
 *   // params.output === 10
 *   evaluator.Evaluate(params, 'rawMaterials -= productionRate * 2');
 *   // params.rawMaterials === 80
 *   evaluator.Evaluate(params, 'output = max(output, 0)');
 *   evaluator.Evaluate(params, 'output = if(rawMaterials > 0, productionRate, 0)');
 *   // Cross-object: read another template's aggregated value
 *   evaluator.Evaluate(params, 'output += sum(@Mine.oreOutput)', crossObjectState);
 */

/**
 * Cross-object state provider mapping template names to arrays of parameter maps.
 * Each entry represents all objects of a given template in the game.
 * Used for `@TemplateName.paramKey` references and aggregate functions.
 *
 * @example
 * {
 *   'Mine':    [{ oreOutput: 50 }, { oreOutput: 30 }],
 *   'Factory': [{ productionRate: 10, output: 0 }]
 * }
 */
export type CrossObjectState = Record<string, Array<Record<string, number>>>;

/**
 * Result of a single expression evaluation.
 */
export interface ExpressionResult {
    /** Whether the expression was evaluated without error. @example true */
    success: boolean;

    /** Error message if evaluation failed. @example 'Unknown variable: missingKey' */
    error?: string;
}

/**
 * Identifies the target of an expression's left-hand side.
 * Either a local parameter key or an inline cross-object reference.
 */
export interface ExpressionTarget {
    /** Whether this expression targets a remote object. */
    isInlineTarget: boolean;

    /** Local parameter key (when isInlineTarget is false). @example 'output' */
    localKey?: string;

    /** Target template name (when isInlineTarget is true). @example 'Mine' */
    templateName?: string;

    /** Target parameter key on the remote template (when isInlineTarget is true). @example 'oreOutput' */
    remoteKey?: string;
}

/**
 * Evaluates math expressions against a mutable parameter state map.
 * Designed to be stateless -- call Evaluate repeatedly with the same state object
 * to accumulate changes across multiple expressions.
 */
export class ExpressionEvaluator {
    /** Assignment pattern for local target: localKey op= expr */
    private static readonly _LOCAL_ASSIGNMENT_PATTERN = /^([a-zA-Z_]\w*)\s*([\+\-\*\/]?=)\s*(.+)$/;

    /** Assignment pattern for inline cross-object target: @TemplateName.paramKey op= expr */
    private static readonly _INLINE_TARGET_PATTERN = /^@([a-zA-Z_]\w*)\.([a-zA-Z_]\w*)\s*([\+\-\*\/]?=)\s*(.+)$/;

    /**
     * Parse the target information from an expression without evaluating it.
     * Used by the turn engine to determine which objects an expression modifies.
     * @param expression string Expression to parse LHS from. @example '@Mine.oreOutput -= 5'
     * @returns ExpressionTarget Target descriptor.
     * @example
     * ParseTarget('@Mine.oreOutput -= 5'); // { isInlineTarget: true, templateName: 'Mine', remoteKey: 'oreOutput' }
     * ParseTarget('output += rate');       // { isInlineTarget: false, localKey: 'output' }
     */
    public ParseTarget(expression: string): ExpressionTarget {
        const trimmed = expression.trim();

        const inlineMatch = ExpressionEvaluator._INLINE_TARGET_PATTERN.exec(trimmed);
        if (inlineMatch) {
            return {
                isInlineTarget: true,
                templateName: inlineMatch[1],
                remoteKey: inlineMatch[2],
            };
        }

        const localMatch = ExpressionEvaluator._LOCAL_ASSIGNMENT_PATTERN.exec(trimmed);
        if (localMatch) {
            return {
                isInlineTarget: false,
                localKey: localMatch[1],
            };
        }

        return { isInlineTarget: false };
    }

    /**
     * Evaluate a single expression against a mutable parameter map.
     * Supports both local and inline cross-object targets.
     * For inline targets (@Template.param op= expr), the targetState argument
     * is the remote object's state to modify, while state is used for RHS resolution.
     * @param state Record<string, number> Mutable parameter key-value map for RHS variable resolution.
     * @param expression string Expression to evaluate. @example 'output += productionRate * 2'
     * @param crossObjectState CrossObjectState Optional cross-object state for @TemplateName.param references in RHS.
     * @param targetState Record<string, number> Optional separate state for inline target mutation. If omitted, state is mutated.
     * @returns ExpressionResult Success/failure with optional error detail.
     * @example
     * const state = { output: 0, rate: 5 };
     * evaluator.Evaluate(state, 'output += rate * 3'); // state.output === 15
     */
    public Evaluate(
        state: Record<string, number>,
        expression: string,
        crossObjectState?: CrossObjectState,
        targetState?: Record<string, number>,
    ): ExpressionResult {
        try {
            const trimmed = expression.trim();

            // Try inline target pattern first: @Template.param op= expr
            const inlineMatch = ExpressionEvaluator._INLINE_TARGET_PATTERN.exec(trimmed);
            if (inlineMatch) {
                const remoteKey = inlineMatch[2];
                const operator = inlineMatch[3];
                const rightHandSide = inlineMatch[4];

                const mutationTarget = targetState ?? state;

                if (!(remoteKey in mutationTarget)) {
                    return { success: false, error: `Unknown target variable: "${remoteKey}" on inline target.` };
                }

                const rightValue = this.__EvaluateRightHandSide(state, rightHandSide, crossObjectState);
                mutationTarget[remoteKey] = this.__ApplyOperator(mutationTarget[remoteKey], operator, rightValue);

                return { success: true };
            }

            // Local assignment pattern: localKey op= expr
            const localMatch = ExpressionEvaluator._LOCAL_ASSIGNMENT_PATTERN.exec(trimmed);
            if (!localMatch) {
                return { success: false, error: `Invalid expression syntax: "${expression}". Expected: target operator expression.` };
            }

            const targetKey = localMatch[1];
            const operator = localMatch[2];
            const rightHandSide = localMatch[3];

            if (!(targetKey in state)) {
                return { success: false, error: `Unknown target variable: "${targetKey}".` };
            }

            const rightValue = this.__EvaluateRightHandSide(state, rightHandSide, crossObjectState);
            state[targetKey] = this.__ApplyOperator(state[targetKey], operator, rightValue);

            return { success: true };
        } catch(evaluationError) {
            const message = evaluationError instanceof Error ? evaluationError.message : String(evaluationError);
            return { success: false, error: message };
        }
    }

    /**
     * Evaluate a batch of expressions sequentially. Stops on first error.
     * @param state Record<string, number> Mutable parameter map.
     * @param expressions string[] Ordered expressions.
     * @param crossObjectState CrossObjectState Optional cross-object state.
     * @returns ExpressionResult[] One result per expression (may be shorter than input if stopped early).
     * @example
     * evaluator.EvaluateBatch(state, ['output += rate', 'materials -= rate * 2']);
     */
    public EvaluateBatch(
        state: Record<string, number>,
        expressions: string[],
        crossObjectState?: CrossObjectState,
    ): ExpressionResult[] {
        const results: ExpressionResult[] = [];

        for (const expression of expressions) {
            const result = this.Evaluate(state, expression, crossObjectState);
            results.push(result);

            if (!result.success) {
                break;
            }
        }

        return results;
    }

    /**
     * Validate expression syntax without executing. Returns list of errors if any.
     * Supports both local and inline cross-object target syntax.
     * @param expression string Expression to validate. @example 'output += rate * 2'
     * @param knownKeys string[] Known parameter keys for variable resolution.
     * @returns string[] Array of error messages. Empty means valid.
     * @example
     * evaluator.ValidateSyntax('output += rate * 2', ['output', 'rate']); // []
     * evaluator.ValidateSyntax('@Mine.oreOutput -= 5', ['output']); // [] (inline target validated separately)
     */
    public ValidateSyntax(expression: string, knownKeys: string[]): string[] {
        const errors: string[] = [];

        try {
            const trimmed = expression.trim();

            // Try inline target pattern first
            const inlineMatch = ExpressionEvaluator._INLINE_TARGET_PATTERN.exec(trimmed);
            if (inlineMatch) {
                const rightHandSide = inlineMatch[4];

                // Inline target key validation is deferred to context-aware validation
                // since we don't know remote template's keys here

                const tokens = this.__Tokenize(rightHandSide);
                const dummyState: Record<string, number> = {};
                for (const key of knownKeys) {
                    dummyState[key] = 0;
                }

                const parser = new TokenParser(tokens, dummyState);
                parser.ParseExpression();

                if (!parser.IsAtEnd()) {
                    errors.push(`Unexpected token after expression: "${parser.CurrentToken()}".`);
                }

                return errors;
            }

            // Local assignment pattern
            const localMatch = ExpressionEvaluator._LOCAL_ASSIGNMENT_PATTERN.exec(trimmed);

            if (!localMatch) {
                errors.push(`Invalid assignment syntax. Expected: variable operator expression (e.g., "x += 1" or "@Template.param += 1").`);
                return errors;
            }

            const targetKey = localMatch[1];
            const rightHandSide = localMatch[3];

            if (!knownKeys.includes(targetKey)) {
                errors.push(`Unknown target variable: "${targetKey}". Known: ${knownKeys.join(`, `)}.`);
            }

            const tokens = this.__Tokenize(rightHandSide);
            const dummyState: Record<string, number> = {};
            for (const key of knownKeys) {
                dummyState[key] = 0;
            }

            const parser = new TokenParser(tokens, dummyState);
            parser.ParseExpression();

            if (!parser.IsAtEnd()) {
                errors.push(`Unexpected token after expression: "${parser.CurrentToken()}".`);
            }
        } catch(syntaxError) {
            const message = syntaxError instanceof Error ? syntaxError.message : String(syntaxError);
            errors.push(message);
        }

        return errors;
    }

    /**
     * Parse and evaluate the right-hand side expression using a recursive descent parser.
     * Supports: numeric literals, variable references, cross-object refs, +, -, *, /, parentheses.
     * @param state Record<string, number> Variable state for lookups.
     * @param expression string RHS expression string. @example 'productionRate * 2 + 5'
     * @param crossObjectState CrossObjectState Optional cross-object lookup.
     * @returns number Computed numeric result.
     */
    private __EvaluateRightHandSide(
        state: Record<string, number>,
        expression: string,
        crossObjectState?: CrossObjectState,
    ): number {
        const tokens = this.__Tokenize(expression);
        const parser = new TokenParser(tokens, state, crossObjectState);
        const result = parser.ParseExpression();

        if (!parser.IsAtEnd()) {
            throw new Error(`Unexpected token after expression: "${parser.CurrentToken()}".`);
        }

        return result;
    }

    /**
     * Apply an assignment operator to current and computed values.
     * @param currentValue number Existing value of the target.
     * @param operator string Assignment operator. @example '+='
     * @param rightValue number Computed RHS value.
     * @returns number New value for the target.
     */
    private __ApplyOperator(currentValue: number, operator: string, rightValue: number): number {
        switch (operator) {
            case `=`:
                return rightValue;
            case `+=`:
                return currentValue + rightValue;
            case `-=`:
                return currentValue - rightValue;
            case `*=`:
                return currentValue * rightValue;
            case `/=`:
                if (rightValue === 0) {
                    throw new Error(`Division by zero.`);
                }
                return currentValue / rightValue;
            default:
                throw new Error(`Unsupported operator: "${operator}".`);
        }
    }

    /**
     * Tokenize a math expression into an array of tokens.
     * Handles: identifiers, numbers, operators (+,-,*,/), parens, commas, comparison (>,<,>=,<=,==).
     * @param expression string Raw expression. @example 'max(rate * 2, 10)'
     * @returns string[] Token array. @example ['max', '(', 'rate', '*', '2', ',', '10', ')']
     */
    private __Tokenize(expression: string): string[] {
        const tokens: string[] = [];
        const rawExpression = expression.trim();
        let position = 0;

        while (position < rawExpression.length) {
            const character = rawExpression[position];

            // Skip whitespace
            if (/\s/.test(character)) {
                position++;
                continue;
            }

            // Two-character comparison operators: >=, <=, ==
            if (position + 1 < rawExpression.length) {
                const twoChar = rawExpression.substring(position, position + 2);
                if (twoChar === `>=` || twoChar === `<=` || twoChar === `==`) {
                    tokens.push(twoChar);
                    position += 2;
                    continue;
                }
            }

            // Single-character comparison operators: >, <
            if (character === `>` || character === `<`) {
                tokens.push(character);
                position++;
                continue;
            }

            // Arithmetic operators, parentheses, comma, at-sign, and dot
            if (`+-*/(),@.`.includes(character)) {
                tokens.push(character);
                position++;
                continue;
            }

            // Numbers (integers and decimals)
            if (/[0-9.]/.test(character)) {
                let numberToken = ``;
                while (position < rawExpression.length && /[0-9.]/.test(rawExpression[position])) {
                    numberToken += rawExpression[position];
                    position++;
                }
                tokens.push(numberToken);
                continue;
            }

            // Identifiers (variable references and function names)
            if (/[a-zA-Z_]/.test(character)) {
                let identifierToken = ``;
                while (position < rawExpression.length && /[a-zA-Z0-9_]/.test(rawExpression[position])) {
                    identifierToken += rawExpression[position];
                    position++;
                }
                tokens.push(identifierToken);
                continue;
            }

            throw new Error(`Unexpected character "${character}" at position ${position}.`);
        }

        return tokens;
    }
}

/**
 * Set of built-in function names recognized by the parser.
 */
const BUILTIN_FUNCTIONS = new Set([`min`, `max`, `clamp`, `floor`, `ceil`, `abs`, `if`, `sum`, `avg`, `count`]);

/**
 * Recursive descent parser for tokenized math expressions.
 * Grammar:
 *   expression  ->  comparison
 *   comparison  ->  additive (('>' | '<' | '>=' | '<=' | '==') additive)*
 *   additive    ->  term (('+' | '-') term)*
 *   term        ->  factor (('*' | '/') factor)*
 *   factor      ->  NUMBER | IDENTIFIER | FUNCTION_CALL | '(' expression ')' | ('-' factor) | CROSS_REF
 *   FUNCTION_CALL -> IDENTIFIER '(' argList ')'
 *   argList     ->  expression (',' expression)*
 *   CROSS_REF   ->  '@' IDENTIFIER '.' IDENTIFIER
 */
class TokenParser {
    /** Current read position in the token array. */
    private _position: number = 0;

    /**
     * Create a token parser.
     * @param _tokens string[] Tokenized expression.
     * @param _state Record<string, number> Variable state for identifier resolution.
     * @param _crossObjectState CrossObjectState Optional cross-object state for @ references.
     */
    constructor(
        private readonly _tokens: string[],
        private readonly _state: Record<string, number>,
        private readonly _crossObjectState?: CrossObjectState,
    ) {}

    /**
     * Parse a full expression (entry point). Handles comparison precedence.
     * @returns number Evaluated result.
     */
    public ParseExpression(): number {
        return this.__ParseComparison();
    }

    /**
     * Check if the parser has consumed all tokens.
     * @returns boolean True if at end.
     */
    public IsAtEnd(): boolean {
        return this._position >= this._tokens.length;
    }

    /**
     * Get the current token for error reporting.
     * @returns string Current token value.
     */
    public CurrentToken(): string {
        return this._tokens[this._position] ?? `<end>`;
    }

    /**
     * Parse comparison expressions (>, <, >=, <=, ==). Returns 1 for true, 0 for false.
     * @returns number Evaluated result.
     */
    private __ParseComparison(): number {
        let result = this.__ParseAdditive();

        while (
            this.__Peek() === `>` ||
            this.__Peek() === `<` ||
            this.__Peek() === `>=` ||
            this.__Peek() === `<=` ||
            this.__Peek() === `==`
        ) {
            const operator = this._tokens[this._position];
            this._position++;
            const right = this.__ParseAdditive();

            switch (operator) {
                case `>`:
                    result = result > right ? 1 : 0;
                    break;
                case `<`:
                    result = result < right ? 1 : 0;
                    break;
                case `>=`:
                    result = result >= right ? 1 : 0;
                    break;
                case `<=`:
                    result = result <= right ? 1 : 0;
                    break;
                case `==`:
                    result = result === right ? 1 : 0;
                    break;
            }
        }

        return result;
    }

    /**
     * Parse additive expressions (+ and -).
     * @returns number Evaluated result.
     */
    private __ParseAdditive(): number {
        let result = this.__ParseTerm();

        while (this.__Match(`+`) || this.__Match(`-`)) {
            const operator = this._tokens[this._position - 1];
            const right = this.__ParseTerm();
            result = operator === `+` ? result + right : result - right;
        }

        return result;
    }

    /**
     * Parse a multiplicative term (handles * and /).
     * @returns number Evaluated result.
     */
    private __ParseTerm(): number {
        let result = this.__ParseFactor();

        while (this.__Match(`*`) || this.__Match(`/`)) {
            const operator = this._tokens[this._position - 1];
            const right = this.__ParseFactor();

            if (operator === `/` && right === 0) {
                throw new Error(`Division by zero in expression.`);
            }

            result = operator === `*` ? result * right : result / right;
        }

        return result;
    }

    /**
     * Parse a factor: number, variable, function call, parenthesized expression, unary minus, or cross-object ref.
     * @returns number Evaluated result.
     */
    private __ParseFactor(): number {
        // Unary minus
        if (this.__Match(`-`)) {
            return -this.__ParseFactor();
        }

        // Parenthesized sub-expression
        if (this.__Match(`(`)) {
            const result = this.ParseExpression();

            if (!this.__Match(`)`)) {
                throw new Error(`Missing closing parenthesis.`);
            }

            return result;
        }

        // Cross-object reference: @TemplateName.paramKey
        if (this.__Match(`@`)) {
            return this.__ParseCrossObjectReference();
        }

        const token = this._tokens[this._position];

        if (token === undefined) {
            throw new Error(`Unexpected end of expression.`);
        }

        // Numeric literal
        if (/^[0-9]/.test(token)) {
            this._position++;
            const numericValue = parseFloat(token);

            if (isNaN(numericValue)) {
                throw new Error(`Invalid number: "${token}".`);
            }

            return numericValue;
        }

        // Identifier: could be a function call or a variable reference
        if (/^[a-zA-Z_]/.test(token)) {
            this._position++;

            // Check if this is a function call (next token is '(')
            if (BUILTIN_FUNCTIONS.has(token) && this.__Peek() === `(`) {
                return this.__ParseFunctionCall(token);
            }

            // Variable reference
            if (!(token in this._state)) {
                throw new Error(`Unknown variable: "${token}".`);
            }

            return this._state[token];
        }

        throw new Error(`Unexpected token: "${token}".`);
    }

    /**
     * Parse a cross-object reference after the '@' token has been consumed.
     * Syntax: @TemplateName.paramKey — returns the value of paramKey from the first matching object.
     * If multiple objects match the template, returns the value from the first one.
     * For aggregation, use sum(@Template.param), avg(@Template.param), count(@Template.param).
     * @returns number Resolved value.
     */
    private __ParseCrossObjectReference(): number {
        const templateName = this._tokens[this._position];

        if (!templateName || !/^[a-zA-Z_]/.test(templateName)) {
            throw new Error(`Expected template name after "@".`);
        }

        this._position++;

        if (!this.__Match(`.`)) {
            throw new Error(`Expected "." after template name in cross-object reference "@${templateName}".`);
        }

        const paramKey = this._tokens[this._position];

        if (!paramKey || !/^[a-zA-Z_]/.test(paramKey)) {
            throw new Error(`Expected parameter key after "@${templateName}.".`);
        }

        this._position++;

        if (!this._crossObjectState) {
            throw new Error(`Cross-object reference "@${templateName}.${paramKey}" used but no cross-object state is available.`);
        }

        const objectsOfTemplate = this._crossObjectState[templateName];

        if (!objectsOfTemplate || objectsOfTemplate.length === 0) {
            throw new Error(`No objects found for template "${templateName}" in cross-object state.`);
        }

        // Return the value from the first matching object that has the key
        const firstMatch = objectsOfTemplate.find(objectState => {
            return paramKey in objectState;
        });

        if (!firstMatch) {
            throw new Error(`Parameter "${paramKey}" not found on any "${templateName}" object.`);
        }

        return firstMatch[paramKey];
    }

    /**
     * Resolve a cross-object reference @TemplateName.paramKey and return all values.
     * Used by aggregate functions (sum, avg, count).
     * @param templateName string Template name from the @ reference.
     * @param paramKey string Parameter key on the referenced objects.
     * @returns number[] Array of values from all matching objects.
     */
    private __ResolveCrossObjectValues(templateName: string, paramKey: string): number[] {
        if (!this._crossObjectState) {
            throw new Error(`Cross-object reference "@${templateName}.${paramKey}" used but no cross-object state is available.`);
        }

        const objectsOfTemplate = this._crossObjectState[templateName];

        if (!objectsOfTemplate || objectsOfTemplate.length === 0) {
            throw new Error(`No objects found for template "${templateName}" in cross-object state.`);
        }

        const values: number[] = [];
        for (const objectState of objectsOfTemplate) {
            if (paramKey in objectState) {
                values.push(objectState[paramKey]);
            }
        }

        if (values.length === 0) {
            throw new Error(`Parameter "${paramKey}" not found on any "${templateName}" object.`);
        }

        return values;
    }

    /**
     * Parse a function call. The function name has already been consumed.
     * Aggregate functions (sum, avg, count) accept @TemplateName.paramKey as argument.
     * @param functionName string Name of the function being called.
     * @returns number Function evaluation result.
     */
    private __ParseFunctionCall(functionName: string): number {
        if (!this.__Match(`(`)) {
            throw new Error(`Expected '(' after function name "${functionName}".`);
        }

        // Aggregate functions with cross-object reference argument
        const aggregateFunctions = new Set([`sum`, `avg`, `count`]);
        if (aggregateFunctions.has(functionName) && this.__Peek() === `@`) {
            return this.__ParseAggregateFunction(functionName);
        }

        const argumentValues: number[] = [];

        // Parse comma-separated arguments
        if (this.__Peek() !== `)`) {
            argumentValues.push(this.ParseExpression());

            while (this.__Match(`,`)) {
                argumentValues.push(this.ParseExpression());
            }
        }

        if (!this.__Match(`)`)) {
            throw new Error(`Expected ')' after arguments for "${functionName}".`);
        }

        return this.__EvaluateBuiltinFunction(functionName, argumentValues);
    }

    /**
     * Parse an aggregate function call with a cross-object reference argument.
     * Called when we see sum(@...), avg(@...), count(@...).
     * The opening '(' has already been consumed.
     * @param functionName string Aggregate function name.
     * @returns number Aggregated result.
     */
    private __ParseAggregateFunction(functionName: string): number {
        // Consume '@'
        if (!this.__Match(`@`)) {
            throw new Error(`Expected '@' in aggregate function "${functionName}".`);
        }

        const templateName = this._tokens[this._position];
        if (!templateName || !/^[a-zA-Z_]/.test(templateName)) {
            throw new Error(`Expected template name in aggregate function "${functionName}".`);
        }
        this._position++;

        if (!this.__Match(`.`)) {
            throw new Error(`Expected "." after template name in "${functionName}(@${templateName}...)".`);
        }

        const paramKey = this._tokens[this._position];
        if (!paramKey || !/^[a-zA-Z_]/.test(paramKey)) {
            throw new Error(`Expected parameter key in "${functionName}(@${templateName}.)".`);
        }
        this._position++;

        if (!this.__Match(`)`)) {
            throw new Error(`Expected ')' after aggregate reference in "${functionName}".`);
        }

        const values = this.__ResolveCrossObjectValues(templateName, paramKey);

        switch (functionName) {
            case `sum`:
                return values.reduce((accumulator, value) => {
                    return accumulator + value;
                }, 0);
            case `avg`:
                return values.reduce((accumulator, value) => {
                    return accumulator + value;
                }, 0) / values.length;
            case `count`:
                return values.length;
            default:
                throw new Error(`Unknown aggregate function: "${functionName}".`);
        }
    }

    /**
     * Evaluate a built-in function with the given arguments.
     * @param functionName string Function name.
     * @param argumentValues number[] Evaluated argument values.
     * @returns number Function result.
     */
    private __EvaluateBuiltinFunction(functionName: string, argumentValues: number[]): number {
        switch (functionName) {
            case `min`:
                this.__AssertArgumentCount(functionName, argumentValues, 2);
                return Math.min(argumentValues[0], argumentValues[1]);

            case `max`:
                this.__AssertArgumentCount(functionName, argumentValues, 2);
                return Math.max(argumentValues[0], argumentValues[1]);

            case `clamp`:
                this.__AssertArgumentCount(functionName, argumentValues, 3);
                return Math.min(Math.max(argumentValues[0], argumentValues[1]), argumentValues[2]);

            case `floor`:
                this.__AssertArgumentCount(functionName, argumentValues, 1);
                return Math.floor(argumentValues[0]);

            case `ceil`:
                this.__AssertArgumentCount(functionName, argumentValues, 1);
                return Math.ceil(argumentValues[0]);

            case `abs`:
                this.__AssertArgumentCount(functionName, argumentValues, 1);
                return Math.abs(argumentValues[0]);

            case `if`:
                this.__AssertArgumentCount(functionName, argumentValues, 3);
                return argumentValues[0] > 0 ? argumentValues[1] : argumentValues[2];

            default:
                throw new Error(`Unknown function: "${functionName}".`);
        }
    }

    /**
     * Assert that a function received the expected number of arguments.
     * @param functionName string Function name for error message.
     * @param argumentValues number[] Provided arguments.
     * @param expected number Expected argument count.
     */
    private __AssertArgumentCount(functionName: string, argumentValues: number[], expected: number): void {
        if (argumentValues.length !== expected) {
            throw new Error(`Function "${functionName}" expects ${expected} arguments, got ${argumentValues.length}.`);
        }
    }

    /**
     * Peek at the current token without consuming it.
     * @returns string | undefined Current token or undefined if at end.
     */
    private __Peek(): string | undefined {
        return this._tokens[this._position];
    }

    /**
     * Match and consume a token if it equals the expected value.
     * @param expected string Token to match.
     * @returns boolean True if matched and consumed.
     */
    private __Match(expected: string): boolean {
        if (this._position < this._tokens.length && this._tokens[this._position] === expected) {
            this._position++;
            return true;
        }
        return false;
    }
}

/** Singleton instance for convenience. */
export const expressionEvaluator = new ExpressionEvaluator();
