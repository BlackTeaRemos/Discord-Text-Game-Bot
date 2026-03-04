import type { FastifyInstance } from 'fastify';
import { ObjectProjectionRepository } from '../../Repository/GameObject/ObjectProjectionRepository.js';
import { GameObjectRepository } from '../../Repository/GameObject/GameObjectRepository.js';
import type { ProjectionStatus } from '../../Domain/GameObject/Entity/Projection/IObjectProjection.js';

const projectionRepository = new ObjectProjectionRepository();
const objectRepository = new GameObjectRepository();

export function RegisterProjectionRoutes(fastify: FastifyInstance): void {
    fastify.get<{
        Querystring: {
            gameUid: string;
            templateUid?: string;
        };
    }>(`/api/game-objects`, {
        schema: {
            tags: [`Projections`],
            querystring: {
                type: `object`,
                required: [`gameUid`],
                properties: {
                    gameUid: { type: `string` },
                    templateUid: { type: `string` },
                },
            },
        },
        handler: async(request, reply) => {
            const { gameUid, templateUid } = request.query;
            const objects = await objectRepository.ListByGame(gameUid, templateUid ? { templateUid } : undefined);
            return reply.send({ objects });
        },
    });

    fastify.get<{
        Querystring: {
            organizationUid: string;
            templateUid?: string;
        };
    }>(`/api/projections`, {
        schema: {
            tags: [`Projections`],
            querystring: {
                type: `object`,
                required: [`organizationUid`],
                properties: {
                    organizationUid: { type: `string` },
                    templateUid: { type: `string` },
                },
            },
        },
        handler: async(request, reply) => {
            const { organizationUid, templateUid } = request.query;
            const projections = await projectionRepository.ListByOrganization(
                organizationUid,
                templateUid ? { templateUid } : undefined,
            );
            return reply.send({ projections });
        },
    });

    fastify.post<{
        Body: {
            objectUid: string;
            templateUid: string;
            organizationUid: string;
            name: string;
            displayStyle: string;
            autoSync: boolean;
        };
    }>(`/api/projections`, {
        schema: {
            tags: [`Projections`],
            body: {
                type: `object`,
                required: [`objectUid`, `templateUid`, `organizationUid`, `name`, `displayStyle`],
                properties: {
                    objectUid: { type: `string` },
                    templateUid: { type: `string` },
                    organizationUid: { type: `string` },
                    name: { type: `string` },
                    displayStyle: { type: `string` },
                    autoSync: { type: `boolean` },
                },
            },
        },
        handler: async(request, reply) => {
            const { objectUid, templateUid, organizationUid, name, displayStyle, autoSync } = request.body;
            const projection = await projectionRepository.Create({
                objectUid,
                templateUid,
                organizationUid,
                name,
                displayStyle,
                autoSync: autoSync ?? false,
                knownParameters: [],
            });
            return reply.code(201).send(projection);
        },
    });

    fastify.put<{
        Params: { uid: string };
        Body: {
            name?: string;
            displayStyle?: string;
            autoSync?: boolean;
            status?: ProjectionStatus;
        };
    }>(`/api/projections/:uid`, {
        schema: {
            tags: [`Projections`],
            params: {
                type: `object`,
                required: [`uid`],
                properties: {
                    uid: { type: `string` },
                },
            },
            body: {
                type: `object`,
                properties: {
                    name: { type: `string` },
                    displayStyle: { type: `string` },
                    autoSync: { type: `boolean` },
                    status: { type: `string`, enum: [`ACTIVE`, `DESTROYED`] },
                },
            },
        },
        handler: async(request, reply) => {
            const { uid } = request.params;
            const fields = request.body;
            const updated = await projectionRepository.UpdateMetadata(uid, fields);
            return reply.send(updated);
        },
    });

    fastify.delete<{
        Params: { uid: string };
    }>(`/api/projections/:uid`, {
        schema: {
            tags: [`Projections`],
            params: {
                type: `object`,
                required: [`uid`],
                properties: {
                    uid: { type: `string` },
                },
            },
        },
        handler: async(request, reply) => {
            const { uid } = request.params;
            await projectionRepository.UpdateMetadata(uid, { status: `DESTROYED` });
            return reply.code(204).send();
        },
    });
}
