import type { ChatInputCommandInteraction } from 'discord.js';
import { MessageFlags } from 'discord.js';
import { ResolveCommandPermission, type CommandPermissionResult } from './PermissionResolver.js';
import { PermissionApprovalError } from '../../Common/Errors.js';
import { RequestPermissionFromAdmin } from '../../SubCommand/Permission/PermissionUI.js';

/**
 * Context used when resolving game creation permissions.
 * @property serverId string Identifier of the guild where game is created (example: '123').
 */
export interface GameCreatePermissionContext {
    serverId: string;
}

export type GameCreatePermissionResult = CommandPermissionResult;

/**
 * Resolve permissions for the game creation flow, handling admin approval when required.
 * @param interaction ChatInputCommandInteraction Interaction requesting creation (example: slash command interaction).
 * @param context GameCreatePermissionContext Context describing the target server (example: { serverId: '123' }).
 * @returns Promise<GameCreatePermissionResult> Outcome of permission resolution when access proceeds.
 * @throws PermissionApprovalError When approval is denied, times out, or no administrators are reachable.
 * @example
 * const outcome = await resolveGameCreatePermissions(interaction, { serverId: guildId });
 */
export async function resolveGameCreatePermissions(
    interaction: ChatInputCommandInteraction,
    context: GameCreatePermissionContext,
): Promise<GameCreatePermissionResult> {
    const respondToUser = async (message: string): Promise<void> => {
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: message, flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
        }
    };

    const outcome = await ResolveCommandPermission({
        interaction,
        templates: [`object:game:create:{serverId}`, `object:game:create`],
        context: { serverId: context.serverId },
        logSource: `GameCreateFlow`,
        action: `object:game:create:${context.serverId}`,
    });

    if (outcome.allowed) {
        return outcome;
    }

    if (!outcome.requiresApproval) {
        const message = outcome.reason ?? `Permission denied for game creation.`;
        await respondToUser(message);
        throw new PermissionApprovalError(message, {
            reason: `denied`,
            guildId: interaction.guildId ?? undefined,
            userId: interaction.user.id,
            tokens: outcome.tokens,
        });
    }

    const tokens = outcome.tokens ?? [];
    if (tokens.length === 0) {
        const message = `Approval required but no permission tokens were supplied. Contact an administrator.`;
        await respondToUser(message);
        throw new PermissionApprovalError(message, {
            reason: `missing_tokens`,
            guildId: interaction.guildId ?? undefined,
            userId: interaction.user.id,
        });
    }

    const decision = await RequestPermissionFromAdmin(interaction, {
        tokens,
        reason: outcome.reason,
    });

    return {
        ...outcome,
        allowed: true,
        requiresApproval: false,
        decision,
    };
}
