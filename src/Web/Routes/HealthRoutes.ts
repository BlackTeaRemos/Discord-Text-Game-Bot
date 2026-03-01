import type { FastifyInstance } from 'fastify';

export function RegisterHealthRoutes(fastify: FastifyInstance): void {
    fastify.get(`/health`, {
        schema: {
            tags: [`Health`],
            summary: `Health check`,
            response: {
                200: {
                    type: `object`,
                    properties: {
                        status: { type: `string` },
                        service: { type: `string` },
                    },
                },
            },
        },
    }, async () => {
        return { status: `ok`, service: `template-editor` };
    });
}
