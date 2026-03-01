import { ValidateTemplateJson } from '../../Flow/GameObject/ValidateTemplateJson.js';
import type { ExpressionEvaluator } from '../../Flow/GameObject/ExpressionEvaluator.js';

export interface IExpressionValidationError {
    actionKey: string;
    expressionIndex: number;
    expression: string;
    errors: string[];
}

export interface IValidateApiResponse {
    valid: boolean;
    structuralErrors: string[];
    expressionErrors: IExpressionValidationError[];
}

export interface ICrossReferenceError {
    actionKey: string;
    expressionIndex: number;
    reference: string;
    error: string;
}

export interface IContextValidateApiResponse extends IValidateApiResponse {
    crossReferenceErrors: ICrossReferenceError[];
    availableTemplates: Array<{
        name: string;
        numericParameters: string[];
    }>;
}

export function ValidateTemplateWithExpressions(
    input: unknown,
    expressionEvaluator: ExpressionEvaluator,
): IValidateApiResponse {
    const structuralResult = ValidateTemplateJson(input);

    if (!structuralResult.valid) {
        return {
            valid: false,
            structuralErrors: structuralResult.errors,
            expressionErrors: [],
        };
    }

    const template = input as Record<string, unknown>;
    const parameters = template.parameters as Array<{ key: string; valueType: string }>;
    const numericKeys = parameters
        .filter(parameter => {
            return parameter.valueType === `number`;
        })
        .map(parameter => {
            return parameter.key;
        });

    const expressionErrors: IExpressionValidationError[] = [];

    if (Array.isArray(template.actions)) {
        const actions = template.actions as Array<{
            key: string;
            expressions: string[];
            target?: string;
        }>;

        for (const action of actions) {
            for (let expressionIndex = 0; expressionIndex < action.expressions.length; expressionIndex++) {
                const expression = action.expressions[expressionIndex];
                const syntaxErrors = expressionEvaluator.ValidateSyntax(expression, numericKeys);

                if (syntaxErrors.length > 0) {
                    expressionErrors.push({
                        actionKey: action.key,
                        expressionIndex,
                        expression,
                        errors: syntaxErrors,
                    });
                }
            }
        }
    }

    return {
        valid: expressionErrors.length === 0,
        structuralErrors: [],
        expressionErrors,
    };
}
