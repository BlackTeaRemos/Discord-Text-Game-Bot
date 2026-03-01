import type { FastifyInstance } from 'fastify';
import { Log } from '../../Common/Log.js';
import type { IRouteContext } from './IRouteContext.js';
import {
    ParameterDefinitionSchema,
    TemplateDisplayConfigSchema,
    ProjectionDisplayProfileSchema,
    ErrorResponseSchema,
    SuccessResponseSchema,
} from './ApiSchemas.js';

const LOG_TAG = `Web/ProjectionConfigRoutes`;

export function RegisterProjectionConfigRoutes(fastify: FastifyInstance, context: IRouteContext): void {
    fastify.get<{ Querystring: { templateUid: string } }>(`/api/projection-config`, {
        schema: {
            tags: [`Projection Config`],
            summary: `Get projection display configuration for a template`,
            querystring: {
                type: `object`,
                required: [`templateUid`],
                properties: {
                    templateUid: { type: `string`, description: `Template identifier` },
                },
            },
            response: {
                200: {
                    description: `Projection configuration with template context`,
                    type: `object`,
                    properties: {
                        templateUid: { type: `string`, description: `Template identifier` },
                        templateName: { type: `string`, description: `Template display name` },
                        parameters: { type: `array`, items: ParameterDefinitionSchema, description: `Template parameters for reference` },
                        displayConfig: { ...TemplateDisplayConfigSchema, nullable: true, description: `Base display config or null if not set` },
                        projectionDisplayConfigs: {
                            type: `object`,
                            additionalProperties: ProjectionDisplayProfileSchema,
                            description: `Map of profile name to projection display profile`,
                        },
                    },
                },
                404: ErrorResponseSchema,
                500: ErrorResponseSchema,
            },
        },
    }, async(request, reply) => {
        try {
            const template = await context.templateRepository.GetByUid(request.query.templateUid);
            if (!template) {
                return reply.status(404).send({ error: `Template not found.` });
            }

            return {
                templateUid: template.uid,
                templateName: template.name,
                parameters: template.parameters,
                displayConfig: template.displayConfig ?? null,
                projectionDisplayConfigs: template.projectionDisplayConfigs ?? {},
            };
        } catch(fetchError) {
            const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
            Log.error(`Failed to get projection config: ${message}`, LOG_TAG, `GetProjectionConfig`);
            return reply.status(500).send({ error: `Failed to fetch projection config.` });
        }
    });

    fastify.put<{ Body: { templateUid: string; projectionDisplayConfigs: Record<string, unknown> } }>(`/api/projection-config`, {
        schema: {
            tags: [`Projection Config`],
            summary: `Save projection display configurations for a template`,
            body: {
                type: `object`,
                required: [`templateUid`, `projectionDisplayConfigs`],
                properties: {
                    templateUid: { type: `string`, description: `Template identifier` },
                    projectionDisplayConfigs: {
                        type: `object`,
                        additionalProperties: ProjectionDisplayProfileSchema,
                        description: `Map of profile name to projection display profile`,
                    },
                },
            },
            response: {
                200: SuccessResponseSchema,
                500: ErrorResponseSchema,
            },
        },
    }, async(request, reply) => {
        try {
            const { templateUid, projectionDisplayConfigs } = request.body;

            await context.templateRepository.Update(templateUid, {
                projectionDisplayConfigs: projectionDisplayConfigs as Record<string, never>,
            });

            return { success: true };
        } catch(saveError) {
            const message = saveError instanceof Error ? saveError.message : String(saveError);
            Log.error(`Failed to save projection config: ${message}`, LOG_TAG, `PutProjectionConfig`);
            return reply.status(500).send({ error: `Failed to save projection config.` });
        }
    });
}
