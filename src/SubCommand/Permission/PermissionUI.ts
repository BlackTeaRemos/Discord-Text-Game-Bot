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
import { FormatPermissionToken } from '../../Common/Permission/FormatPermissionToken.js';
import { PermissionApprovalError } from '../../Common/Errors.js';
import { log } from '../../Common/Log.js';

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
    log.info(
        `PermissionUI.RequestPermissionFromAdmin`,
        import.meta.filename,
        JSON.stringify({
            userId: interaction.user.id,
            channelId: interaction.channel?.id,
            guildId: interaction.guild?.id,
            tokens: options.tokens,
        }),
    );

    log.info(
        `PermissionUI.ChannelInfo`,
        import.meta.filename,
        JSON.stringify({
            type: interaction.channel?.type,
            hasSend: typeof (interaction.channel as any)?.send === `function`,
            channel: interaction.channel,
        }),
    );

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
        const message = `Unable to locate the server context for approval. Try again from within the guild.`;
        await _respondToUser(message);
        throw new PermissionApprovalError(message, {
            reason: `missing_guild`,
            interactionId: interaction.id,
            userId: interaction.user.id,
        });
    }

    // Fetch all members and find administrators (exclude bots)
    let members = guild.members.cache;
    log.info(
        `PermissionUI.MembersCached`,
        import.meta.filename,
        JSON.stringify({ guildId: guild.id, cachedCount: members.size }),
    );

    const needsFetch =
        members.size === 0 ||
        members.filter(m => {
            return !m.user.bot && m.permissions.has(PermissionsBitField.Flags.Administrator);
        }).size === 0;

    if (needsFetch) {
        log.info(
            `PermissionUI.FetchingMembers`,
            import.meta.filename,
            JSON.stringify({ guildId: guild.id, channelId: interaction.channel?.id }),
        );
        try {
            members = await guild.members.fetch();
            log.info(
                `PermissionUI.MembersFetched`,
                import.meta.filename,
                JSON.stringify({ guildId: guild.id, fetchedCount: members.size }),
            );
        } catch(err) {
            log.error(
                `PermissionUI.MembersFetchFailed`,
                import.meta.filename,
                JSON.stringify({ guildId: guild.id, error: String(err) }),
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

    log.info(
        `PermissionUI.AdminCandidates`,
        import.meta.filename,
        JSON.stringify({ guildId: guild.id, candidates: admins.size }),
    );

    // Log found admins
    log.info(
        `PermissionUI.FoundAdmins`,
        import.meta.filename,
        JSON.stringify(
            admins.map(a => {
                return { id: a.id, tag: a.user.tag };
            }),
        ),
    );

    if (!admins || admins.size === 0) {
        const message = `No eligible administrator could be contacted. Ask an admin to review permissions.`;
        await _respondToUser(message);
        throw new PermissionApprovalError(message, {
            reason: `no_admin`,
            guildId: guild.id,
            userId: interaction.user.id,
        });
    }

    // Pick a random admin
    const adminArray = Array.from(admins.values());
    const admin = adminArray[Math.floor(Math.random() * adminArray.length)];

    // Log selected admin
    log.info(`PermissionUI.SelectedAdmin`, import.meta.filename, JSON.stringify({ id: admin.id, tag: admin.user.tag }));

    // Build message
    const tokensStr = options.tokens.map(FormatPermissionToken).join(`, `);
    const embed = new EmbedBuilder()
        .setTitle(`Permission request`)
        .setColor(Colors.Orange)
        .setDescription(`User <@${interaction.user.id}> requested to run command(s): ${tokensStr}`)
        .addFields([{ name: `Reason`, value: options.reason || `No reason provided` }]);

    const approveOnceBtn = new ButtonBuilder()
        .setCustomId(`perm_approve_once`)
        .setLabel(`Approve once`)
        .setStyle(ButtonStyle.Primary);
    const approveForeverBtn = new ButtonBuilder()
        .setCustomId(`perm_approve_forever`)
        .setLabel(`Approve forever`)
        .setStyle(ButtonStyle.Success);
    const denyBtn = new ButtonBuilder().setCustomId(`perm_deny`).setLabel(`Deny`).setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(approveOnceBtn, approveForeverBtn, denyBtn);

    // Ensure bot has permission to send messages in the target channel
    const channelAny = interaction.channel as any;
    const botMember =
        interaction.guild.members.me ?? (await interaction.guild.members.fetch(interaction.client.user.id));
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
        const message = `I don't have permission to send messages in this channel. Ask a server admin to grant me Send Messages permission.`;
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
            log.info(
                `PermissionUI.SentApprovalRequest`,
                import.meta.filename,
                JSON.stringify({ channelId: interaction.channel?.id, messageId: msg.id }),
            );
        } else {
            throw new Error(`Channel does not support send`);
        }
    } catch(err) {
        log.error(
            `PermissionUI.SendApprovalRequestFailed`,
            import.meta.filename,
            JSON.stringify({
                error: String(err),
                channelId: interaction.channel?.id,
                adminId: admin.id,
            }),
        );
        const message = `Failed to deliver approval request in the current channel.`;
        await _respondToUser(message);
        throw new PermissionApprovalError(message, {
            reason: `delivery_failed`,
            guildId: guild.id,
            userId: interaction.user.id,
        });
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
        const message = `Administrator denied the permission request.`;
        await _respondToUser(message);
        throw new PermissionApprovalError(message, {
            reason: `deny`,
            guildId: guild.id,
            userId: interaction.user.id,
            adminId: admin.id,
        });
    } catch(err) {
        // Timeout or other error
        try {
            await msg.edit({ content: `${admin} (no response)`, components: [] });
        } catch {}
        if (err instanceof PermissionApprovalError) {
            throw err;
        }
        const message = `No administrator responded in time. Try again later.`;
        await _respondToUser(message);
        throw new PermissionApprovalError(message, {
            reason: `timeout`,
            guildId: guild.id,
            userId: interaction.user.id,
            adminId: admin.id,
        });
    }
}
