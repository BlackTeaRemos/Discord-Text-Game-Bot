/**
 * @brief Represents a command option from an interaction
 */
export interface ICommandOption {
    name: string;
    value: unknown;
}

/**
 * @brief Character context for interaction resolution
 */
export interface ICharacterContext {
    characterUid: string | null;
    organizationUid: string | null;
}

/**
 * @brief Abstract representation of an interaction context for Flow modules
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
 * @brief Abstract representation of a guild member for permission checks
 */
export interface IFlowMember {
    id: string;
    guildId: string | undefined;
    roles: ReadonlyArray<string>;
}

/**
 * @brief Callback to lazily fetch a member when needed for permission checks
 * @returns Promise IFlowMember or null Resolved member or null if unavailable
 */
export type FlowMemberProvider = () => Promise<IFlowMember | null>;

/**
 * @brief Extract IFlowInteractionContext from a Discord ChatInputCommandInteraction
 * @param interaction object Discord interaction with required properties
 * @returns IFlowInteractionContext Plain data object for Flow consumption
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
 * @brief Extract IFlowMember from a Discord GuildMember
 * @param member object Discord GuildMember with required properties
 * @returns IFlowMember Plain data object for Flow consumption
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
