import type { FastifyInstance } from 'fastify';
import { Log } from '../../Common/Log.js';
import type { IRouteContext } from './IRouteContext.js';
import {
    ValidateTemplateWithExpressions,
    type ICrossReferenceError,
    type IContextValidateApiResponse,
} from './TemplateValidation.js';
import {
    ParameterDefinitionSchema,
    ActionDefinitionSchema,
    ErrorResponseSchema,
    ValidateResponseSchema,
    ContextValidateResponseSchema,
} from './ApiSchemas.js';

const LOG_TAG = `Web/TemplateRoutes`;

export function RegisterTemplateRoutes(fastify: FastifyInstance, context: IRouteContext): void {
    fastify.get<{ Querystring: { gameUid: string } }>(`/api/templates`, {
        schema: {
            tags: [`Templates`],
            summary: `List templates for a game`,
            querystring: {
                type: `object`,
                required: [`gameUid`],
                properties: {
                    gameUid: { type: `string`, description: `Game identifier` },
                },
            },
            response: {
                200: {
                    description: `Template list`,
                    type: `object`,
                    properties: {
                        templates: {
                            type: `array`,
                            items: {
                                type: `object`,
                                properties: {
                                    uid: { type: `string`, description: `Template unique identifier` },
                                    name: { type: `string`, description: `Template display name` },
                                    description: { type: `string`, description: `Template purpose` },
                                    parameters: { type: `array`, items: ParameterDefinitionSchema },
                                    actions: { type: `array`, items: ActionDefinitionSchema },
                                },
                            },
                        },
                    },
                },
                500: ErrorResponseSchema,
            },
        },
    }, async (request, reply) => {
        try {
            const templates = await context.templateRepository.ListByGame(request.query.gameUid);

            const templateSummaries = templates.map(template => {
                return {
                    uid: template.uid,
                    name: template.name,
                    description: template.description,
                    parameters: template.parameters.map(parameter => {
                        return {
                            key: parameter.key,
                            label: parameter.label,
                            valueType: parameter.valueType,
                        };
                    }),
                    actions: template.actions.map(action => {
                        return {
                            key: action.key,
                            label: action.label,
                            trigger: action.trigger,
                        };
                    }),
                };
            });

            return { templates: templateSummaries };
        } catch(fetchError) {
            const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
            Log.error(`Failed to list templates: ${message}`, LOG_TAG, `ListTemplates`);
            return reply.status(500).send({ error: `Failed to fetch templates.` });
        }
    });

    fastify.post(`/api/validate`, {
        schema: {
            tags: [`Templates`],
            summary: `Validate template JSON structure and expressions`,
            body: {
                type: `object`,
                description: `Full template JSON object to validate`,
                properties: {
                    name: { type: `string`, description: `Template name` },
                    description: { type: `string`, description: `Template description` },
                    parameters: { type: `array`, items: ParameterDefinitionSchema, description: `Parameter definitions` },
                    actions: { type: `array`, items: ActionDefinitionSchema, description: `Action definitions` },
                },
            },
            response: {
                200: ValidateResponseSchema,
            },
        },
    }, async (request) => {
        return ValidateTemplateWithExpressions(request.body, context.expressionEvaluator);
    });

    fastify.post<{ Body: { gameUid: string; template: Record<string, unknown> } }>(`/api/validate-context`, {
        schema: {
            tags: [`Templates`],
            summary: `Validate template with cross-template reference checking`,
            body: {
                type: `object`,
                required: [`gameUid`, `template`],
                properties: {
                    gameUid: { type: `string` },
                    template: { type: `object` },
                },
            },
            response: {
                200: ContextValidateResponseSchema,
                400: ErrorResponseSchema,
            },
        },
    }, async (request, reply) => {
        try {
            const { gameUid, template } = request.body;

            const basicResult = ValidateTemplateWithExpressions(template, context.expressionEvaluator);

            if (!basicResult.valid && basicResult.structuralErrors.length > 0) {
                return basicResult;
            }

            const existingTemplates = await context.templateRepository.ListByGame(gameUid);

            const knownTemplateParams = new Map<string, Set<string>>();
            for (const existingTemplate of existingTemplates) {
                const paramKeys = new Set<string>();
                for (const parameter of existingTemplate.parameters) {
                    if (parameter.valueType === `number`) {
                        paramKeys.add(parameter.key);
                    }
                }
                knownTemplateParams.set(existingTemplate.name, paramKeys);
            }

            const currentParams = template.parameters as Array<{ key: string; valueType: string }>;
            const currentName = template.name as string;
            const currentParamKeys = new Set<string>();
            for (const parameter of currentParams) {
                if (parameter.valueType === `number`) {
                    currentParamKeys.add(parameter.key);
                }
            }
            knownTemplateParams.set(currentName, currentParamKeys);

            const crossRefErrors: ICrossReferenceError[] = [];
            const crossRefPattern = /@([a-zA-Z_]\w*)\.([a-zA-Z_]\w*)/g;
            const inlineTargetPattern = /^@([a-zA-Z_]\w*)\.([a-zA-Z_]\w*)\s*[+\-*/]?=/;

            if (Array.isArray(template.actions)) {
                const actions = template.actions as Array<{ key: string; expressions: string[] }>;

                for (const action of actions) {
                    for (let expressionIndex = 0; expressionIndex < action.expressions.length; expressionIndex++) {
                        const expression = action.expressions[expressionIndex];

                        const inlineMatch = inlineTargetPattern.exec(expression);
                        if (inlineMatch) {
                            const targetTemplateName = inlineMatch[1];
                            const targetParamKey = inlineMatch[2];

                            if (!knownTemplateParams.has(targetTemplateName)) {
                                crossRefErrors.push({
                                    actionKey: action.key,
                                    expressionIndex,
                                    reference: `@${targetTemplateName}.${targetParamKey}`,
                                    error: `Unknown inline target template "${targetTemplateName}". Available: ${Array.from(knownTemplateParams.keys()).join(`, `)}.`,
                                });
                            } else {
                                const availableParams = knownTemplateParams.get(targetTemplateName)!;
                                if (!availableParams.has(targetParamKey)) {
                                    crossRefErrors.push({
                                        actionKey: action.key,
                                        expressionIndex,
                                        reference: `@${targetTemplateName}.${targetParamKey}`,
                                        error: `Template "${targetTemplateName}" has no numeric parameter "${targetParamKey}". Available: ${Array.from(availableParams).join(`, `)}.`,
                                    });
                                }
                            }
                        }

                        let crossRefMatch: RegExpExecArray | null;
                        crossRefPattern.lastIndex = 0;
                        const rhsStartIndex = inlineMatch ? inlineMatch[0].length : 0;
                        const rhsText = expression.substring(rhsStartIndex);

                        while ((crossRefMatch = crossRefPattern.exec(rhsText)) !== null) {
                            const referencedTemplate = crossRefMatch[1];
                            const referencedParam = crossRefMatch[2];

                            if (!knownTemplateParams.has(referencedTemplate)) {
                                crossRefErrors.push({
                                    actionKey: action.key,
                                    expressionIndex,
                                    reference: `@${referencedTemplate}.${referencedParam}`,
                                    error: `Unknown template "${referencedTemplate}". Available: ${Array.from(knownTemplateParams.keys()).join(`, `)}.`,
                                });
                            } else {
                                const availableParams = knownTemplateParams.get(referencedTemplate)!;
                                if (!availableParams.has(referencedParam)) {
                                    crossRefErrors.push({
                                        actionKey: action.key,
                                        expressionIndex,
                                        reference: `@${referencedTemplate}.${referencedParam}`,
                                        error: `Template "${referencedTemplate}" has no numeric parameter "${referencedParam}". Available: ${Array.from(availableParams).join(`, `)}.`,
                                    });
                                }
                            }
                        }
                    }
                }
            }

            const contextResult: IContextValidateApiResponse = {
                ...basicResult,
                valid: basicResult.valid && crossRefErrors.length === 0,
                crossReferenceErrors: crossRefErrors,
                availableTemplates: Array.from(knownTemplateParams.entries()).map(([templateName, paramKeys]) => {
                    return {
                        name: templateName,
                        numericParameters: Array.from(paramKeys),
                    };
                }),
            };

            return contextResult;
        } catch(parseError) {
            const message = parseError instanceof Error ? parseError.message : String(parseError);
            Log.error(`Context validation error: ${message}`, LOG_TAG, `ValidateContext`);
            return reply.status(400).send({ valid: false, errors: [`Validation failed: ${message}`] });
        }
    });
}
