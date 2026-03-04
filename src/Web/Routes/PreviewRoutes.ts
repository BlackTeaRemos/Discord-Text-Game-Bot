import type { FastifyInstance } from 'fastify';
import { Log } from '../../Common/Log.js';
import { RenderCardPreview } from '../../Flow/GameObject/RenderCardPreview.js';
import { RenderProjectedCardPreview } from '../../Flow/GameObject/RenderProjectedCardPreview.js';
import type { ITemplateDisplayConfig } from '../../Domain/GameObject/Display/ITemplateDisplayConfig.js';
import {
    TemplateDisplayConfigSchema,
    ErrorResponseSchema,
} from './ApiSchemas.js';

const LOG_TAG = `Web/PreviewRoutes`;

export function RegisterPreviewRoutes(fastify: FastifyInstance): void {
    fastify.post<{ Body: { templateUid: string; config?: ITemplateDisplayConfig; displayStyle?: string } }>(`/api/card-preview`, {
        schema: {
            tags: [`Preview`],
            summary: `Render a card preview as PNG image`,
            body: {
                type: `object`,
                required: [`templateUid`],
                properties: {
                    templateUid: { type: `string`, description: `Template to render` },
                    config: { ...TemplateDisplayConfigSchema, description: `Optional display config override for the preview` },
                    displayStyle: { type: `string`, description: `Optional projection display style to render as` },
                },
            },
            response: {
                200: {
                    type: `string`,
                    format: `binary`,
                    description: `PNG image data`,
                },
                404: ErrorResponseSchema,
                500: ErrorResponseSchema,
            },
        },
    }, async(request, reply) => {
        try {
            const { templateUid, config, displayStyle } = request.body;

            let pngBuffer: Buffer | null;

            if (displayStyle) {
                pngBuffer = await RenderProjectedCardPreview(templateUid, displayStyle);
            } else {
                pngBuffer = await RenderCardPreview(templateUid, config);
            }
            if (!pngBuffer) {
                return reply.status(404).send({ error: `Template not found or no objects to preview.` });
            }

            return reply
                .type(`image/png`)
                .header(`Content-Length`, pngBuffer.length)
                .header(`Cache-Control`, `no-cache`)
                .send(pngBuffer);
        } catch(renderError) {
            const message = renderError instanceof Error ? renderError.message : String(renderError);
            Log.error(`Card preview render error: ${message}`, LOG_TAG, `CardPreview`);
            return reply.status(500).send({ error: `Failed to render card preview.` });
        }
    });
}
