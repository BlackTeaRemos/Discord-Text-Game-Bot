import type { FastifyInstance } from 'fastify';
import { metricsService } from '../../Services/MetricsService.js';

export function RegisterMetricsRoutes(fastify: FastifyInstance): void {
    fastify.get(`/api/metrics`, {
        schema: {
            tags: [`Metrics`],
            summary: `Current metrics snapshot with per-event counters`,
            response: {
                200: {
                    type: `object`,
                    properties: {
                        cacheHits: { type: `number` },
                        cacheMisses: { type: `number` },
                        policyAllowClosed: { type: `number` },
                        policyDenyClosed: { type: `number` },
                        eventsPublished: {
                            type: `object`,
                            additionalProperties: { type: `number` },
                        },
                        collectedAt: { type: `number` },
                    },
                },
            },
        },
    }, async() => {
        return metricsService.Snapshot();
    });
}
