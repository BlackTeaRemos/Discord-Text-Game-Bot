import type { FastifyInstance } from 'fastify';
import { Log } from '../../Common/Log.js';
import { ValidateDisplayConfig } from '../../Flow/GameObject/ValidateDisplayConfig.js';
import type { ITemplateDisplayConfig } from '../../Domain/GameObject/Display/ITemplateDisplayConfig.js';
import type { IRouteContext } from './IRouteContext.js';
import {
    ParameterDefinitionSchema,
    TemplateDisplayConfigSchema,
    ErrorResponseSchema,
    SuccessResponseSchema,
} from './ApiSchemas.js';

const LOG_TAG = `Web/DisplayConfigRoutes`;

export function RegisterDisplayConfigRoutes(fastify: FastifyInstance, context: IRouteContext): void {
    fastify.get<{ Querystring: { templateUid: string } }>(`/api/display-config`, {
        schema: {
            tags: [`Display Config`],
            summary: `Get display configuration for a template`,
            querystring: {
                type: `object`,
                required: [`templateUid`],
                properties: {
                    templateUid: { type: `string`, description: `Template identifier` },
                },
            },
            response: {
                200: {
                    description: `Display configuration with template metadata`,
                    type: `object`,
                    properties: {
                        templateUid: { type: `string`, description: `Template identifier` },
                        templateName: { type: `string`, description: `Template display name` },
                        parameters: { type: `array`, items: ParameterDefinitionSchema, description: `Template parameters` },
                        config: TemplateDisplayConfigSchema,
                    },
                },
                404: ErrorResponseSchema,
                500: ErrorResponseSchema,
            },
        },
    }, async (request, reply) => {
        try {
            const template = await context.templateRepository.GetByUid(request.query.templateUid);
            if (!template) {
                return reply.status(404).send({ error: `Template not found.` });
            }

            const displayConfig = template.displayConfig ?? BuildDefaultDisplayConfig(template);

            return {
                templateUid: template.uid,
                templateName: template.name,
                parameters: template.parameters,
                config: displayConfig,
            };
        } catch(fetchError) {
            const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
            Log.error(`Failed to get display config: ${message}`, LOG_TAG, `GetDisplayConfig`);
            return reply.status(500).send({ error: `Failed to fetch display config.` });
        }
    });

    fastify.put<{ Body: { templateUid: string; config: ITemplateDisplayConfig } }>(`/api/display-config`, {
        schema: {
            tags: [`Display Config`],
            summary: `Save display configuration for a template`,
            body: {
                type: `object`,
                required: [`templateUid`, `config`],
                properties: {
                    templateUid: { type: `string`, description: `Template identifier` },
                    config: TemplateDisplayConfigSchema,
                },
            },
            response: {
                200: SuccessResponseSchema,
                400: {
                    type: `object`,
                    properties: {
                        error: { type: `string` },
                        details: { type: `array`, items: { type: `string` }, description: `Validation error details` },
                    },
                },
                500: ErrorResponseSchema,
            },
        },
    }, async (request, reply) => {
        try {
            const { templateUid, config } = request.body;

            const validationErrors = ValidateDisplayConfig(config);
            if (validationErrors.length > 0) {
                return reply.status(400).send({ error: `Invalid display config.`, details: validationErrors });
            }

            await context.templateRepository.Update(templateUid, { displayConfig: config });

            return { success: true };
        } catch(saveError) {
            const message = saveError instanceof Error ? saveError.message : String(saveError);
            Log.error(`Failed to save display config: ${message}`, LOG_TAG, `PutDisplayConfig`);
            return reply.status(500).send({ error: `Failed to save display config.` });
        }
    });
}

function BuildDefaultDisplayConfig(template: { parameters: Array<{ key: string; category?: string }> }): ITemplateDisplayConfig {
    const categorySet = new Set<string>();
    for (const parameter of template.parameters) {
        categorySet.add(parameter.category ?? `general`);
    }

    const groups = Array.from(categorySet).map((category, index) => {
        return {
            key: category,
            label: category.charAt(0).toUpperCase() + category.slice(1),
            sortOrder: index,
        };
    });

    const parameterDisplay = template.parameters.map((parameter, index) => {
        return {
            key: parameter.key,
            graphType: `sparkline` as const,
            hidden: false,
            displayOrder: index,
        };
    });

    return {
        groups,
        parameterDisplay,
    };
}
