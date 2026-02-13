import {
    ChatInputCommandInteraction,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField,
    EmbedBuilder,
    Colors,
    MessageFlags,
} from 'discord.js';
import { GrantForever, type PermissionDecision, type PermissionToken } from '../../Common/Permission/index.js';
import { FormatPermissionToken } from '../../Common/Permission/formatPermissionToken.js';
import { PermissionApprovalError } from '../../Common/Errors.js';
import { log } from '../../Common/Log.js';
import { TranslateFromContext } from '../../Services/I18nService.js';

/**
 * Requests administrator approval for a set of permission tokens tied to an interaction.
 * @param interaction ChatInputCommandInteraction Interaction needing approval (example: /start).
 * @param options { tokens: PermissionToken[]; reason?: string } Tokens requiring approval and optional reason (example: { tokens, reason: 'onboarding' }).
 * @param timeoutMs number Milliseconds to wait for a response (example: 300000).
 * @returns Promise<PermissionDecision> Decision outcome from admin interaction (example: approve_once).
 * @example
 * const decision = await RequestPermissionFromAdmin(interaction, { tokens });
 */
export async function RequestPermissionFromAdmin(
    interaction: ChatInputCommandInteraction,
    options: { tokens: PermissionToken[]; reason?: string },
    timeoutMs = 5 * 60 * 1000,
): Promise<PermissionDecision> {
    const __Translate = (key: string, params?: Record<string, unknown>): string => {
        return TranslateFromContext((interaction as any).executionContext, key, { params });
    };
    const _respondToUser = async(message: string): Promise<void> => {
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: message, flags: MessageFlags.Ephemeral });
            } else {
                await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
            }
        } catch(error) {
            log.warning(
                `Failed to respond to user during permission flow: ${String(error)}`,
                `PermissionUI`,
                `RequestPermissionFromAdmin`,
            );
        }
    }; 

    const guild = interaction.guild;
    if (!guild) {
        const message = __Translate(`permission.missingGuild`);
        await _respondToUser(message);
        throw new PermissionApprovalError(message, {
            reason: `missing_guild`,
            interactionId: interaction.id,
            userId: interaction.user.id,
        });
    }

    // Fetch all members and find administrators (exclude bots)
    let members = guild.members.cache;

    const needsFetch =
        members.size === 0 ||
        members.filter(m => {
            return !m.user.bot && m.permissions.has(PermissionsBitField.Flags.Administrator);
        }).size === 0;

    if (needsFetch) {
        try {
            members = await guild.members.fetch();
        } catch(err) {
            log.error(
                `Failed to fetch guild members`,
                `PermissionUI`,
                String(err),
            );
        }
    }

    if (members.size === 0) {
        const message = `Unable to inspect any guild members. Ask an administrator to invite me again with the "Server Members" intent enabled.`;
        await _respondToUser(message);
        throw new PermissionApprovalError(message, {
            reason: `no_members_available`,
            guildId: guild.id,
            userId: interaction.user.id,
        });
    }
    const admins = members.filter(m => {
        return !m.user.bot && m.permissions.has(PermissionsBitField.Flags.Administrator);
    });

    const ownerId = guild.ownerId;
    if (ownerId) {
        let ownerMember = members.get(ownerId);
        if (!ownerMember) {
            try {
                ownerMember = await guild.members.fetch(ownerId);
            } catch {
                ownerMember = undefined;
            }
        }
        if (ownerMember && !ownerMember.user.bot) {
            admins.set(ownerMember.id, ownerMember);
        }
    }

    if (!admins || admins.size === 0) {
        const message = __Translate(`permission.noAdminAvailable`);
        await _respondToUser(message);
        throw new PermissionApprovalError(message, {
            reason: `no_admin`,
            guildId: guild.id,
            userId: interaction.user.id,
        });
    }

    // Prefer the requesting admin so they receive the approval prompt
    const requesterAdmin = admins.get(interaction.user.id);
    const adminArray = Array.from(admins.values());
    const admin = requesterAdmin ?? adminArray[Math.floor(Math.random() * adminArray.length)];

    // Build message
    const tokensStr = options.tokens.map(FormatPermissionToken).join(`, `);
    const embed = new EmbedBuilder()
        .setTitle(__Translate(`permission.requestTitle`))
        .setColor(Colors.Orange)
        .setDescription(__Translate(`permission.requestDescription`, { userId: interaction.user.id, tokens: tokensStr }))
        .addFields([{ name: __Translate(`permission.reasonLabel`), value: options.reason || __Translate(`permission.noReason`) }]);

    const approveOnceBtn = new ButtonBuilder()
        .setCustomId(`perm_approve_once`)
        .setLabel(__Translate(`permission.approveOnce`))
        .setStyle(ButtonStyle.Primary);
    const approveForeverBtn = new ButtonBuilder()
        .setCustomId(`perm_approve_forever`)
        .setLabel(__Translate(`permission.approveForever`))
        .setStyle(ButtonStyle.Success);
    const denyBtn = new ButtonBuilder().setCustomId(`perm_deny`).setLabel(__Translate(`permission.deny`)).setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(approveOnceBtn, approveForeverBtn, denyBtn);

    // Ensure bot has permission to send messages in the target channel
    const channelAny = interaction.channel as any;
    const botMember =
        interaction.guild.members.me ?? (await interaction.guild.members.fetch(interaction.client.user.id));
    if (!botMember) {
        const message = __Translate(`permission.membersUnavailable`);
        await _respondToUser(message);
        throw new PermissionApprovalError(message, {
            reason: `members_unavailable`,
            guildId: guild.id,
            userId: interaction.user.id,
        });
    }
    const botCanSend =
        typeof channelAny?.permissionsFor === `function`
            ? channelAny.permissionsFor(botMember)?.has(PermissionsBitField.Flags.SendMessages)
            : true;

    if (!botCanSend) {
        log.error(
            `PermissionUI.BotCannotSend`,
            import.meta.filename,
            JSON.stringify({ channelId: interaction.channel?.id, botId: botMember?.id }),
        );
        const message = __Translate(`permission.botCannotSend`);
        await _respondToUser(message);
        throw new PermissionApprovalError(message, {
            reason: `bot_no_send`,
            guildId: guild.id,
            userId: interaction.user.id,
        });
    }

    let msg;
    try {
        // Only send if channel supports send
        if (typeof channelAny?.send === `function`) {
            msg = await channelAny.send({ content: `<@${admin.id}>`, embeds: [embed], components: [row] });
        } else {
            throw new Error(`Channel does not support send`);
        }
    } catch(err) {
        log.error(
            `Failed to send approval request`,
            `PermissionUI`,
            String(err),
        );
        throw new Error(__Translate(`permission.channelNoSend`));
    }

    // Wait for button from the selected admin
    try {
        const filter = (i: any) => {
            return i.user.id === admin.id && i.message.id === msg.id;
        };
        const collected = await msg.awaitMessageComponent({ filter, time: timeoutMs });

        await collected.deferUpdate();

        // Delete the approval request message after response
        try {
            await msg.delete();
        } catch {
            // Message may already be deleted
        }

        const id = collected.customId;
        if (id === `perm_approve_once`) {
            return `approve_once`;
        }
        if (id === `perm_approve_forever`) {
            // Grant all requested tokens, not just the first one
            for (const token of options.tokens) {
                await GrantForever(guild.id, interaction.user.id, token, collected.user.id);
            }
            return `approve_forever`;
        }
        const message = __Translate(`permission.adminDenied`);
        await _respondToUser(message);
        throw new PermissionApprovalError(message, {
            guildId: guild.id,
            userId: interaction.user.id,
            adminId: admin.id,
        });
    } catch(err) {
        // Timeout or other error
        try {
            await msg.edit({
                content: __Translate(`permission.adminNoResponse`, { admin: String(admin) }),
                components: [],
            });
        } catch {}
        if (err instanceof PermissionApprovalError) {
            throw err;
        }
        const message = __Translate(`permission.adminTimeout`);
        await _respondToUser(message);
        throw new PermissionApprovalError(message, {
            reason: `timeout`,
            guildId: guild.id,
            userId: interaction.user.id,
            adminId: admin.id,
        });
    }
}
