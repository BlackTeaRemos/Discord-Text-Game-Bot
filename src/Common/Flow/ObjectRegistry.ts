import { EmbedBuilder } from 'discord.js';
import { neo4jClient } from '../../Setup/Neo4j.js';
import { GetGame } from '../../Flow/Object/Game/View.js';
import { GameCreateFlowConstants } from '../../Flow/Object/Game/CreateState.js';
import type { Game } from '../../Flow/Object/Game/CreateRecord.js';
import { GetOrganizationWithMembers } from '../../Flow/Object/Organization/View/index.js';
import type { OrganizationView, OrganizationWithMembers } from '../../Flow/Object/Organization/View/index.js';
import { GetUserByUid } from '../../Flow/Object/User/View.js';
import type { ViewUser } from '../../Flow/Object/User/View/ViewUser.js';
import { GameObjectRepository } from '../../Repository/GameObject/GameObjectRepository.js';
import type { IGameObject } from '../../Domain/GameObject/IGameObject.js';
import { sanitizeDescriptionText } from '../../Flow/Object/Description/BuildDefinition.js';
import { GetPriorityScopedDescription } from '../../Flow/Object/Description/Scope/GetPriorityScopedDescription.js';
import { GetUserOrganizations } from '../../Flow/Object/Organization/View/GetUserOrganizations.js';
import { ResolveEmbedThumbnailUrl } from './ResolveEmbedThumbnailUrl.js';
import { FetchTaskById } from '../../Flow/Task/FetchTaskById.js';
import { Translate } from '../../Services/I18nService.js';

export type ObjectTypeKey = `game` | `organization` | `user` | `building` | `task`;

export interface ObjectTypeConfig {
    label: string;
    listQuery: string; // must return uid and label columns
}

export const OBJECT_TYPES: Record<ObjectTypeKey, ObjectTypeConfig> = {
    game: {
        label: Translate(`objectRegistry.types.game`),
        listQuery: `MATCH (g:Game) RETURN g.uid AS uid, g.name AS label`,
    },
    organization: {
        label: Translate(`objectRegistry.types.organization`),
        listQuery: `MATCH (o:Organization) RETURN o.uid AS uid, o.name AS label`,
    },
    user: {
        label: Translate(`objectRegistry.types.user`),
        listQuery: `MATCH (u:User) RETURN u.uid AS uid, u.discord_id AS label`,
    },
    building: {
        label: Translate(`objectRegistry.types.building`),
        listQuery: `MATCH (obj:GameObject) RETURN obj.uid AS uid, obj.name AS label`,
    },
    task: {
        label: Translate(`objectRegistry.types.task`),
        listQuery: `MATCH (t:Task) RETURN t.id AS uid, t.short_description AS label`,
    },
};

export function getSupportedTypes(): Array<{ label: string; value: ObjectTypeKey }> {
    return Object.entries(OBJECT_TYPES).map(([key, cfg]) => {
        return { label: cfg.label, value: key as ObjectTypeKey };
    });
}

export async function listRecordsFor(type: ObjectTypeKey): Promise<Array<{ uid: string; label: string }>> {
    const session = await neo4jClient.GetSession(`READ`);
    try {
        const result = await session.run(OBJECT_TYPES[type].listQuery);
        return result.records.map(r => {
            return { uid: String(r.get(`uid`)), label: String(r.get(`label`)) };
        });
    } finally {
        await session.close();
    }
}

export interface EmbedBuildContext {
    game?: Game | null;
    organization?: OrganizationWithMembers | null;
    user?: ViewUser | null;
    gameObject?: IGameObject | null;
}

/**
 * @brief Generate a compact description field label for a resolved scoped description
 * @param scopeType string Scope type identifier
 * @returns string Human label for embeds
 */
function __BuildScopedDescriptionLabel(scopeType: string): string {
    switch (scopeType) {
        case `user`:
            return Translate(`objectRegistry.scopedDescription.user`);
        case `organization`:
            return Translate(`objectRegistry.scopedDescription.organization`);
        case `global`:
            return Translate(`objectRegistry.scopedDescription.global`);
        default:
            return Translate(`objectRegistry.common.description`);
    }
}

/**
 * @brief Resolve a description to display using priority from user to organization to public
 * @param options object Resolution input
 * @returns Promise of label and text Embed field payload
 */
async function __ResolvePriorityDescription(options: {
    objectType: string;
    objectUid: string;
    viewerUserUid: string;
    legacyFallback?: string | undefined;
    characterOrganizationUid?: string | null | undefined;
}): Promise<{ label: string; text: string }> {
    let organizationUids: string[];

    if (options.characterOrganizationUid) {
        organizationUids = [options.characterOrganizationUid];
    } else {
        const organizations = await GetUserOrganizations(options.viewerUserUid);
        organizationUids = organizations.map((organization: OrganizationView) => {
            return organization.uid;
        });
    }

    const scoped = await GetPriorityScopedDescription({
        objectType: options.objectType,
        objectUid: options.objectUid,
        userUid: options.viewerUserUid,
        organizationUids,
    });

    const descriptionText = sanitizeDescriptionText(scoped?.content ?? options.legacyFallback);
    const safeText = descriptionText.length > 0 ? descriptionText : Translate(`objectRegistry.common.noDescriptionYet`);

    if (!scoped) {
        return { label: Translate(`objectRegistry.common.description`), text: safeText };
    }

    return {
        label: `${__BuildScopedDescriptionLabel(scoped.scopeType)} v${scoped.version}`,
        text: safeText,
    };
}

export async function buildEmbedFor(
    type: ObjectTypeKey,
    id: string,
    viewerUserUid: string,
    context?: EmbedBuildContext,
    characterOrganizationUid?: string | null,
): Promise<EmbedBuilder | null> {
    switch (type) {
        case `game`: {
            const game = context?.game ?? (await GetGame(id));
            if (!game) {
                return null;
            }
            const embed = new EmbedBuilder()
                .setColor(`Blue`)
                    .setTitle(game.name || Translate(`objectRegistry.game.detailsTitle`))
                .addFields({ name: Translate(`objectRegistry.common.name`), value: game.name || Translate(`objectRegistry.common.notAvailable`), inline: true })
                .addFields({ name: Translate(`objectRegistry.common.identifier`), value: Translate(`objectRegistry.common.storedInternally`), inline: true })
                .addFields({ name: Translate(`objectRegistry.common.server`), value: game.serverId ?? Translate(`objectRegistry.common.notAvailable`), inline: true });
            const thumbnailUrl = ResolveEmbedThumbnailUrl(game.image, GameCreateFlowConstants.defaultImageUrl);
            if (thumbnailUrl) {
                embed.setThumbnail(thumbnailUrl);
            }
            const resolved = await __ResolvePriorityDescription({
                objectType: `game`,
                objectUid: id,
                viewerUserUid,
                legacyFallback: game.description,
                characterOrganizationUid,
            });
            embed.addFields({ name: resolved.label, value: resolved.text.slice(0, 1024) });
            return embed;
        }
        case `organization`: {
            const organization = context?.organization ?? (await GetOrganizationWithMembers(id));
            if (!organization) {
                return null;
            }
            const embed = new EmbedBuilder()
                .setColor(`Blue`)
                    .setTitle(organization.organization.name || Translate(`objectRegistry.organization.detailsTitle`))
                .addFields({ name: Translate(`objectRegistry.common.name`), value: organization.organization.name || Translate(`objectRegistry.common.notAvailable`), inline: true })
                .addFields({ name: Translate(`objectRegistry.organization.friendly`), value: organization.organization.friendlyName, inline: true })
                .addFields({ name: Translate(`objectRegistry.common.identifier`), value: Translate(`objectRegistry.common.storedInternally`), inline: true })
                .addFields({ name: Translate(`objectRegistry.organization.members`), value: String(organization.users.length), inline: true });
            const resolved = await __ResolvePriorityDescription({
                objectType: `organization`,
                objectUid: id,
                viewerUserUid,
                characterOrganizationUid,
            });
            embed.addFields({ name: resolved.label, value: resolved.text.slice(0, 1024) });
            return embed;
        }
        case `user`: {
            const user = context?.user ?? (await GetUserByUid(id));
            if (!user) {
                return null;
            }
            const embed = new EmbedBuilder()
                .setColor(`Blue`)
                    .setTitle(user.name || Translate(`objectRegistry.user.detailsTitle`))
                .addFields({ name: Translate(`objectRegistry.user.discord`), value: user.discord_id, inline: true })
                .addFields({ name: Translate(`objectRegistry.common.name`), value: user.name || Translate(`objectRegistry.common.notAvailable`), inline: true })
                .addFields({ name: Translate(`objectRegistry.common.identifier`), value: Translate(`objectRegistry.common.storedInternally`), inline: true });
            const resolved = await __ResolvePriorityDescription({
                objectType: `user`,
                objectUid: id,
                viewerUserUid,
                characterOrganizationUid,
            });
            embed.addFields({ name: resolved.label, value: resolved.text.slice(0, 1024) });
            return embed;
        }
        case `task`: {
            const task = await FetchTaskById(neo4jClient, { taskId: id, viewerDiscordId: ``, allowOverride: true, organizationUid: characterOrganizationUid ?? `` });
            if (!task) {
                return null;
            }

            const embed = new EmbedBuilder()
                .setColor(`Blue`)
                    .setTitle(Translate(`objectRegistry.task.detailsTitle`))
                .addFields({ name: Translate(`objectRegistry.task.id`), value: task.id, inline: true })
                .addFields({ name: Translate(`objectRegistry.task.status`), value: String(task.status), inline: true })
                .addFields({ name: Translate(`objectRegistry.task.short`), value: task.shortDescription || Translate(`objectRegistry.common.notAvailable`), inline: true })
                .addFields({ name: Translate(`objectRegistry.task.organization`), value: task.organizationName || Translate(`objectRegistry.common.notAvailable`), inline: true });

            if (task.description) {
                embed.addFields({ name: Translate(`objectRegistry.common.description`), value: task.description.slice(0, 1024) });
            }

            return embed;
        }
        case `building`: {
            const gameObjectRepo = new GameObjectRepository();
            const gameObject = context?.gameObject ?? (await gameObjectRepo.GetByUid(id));
            if (!gameObject) {
                return null;
            }
            const embed = new EmbedBuilder()
                .setColor(`Blue`)
                    .setTitle(gameObject.name || Translate(`objectRegistry.factory.detailsTitle`))
                .addFields({ name: Translate(`objectRegistry.factory.type`), value: gameObject.name || Translate(`objectRegistry.common.notAvailable`), inline: true })
                .addFields({ name: Translate(`objectRegistry.common.identifier`), value: Translate(`objectRegistry.common.storedInternally`), inline: true })
                .addFields({ name: Translate(`objectRegistry.factory.organization`), value: Translate(`objectRegistry.factory.organizationRecorded`), inline: true });

            const resolved = await __ResolvePriorityDescription({
                objectType: `building`,
                objectUid: id,
                viewerUserUid,
                characterOrganizationUid,
            });
            embed.addFields({ name: resolved.label, value: resolved.text.slice(0, 1024) });
            return embed;
        }
        default:
            return null;
    }
}
