import type { FastifyInstance } from 'fastify';
import { auditService } from '../../Services/AuditService.js';

export function RegisterAuditRoutes(fastify: FastifyInstance): void {
    fastify.get(`/api/audit`, {
        schema: {
            tags: [`Audit`],
            summary: `Recent user action audit entries`,
            querystring: {
                type: `object`,
                properties: {
                    count: { type: `integer`, minimum: 1, maximum: 2000, default: 50 },
                },
            },
            response: {
                200: {
                    type: `object`,
                    properties: {
                        entries: {
                            type: `array`,
                            items: {
                                type: `object`,
                                properties: {
                                    timestamp: { type: `number` },
                                    eventName: { type: `string` },
                                    userId: { type: `string` },
                                    actionIdentifier: { type: `string` },
                                },
                            },
                        },
                    },
                },
            },
        },
    }, async(request) => {
        const { count } = request.query as { count?: number };
        return { entries: auditService.GetRecentEntries(count ?? 50) };
    });
}
