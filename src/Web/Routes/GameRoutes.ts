import type { FastifyInstance } from 'fastify';
import { neo4jClient } from '../../Setup/Neo4j.js';

const OrganizationItemSchema = {
    type: `object`,
    properties: {
        uid: { type: `string` },
        name: { type: `string` },
        friendlyName: { type: `string` },
    },
} as const;

const UserItemSchema = {
    type: `object`,
    properties: {
        uid: { type: `string` },
        name: { type: `string` },
        friendlyName: { type: `string` },
        discordId: { type: `string` },
    },
} as const;

export function RegisterGameRoutes(fastify: FastifyInstance): void {
    fastify.get(`/api/games`, {
        schema: {
            tags: [`Games`],
            summary: `List all games`,
            response: {
                200: {
                    type: `object`,
                    properties: {
                        games: {
                            type: `array`,
                            items: {
                                type: `object`,
                                properties: {
                                    uid: { type: `string`, description: `Game unique identifier` },
                                    name: { type: `string`, description: `Game display name` },
                                },
                            },
                        },
                    },
                },
            },
        },
    }, async() => {
        const session = await neo4jClient.GetSession(`READ`);
        try {
            const result = await session.run(
                `MATCH (g:Game) RETURN g.uid AS uid, g.name AS name ORDER BY g.name`,
            );
            const games = result.records.map(record => {
                return {
                    uid: String(record.get(`uid`)),
                    name: String(record.get(`name`) ?? `Unnamed`),
                };
            });
            return { games };
        } finally {
            await session.close();
        }
    });

    fastify.get<{ Params: { gameUid: string } }>(`/api/games/:gameUid/organizations`, {
        schema: {
            tags: [`Games`],
            summary: `List organizations participating in a game`,
            params: {
                type: `object`,
                properties: {
                    gameUid: { type: `string` },
                },
                required: [`gameUid`],
            },
            response: {
                200: {
                    type: `object`,
                    properties: {
                        organizations: { type: `array`, items: OrganizationItemSchema },
                    },
                },
            },
        },
    }, async(request) => {
        const { gameUid } = request.params;
        const session = await neo4jClient.GetSession(`READ`);
        try {
            const result = await session.run(
                `MATCH (obj:GameObject { gameUid: $gameUid })<-[:OWNS_OBJECT]-(org:Organization)
                 RETURN DISTINCT org.uid AS uid, org.name AS name, org.friendly_name AS friendlyName
                 ORDER BY org.name`,
                { gameUid },
            );
            const organizations = result.records.map(record => {
                return {
                    uid: String(record.get(`uid`)),
                    name: String(record.get(`name`) ?? ``),
                    friendlyName: String(record.get(`friendlyName`) ?? ``),
                };
            });
            return { organizations };
        } finally {
            await session.close();
        }
    });

    fastify.get<{ Params: { gameUid: string } }>(`/api/games/:gameUid/users`, {
        schema: {
            tags: [`Games`],
            summary: `List users participating in a game through organizations`,
            params: {
                type: `object`,
                properties: {
                    gameUid: { type: `string` },
                },
                required: [`gameUid`],
            },
            response: {
                200: {
                    type: `object`,
                    properties: {
                        users: { type: `array`, items: UserItemSchema },
                    },
                },
            },
        },
    }, async(request) => {
        const { gameUid } = request.params;
        const session = await neo4jClient.GetSession(`READ`);
        try {
            const result = await session.run(
                `MATCH (obj:GameObject { gameUid: $gameUid })<-[:OWNS_OBJECT]-(org:Organization)<-[:BELONGS_TO]-(u:User)
                 RETURN DISTINCT u.uid AS uid, u.name AS name, u.friendly_name AS friendlyName, u.discord_id AS discordId
                 ORDER BY u.name`,
                { gameUid },
            );
            const users = result.records.map(record => {
                return {
                    uid: String(record.get(`uid`)),
                    name: String(record.get(`name`) ?? ``),
                    friendlyName: String(record.get(`friendlyName`) ?? ``),
                    discordId: String(record.get(`discordId`) ?? ``),
                };
            });
            return { users };
        } finally {
            await session.close();
        }
    });
}
