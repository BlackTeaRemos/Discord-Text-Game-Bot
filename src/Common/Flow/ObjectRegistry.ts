import { EmbedBuilder } from 'discord.js';
import { neo4jClient } from '../../Setup/Neo4j.js';
import { GetGame } from '../../Flow/Object/Game/View.js';
import { GameCreateFlowConstants } from '../../Flow/Object/Game/CreateState.js';
import type { Game } from '../../Flow/Object/Game/CreateRecord.js';
import { GetOrganizationWithMembers } from '../../Flow/Object/Organization/View/index.js';
import type { OrganizationView, OrganizationWithMembers } from '../../Flow/Object/Organization/View/index.js';
import { GetUserByUid } from '../../Flow/Object/User/View.js';
import type { ViewUser } from '../../Flow/Object/User/View/ViewUser.js';
import { GetFactory } from '../../Flow/Object/Building/View.js';
import type { Factory } from '../../Flow/Object/Building/Create.js';
import { sanitizeDescriptionText } from '../../Flow/Object/Description/BuildDefinition.js';
import { GetPriorityScopedDescription } from '../../Flow/Object/Description/Scope/GetPriorityScopedDescription.js';
import { GetUserOrganizations } from '../../Flow/Object/Organization/View/GetUserOrganizations.js';
import { ResolveEmbedThumbnailUrl } from './ResolveEmbedThumbnailUrl.js';

export type ObjectTypeKey = `game` | `organization` | `user` | `building`;

export interface ObjectTypeConfig {
    label: string;
    listQuery: string; // must return uid,label columns
}

export const OBJECT_TYPES: Record<ObjectTypeKey, ObjectTypeConfig> = {
    game: {
        label: `Games`,
        listQuery: `MATCH (g:Game) RETURN g.uid AS uid, g.name AS label`,
    },
    organization: {
        label: `Organizations`,
        listQuery: `MATCH (o:Organization) RETURN o.uid AS uid, o.name AS label`,
    },
    user: {
        label: `Users`,
        listQuery: `MATCH (u:User) RETURN u.uid AS uid, u.discord_id AS label`,
    },
    building: {
        label: `Factories`,
        listQuery: `MATCH (f:Factory) RETURN f.uid AS uid, f.type AS label`,
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
    factory?: Factory | null;
}

/**
 * Generate a compact description field label for a resolved scoped description.
 * @param scopeType string Scope type identifier. @example 'user'
 * @returns string Human label for embeds. @example 'Description (personal)'
 */
function __BuildScopedDescriptionLabel(scopeType: string): string {
    switch (scopeType) {
        case `user`:
            return `Description (personal)`;
        case `organization`:
            return `Description (organization)`;
        case `global`:
            return `Description (public)`;
        default:
            return `Description`;
    }
}

/**
 * Resolve a description to display using priority user > organization > public.
 * Falls back to legacy object-attached description when no scoped description exists.
 * @param options object Resolution input.
 * @returns Promise<{ label: string; text: string }> Embed field payload.
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
    const safeText = descriptionText.length > 0 ? descriptionText : `No description yet.`;

    if (!scoped) {
        return { label: `Description`, text: safeText };
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
                .setTitle(game.name || `Game details`)
                .addFields({ name: `Name`, value: game.name || `n/a`, inline: true })
                .addFields({ name: `Identifier`, value: `Stored internally.`, inline: true })
                .addFields({ name: `Server`, value: game.serverId ?? `n/a`, inline: true });
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
                .setTitle(organization.organization.name || `Organization details`)
                .addFields({ name: `Name`, value: organization.organization.name || `n/a`, inline: true })
                .addFields({ name: `Friendly`, value: organization.organization.friendlyName, inline: true })
                .addFields({ name: `Identifier`, value: `Stored internally.`, inline: true })
                .addFields({ name: `Members`, value: String(organization.users.length), inline: true });
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
                .setTitle(user.name || `User details`)
                .addFields({ name: `Discord`, value: user.discord_id, inline: true })
                .addFields({ name: `Name`, value: user.name || `n/a`, inline: true })
                .addFields({ name: `Identifier`, value: `Stored internally.`, inline: true });
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
            const task = await FetchTaskById(neo4jClient, { taskId: id, viewerDiscordId: ``, allowOverride: true, organizationUid: orgUid ?? `` });
            if (task) {
                embed
                    .addFields({ name: `ID`, value: task.id, inline: true })
                    .addFields({ name: `Status`, value: String(task.status), inline: true })
                    .addFields({ name: `Short`, value: task.shortDescription || `n/a`, inline: true })
                    .addFields({ name: `Org`, value: task.organizationName || `n/a`, inline: true });
                if (task.description) {
                    embed.addFields({ name: `Description`, value: task.description.slice(0, 1024) });
                }
            }
            break;
        }
        case `building`: {
            const factory = context?.factory ?? (await GetFactory(id));
            if (!factory) {
                return null;
            }
            const embed = new EmbedBuilder()
                .setColor(`Blue`)
                .setTitle(factory.type || `Factory details`)
                .addFields({ name: `Type`, value: factory.type || `n/a`, inline: true })
                .addFields({ name: `Identifier`, value: `Stored internally.`, inline: true })
                .addFields({ name: `Organization`, value: `Linked organization recorded internally.`, inline: true });

            const resolved = await __ResolvePriorityDescription({
                objectType: `factory`,
                objectUid: id,
                viewerUserUid,
                legacyFallback: factory.description,
                characterOrganizationUid,
            });
            embed.addFields({ name: resolved.label, value: resolved.text.slice(0, 1024) });
            return embed;
        }
        default:
            return null;
    }
}
