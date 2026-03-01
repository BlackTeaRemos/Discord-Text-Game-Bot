import type { FastifyInstance } from 'fastify';
import { BuildTemplateEditorHtml } from '../TemplateEditorPage.js';
import { BuildTutorialPageHtml } from '../TutorialPage.js';
import { BuildDisplayConfigPageHtml } from '../DisplayConfigPage.js';
import { BuildProjectionConfigPageHtml } from '../ProjectionConfig/index.js';

export function RegisterPageRoutes(fastify: FastifyInstance): void {
    const cachedEditorHtml = BuildTemplateEditorHtml();
    const cachedTutorialHtml = BuildTutorialPageHtml();

    fastify.get(`/`, { schema: { hide: true } }, async (_request, reply) => {
        return reply.type(`text/html; charset=utf-8`).header(`Cache-Control`, `no-cache`).send(cachedEditorHtml);
    });

    fastify.get(`/editor`, { schema: { hide: true } }, async (_request, reply) => {
        return reply.type(`text/html; charset=utf-8`).header(`Cache-Control`, `no-cache`).send(cachedEditorHtml);
    });

    fastify.get(`/tutorial`, { schema: { hide: true } }, async (_request, reply) => {
        return reply.type(`text/html; charset=utf-8`).header(`Cache-Control`, `no-cache`).send(cachedTutorialHtml);
    });

    fastify.get(`/display-config`, { schema: { hide: true } }, async (_request, reply) => {
        return reply.type(`text/html; charset=utf-8`).header(`Cache-Control`, `no-cache`).send(BuildDisplayConfigPageHtml());
    });

    fastify.get(`/projections`, { schema: { hide: true } }, async (_request, reply) => {
        return reply.type(`text/html; charset=utf-8`).header(`Cache-Control`, `no-cache`).send(BuildProjectionConfigPageHtml());
    });
}
