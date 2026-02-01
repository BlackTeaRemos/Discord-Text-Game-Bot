/**
 * Abstract interfaces for Flow modules to operate without Discord.js dependencies.
 * Commands translate Discord interactions into these plain data structures before invoking Flow logic.
 */

/**
 * Represents a command option from an interaction.
 * @property name string Option name (example: 'serverId').
 * @property value unknown Option value (example: '123456789').
 */
export interface ICommandOption {
    name: string;
    value: unknown;
}

/**
 * Character context for interaction resolution.
 * @property characterUid string | null Active character identifier or null if no character assumed. @example 'char_abc123'
 * @property organizationUid string | null Organization the character belongs to or null. @example 'org_xyz789'
 */
export interface ICharacterContext {
    characterUid: string | null;
    organizationUid: string | null;
}

/**
 * Abstract representation of an interaction context for Flow modules.
 * Commands extract these properties from ChatInputCommandInteraction before calling Flow functions.
 * @property commandName string Name of the executed command (example: 'view').
 * @property guildId string | undefined Guild identifier when in a server context (example: '123456789012345678').
 * @property userId string User who triggered the interaction (example: '987654321098765432').
 * @property options ReadonlyArray<ICommandOption> Command options provided by user (example: [{ name: 'type', value: 'game' }]).
 * @property isAdministrator boolean Whether user has Administrator permission (example: true).
 * @property character ICharacterContext | null Character context when user has assumed a character. @example { characterUid: 'char_123', organizationUid: 'org_456' }
 */
export interface IFlowInteractionContext {
    commandName: string;
    guildId: string | undefined;
    userId: string;
    options: ReadonlyArray<ICommandOption>;
    isAdministrator: boolean;
    character: ICharacterContext | null;
}

/**
 * Abstract representation of a guild member for permission checks.
 * Commands extract relevant properties from GuildMember before calling Flow functions.
 * @property id string Member identifier (example: '987654321098765432').
 * @property guildId string | undefined Guild the member belongs to (example: '123456789012345678').
 * @property roles ReadonlyArray<string> Role identifiers the member has (example: ['123', '456']).
 */
export interface IFlowMember {
    id: string;
    guildId: string | undefined;
    roles: ReadonlyArray<string>;
}

/**
 * Callback to lazily fetch a member when needed for permission checks.
 * @returns Promise<IFlowMember | null> Resolved member or null if unavailable.
 */
export type FlowMemberProvider = () => Promise<IFlowMember | null>;

/**
 * Extract IFlowInteractionContext from a Discord ChatInputCommandInteraction.
 * This function lives at the boundary layer; Commands import it, Flow modules do not.
 * @param interaction object Discord interaction with required properties.
 * @returns IFlowInteractionContext Plain data object for Flow consumption.
 * @example
 * const context = ExtractFlowContext(interaction);
 * const result = await ResolveCommandPermission({ context, ... });
 */
export function ExtractFlowContext(interaction: {
    commandName: string;
    guildId: string | null;
    user: { id: string };
    options: { data: readonly { name: string; value?: unknown }[] };
    memberPermissions?: { has: (permission: `Administrator`) => boolean } | null;
}): IFlowInteractionContext {
    return {
        commandName: interaction.commandName,
        guildId: interaction.guildId ?? undefined,
        userId: interaction.user.id,
        options: interaction.options.data.map(option => {
            return {
                name: option.name,
                value: option.value,
            };
        }),
        isAdministrator: Boolean(interaction.memberPermissions?.has(`Administrator`)),
        character: null,
    };
}

/**
 * Extract IFlowMember from a Discord GuildMember.
 * This function lives at the boundary layer; Commands import it, Flow modules do not.
 * @param member object Discord GuildMember with required properties.
 * @returns IFlowMember Plain data object for Flow consumption.
 * @example
 * const flowMember = ExtractFlowMember(guildMember);
 * const result = await CheckPermission({ member: flowMember, ... });
 */
export function ExtractFlowMember(member: {
    id: string;
    guild?: { id: string } | null;
    roles: { cache: Map<string, unknown> | { keys(): Iterable<string> } };
}): IFlowMember {
    const roleIds: string[] = [];
    if (member.roles.cache instanceof Map) {
        for (const key of member.roles.cache.keys()) {
            roleIds.push(key);
        }
    } else {
        for (const key of member.roles.cache.keys()) {
            roleIds.push(key);
        }
    }
    return {
        id: member.id,
        guildId: member.guild?.id,
        roles: roleIds,
    };
}
