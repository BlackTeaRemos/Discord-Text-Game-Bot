import { MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction, Message } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { ListGamesForServer } from '../../Flow/Object/Game/ListGamesForServer.js';
import { GetGameCurrentTurn } from '../../Flow/Object/Game/Turn.js';
import { CreateTaskRecord } from '../../Flow/Task/CreateTaskRecord.js';
import { neo4jClient } from '../../Setup/Neo4j.js';
import { log } from '../../Common/Log.js';
import { FindOrganizationForServer } from '../../Flow/Object/Organization/FindForServer.js';

/**
 * Create task from replied message for current turn
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction
 * @returns Promise<void> Resolves when task is created
 */
export async function ExecuteCreateTask(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const serverId = interaction.guildId;
    if (!serverId) {
        await interaction.reply({
            content: `This command must be used in a server`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const delay = interaction.options.getInteger(`delay`) ?? 0;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        const repliedMessage = await __FetchRepliedMessage(interaction);
        if (!repliedMessage) {
            await interaction.editReply({
                content: `This command must be used as a reply to a message`,
            });
            return;
        }

        const messageContent = repliedMessage.content?.trim();
        if (!messageContent) {
            await interaction.editReply({
                content: `The replied message has no text content`,
            });
            return;
        }

        const games = await ListGamesForServer(serverId);
        const game = games[0];
        if (!game) {
            await interaction.editReply({
                content: `No game exists in this server. Create one first with \`/create game\``,
            });
            return;
        }

        const currentTurn = await GetGameCurrentTurn(game.uid);
        const targetTurn = currentTurn + delay;

        const organization = await FindOrganizationForServer(serverId);
        if (!organization) {
            await interaction.editReply({
                content: `No organization found for this server`,
            });
            return;
        }

        const task = await CreateTaskRecord(neo4jClient, {
            organizationUid: organization.uid,
            gameUid: game.uid,
            turnNumber: targetTurn,
            creatorDiscordId: interaction.user.id,
            description: messageContent,
        });

        const turnLabel = delay === 0
            ? `current turn (${targetTurn})`
            : `turn ${targetTurn} (delay: ${delay > 0 ? `+` : ``}${delay})`;

        await interaction.editReply({
            content: `Task created for ${turnLabel}\nID: \`${task.id}\`\nDescription: ${messageContent.slice(0, 100)}${messageContent.length > 100 ? `...` : ``}`,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Failed to create task`, message, `CreateTask`);
        await interaction.editReply({
            content: `Failed to create task: ${message}`,
        });
    }
}

/**
 * Fetch the message this interaction is replying to
 * @param interaction ChatInputCommandInteraction The slash command interaction
 * @returns Promise<Message | null> The replied message or null
 */
async function __FetchRepliedMessage(
    interaction: ChatInputCommandInteraction,
): Promise<Message | null> {
    try {
        const channel = interaction.channel;
        if (!channel || !(`messages` in channel)) {
            return null;
        }

        const reference = (interaction as any).targetMessage ?? (interaction as any).message?.reference;
        if (!reference?.messageId) {
            return null;
        }

        return await channel.messages.fetch(reference.messageId);
    } catch {
        return null;
    }
}
