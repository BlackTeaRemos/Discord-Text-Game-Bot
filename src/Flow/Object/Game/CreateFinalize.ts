import { MessageFlags, ButtonInteraction } from 'discord.js';
import type { GameCreateStepContext } from './CreateTypes.js';
import { recallBaseInteraction } from './CreateTypes.js';
import { resolveGameCreatePermissions } from '../../Command/GameCreateFlow.js';
import { RequestPermissionFromAdmin } from '../../../SubCommand/Permission/PermissionUI.js';
import { GrantForever } from '../../../Common/permission/index.js';
import { CreateGame } from './CreateRecord.js';
import { GameCreateFlowConstants } from './CreateState.js';
import { log } from '../../../Common/Log.js';
import { recallRenderers } from './CreateTypes.js';

/**
 * Finalize the game creation process after the user confirms the preview.
 * @param ctx GameCreateStepContext Active flow context. @example await finalizeGameCreation(ctx, interaction)
 * @param interaction ButtonInteraction Interaction triggering the confirmation.
 * @returns Promise<boolean> True when creation succeeds and flow ends.
 */
export async function finalizeGameCreation(
    ctx: GameCreateStepContext,
    interaction: ButtonInteraction,
): Promise<boolean> {
    const base = recallBaseInteraction(ctx);
    if (!base) {
        await interaction.deferUpdate();
        await ctx.cancel();
        return true;
    }
    const name = ctx.state.gameName.trim();
    if (!name) {
        await interaction.reply({
            content: `Set a name before creating the game.`,
            flags: MessageFlags.Ephemeral,
        });
        return false;
    }

    await interaction.deferUpdate();
    const renderers = recallRenderers(ctx);
    if (!renderers) {
        log.error(`Renderers missing for game create flow`, GameCreateFlowConstants.logSource, `finalizeGameCreation`);
    }
    if (renderers) {
        await renderers.RenderControls(ctx, `Checking permissions before creating the game...`);
    }

    const permission = await resolveGameCreatePermissions(base, { serverId: ctx.state.serverId });
    if (!permission.allowed) {
        if (permission.requiresApproval) {
            const decision = await RequestPermissionFromAdmin(base, {
                tokens: permission.tokens,
                reason: permission.reason,
            });
            if (decision === `approve_forever` && base.guildId) {
                GrantForever(base.guildId, base.user.id, permission.tokens[0] ?? []);
            }
            if (decision !== `approve_once` && decision !== `approve_forever`) {
                if (renderers) {
                    await renderers.RenderControls(
                        ctx,
                        `Permission request denied or timed out. Adjust details or cancel.`,
                    );
                }
                return false;
            }
        } else {
            const reason = permission.reason ?? `Permission denied for game creation.`;
            if (renderers) {
                await renderers.RenderControls(ctx, `${reason} Adjust details or cancel.`);
            }
            return false;
        }
    }

    try {
        const created = await CreateGame(name, ctx.state.imageUrl ?? ``, ctx.state.serverId, undefined, {
            currentTurn: 1,
            description: ctx.state.description,
        });
        if (renderers) {
            await renderers.RenderPreview(ctx);
            await renderers.RenderControls(ctx, `Game created: ${created.uid} '${created.name}'.`);
        }
        await ctx.cancel();
        return true;
    } catch (error) {
        log.error(`Game creation failed: ${String(error)}`, GameCreateFlowConstants.logSource, `finalizeGameCreation`);
        if (renderers) {
            await renderers.RenderControls(ctx, `Game creation failed: ${String(error)}.`);
        }
        return false;
    }
}
