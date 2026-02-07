import { MessageFlags } from 'discord.js';
import { log } from '../Common/Log.js';
import { createExecutionContext } from '../Domain/index.js';
import {
    type TokenSegmentInput,
    resolve,
} from '../Common/Permission/index.js';
import { RequestPermissionFromAdmin } from '../SubCommand/Permission/PermissionUI.js';
import { ExtractFlowContext, ExtractFlowMember } from '../Common/Type/FlowContext.js';
import { EnrichWithCharacter } from '../Common/Type/CharacterContextEnricher.js';
import { ResolveUserLocale } from '../Services/I18nService.js';

/**
 * Factory for Discord interaction handler focused on chat input commands.
 * Replaces direct permission checks with `resolve` that asks admins and throws on denial.
 */
export function CreateInteractionHandler(options: { loadedCommands: Record<string, any> }) {
    const { loadedCommands } = options;

    return async function handleInteraction(interaction: any) {
        const isChatCommand = interaction?.isChatInputCommand?.();
        const isMessageCommand = interaction?.isMessageContextMenuCommand?.();
        if (!isChatCommand && !isMessageCommand) {
            return;
        }
        const command = loadedCommands[interaction.commandName];
        if (!command) {
            return;
        }

        try {
            interaction.executionContext = createExecutionContext(interaction.id);

            try {
                const _resolvedLocale = await ResolveUserLocale(interaction.user.id, interaction.executionContext);
                log.debug(`Interaction start: resolved locale for ${interaction.user.id} -> ${_resolvedLocale}`, `InteractionHandler`);
            } catch(error) {
                log.warning(`Failed to resolve user locale: ${String(error)}`, `InteractionHandler`);
            }

            const member = interaction.guild ? await interaction.guild.members.fetch(interaction.user.id) : null;

            const baseFlowContext = ExtractFlowContext(interaction);
            const enrichedFlowContext = await EnrichWithCharacter(baseFlowContext);
            interaction.flowContext = enrichedFlowContext;

            const cmdAny = command as any;
            let rawTemplates:
                | string
                | string[]
                | ((interaction: any) => Promise<string | string[] | undefined>)
                | undefined = cmdAny.permissionTokens;

            const templates: (string | TokenSegmentInput[])[] = [];
            if (typeof rawTemplates === `function`) {
                try {
                    const t = await rawTemplates(interaction);
                    rawTemplates = t;
                } catch {
                    rawTemplates = undefined;
                }
            }
            if (typeof rawTemplates === `string`) {
                templates.push(rawTemplates);
            } else if (Array.isArray(rawTemplates)) {
                for (const entry of rawTemplates) {
                    templates.push(entry as string | TokenSegmentInput[]);
                }
            }

            // Hydrated resolve context so admin approval UI can be shown as needed.
            const resolverCtx = {
                commandName: interaction.commandName,
                interaction,
                options: Object.fromEntries(
                    (Array.isArray(interaction.options?.data) ? interaction.options.data : []).map((o: any) => {
                        return [o.name, o.value];
                    }),
                ),
                userId: interaction.user.id,
                guildId: interaction.guildId ?? undefined,
                ownerId: interaction.guild?.ownerId ?? undefined,
                isAdministrator: enrichedFlowContext.isAdministrator,
                character: enrichedFlowContext.character,
                getMember: async() => {
                    return interaction.guild ? await interaction.guild.members.fetch(interaction.user.id) : null;
                },
            };

            // Defer reply to avoid "The application did not respond" when performing
            // long-running permission checks or waiting for admin input.
            let deferredByHandler = false;
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                    deferredByHandler = true;
                } catch(e) {
                    // If deferring fails, continue without blocking; the request may still work.
                        log.warning(`Failed to defer interaction reply: ${String(e)}`, `InteractionHandler`);
                try {
                    const _origReply = interaction.reply?.bind(interaction);
                    (interaction as any).reply = async(options: any) => {
                        try {
                            return (await interaction.editReply(options)) as any;
                        } catch(err) {
                            if (_origReply) {
                                return _origReply(options);
                            }
                            throw err;
                        }
                    };
                } catch {}
            }

            // DEBUG: Log before permission request
            log.debug(
                `Preparing to request permission`,
                `InteractionHandler`,
                JSON.stringify({
                    commandName: interaction.commandName,
                    userId: interaction.user.id,
                    guildId: interaction.guildId,
                    channelId: interaction.channel?.id,
                    templatesCount: templates.length,
                    templates: templates,
                }),
            );

            // Global gate: resolve required tokens, check permanent grants, and request admin approval if needed.
            // This gate remains independent from any local flow-level permission checks.
            const flowMember = member ? ExtractFlowMember(member) : null;
            const resolution = await resolve(templates, {
                context: resolverCtx as any,
                member: flowMember,
                requestApproval: payload => {
                    log.debug(
                        `RequestPermissionFromAdmin called`,
                        `InteractionHandler`,
                        JSON.stringify({ tokens: payload.tokens, reason: payload.reason }),
                    );
                    return RequestPermissionFromAdmin(interaction, payload as any);
                },
            });

            log.debug(
                `Permission resolution result`,
                `InteractionHandler`,
                JSON.stringify({
                    success: resolution.success,
                    reason: resolution.detail.reason,
                    tokensCount: resolution.detail.tokens.length,
                    decision: resolution.detail.decision,
                }),
            );

            if (!resolution.success) {
                throw new Error(resolution.detail.reason ?? `Permission denied`);
            }

            log.debug(`Permission gate passed, executing command`, `InteractionHandler`);
            // Execute the command after the global gate passes.
            await command.execute(interaction);
        } catch(err: any) {
            // Centralized error handler for permission denials and execution errors
            log.error(`Interaction handler error for /${interaction.commandName}: ${String(err)}`, `Boot`);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content:
                            typeof err?.message === `string` ? err.message : `Permission denied or execution error.`,
                        flags: MessageFlags.Ephemeral,
                    });
                } else if (interaction.deferred) {
                    await interaction.editReply({
                        content:
                            typeof err?.message === `string` ? err.message : `Permission denied or execution error.`,
                    });
                }
            } catch {}
        }
    };
}
