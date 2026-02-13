/**
 * /manage object -- Create a game object instance from a template for an organization.
 * Takes a template name (autocomplete from available templates) and an organization name.
 */

import { MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { log } from '../../Common/Log.js';
import { ListGamesForServer } from '../../Flow/Object/Game/ListGamesForServer.js';
import { GameObjectTemplateRepository } from '../../Repository/GameObject/GameObjectTemplateRepository.js';
import { GameObjectRepository } from '../../Repository/GameObject/GameObjectRepository.js';
import { ResolveExecutionOrganization } from '../../Flow/Object/Organization/index.js';

/** Log tag for this module. */
const LOG_TAG = `Commands/Manage/Object`;

/**
 * Execute the /manage object subcommand.
 * Creates a new game object instance from a template, owned by a specified organization.
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction.
 * @returns Promise<void>
 */
export async function ExecuteManageObject(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const serverId = interaction.guildId;

    if (!serverId) {
        await interaction.reply({
            content: `This command can only be used in a server.`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    try {
        // Resolve the game
        const games = await ListGamesForServer(serverId);
        const game = games[0];

        if (!game) {
            await interaction.editReply({ content: `No game found for this server. Create a game first.` });
            return;
        }

        const templateInput = interaction.options.getString(`template`, true).trim();
        const requestedOrganizationUid = interaction.options.getString(`organization`)?.trim() || null;
        const objectName = interaction.options.getString(`name`, false);

        const executionOrganization = await ResolveExecutionOrganization(
            interaction.user.id,
            requestedOrganizationUid,
        );

        if (!executionOrganization.organizationUid) {
            await interaction.editReply({ content: `No organization resolved. Provide one or select a default via /organization select.` });
            return;
        }

        const organizationUid = executionOrganization.organizationUid;

        // Resolve template by name within the game
        const templateRepository = new GameObjectTemplateRepository();
        const template = await templateRepository.FindByName(game.uid, templateInput);

        if (!template) {
            await interaction.editReply({ content: `Template "${templateInput}" not found in this game.` });
            return;
        }

        // Create the instance
        const objectRepository = new GameObjectRepository();
        const created = await objectRepository.Create({
            templateUid: template.uid,
            gameUid: game.uid,
            organizationUid,
            name: objectName ?? undefined,
        });

        const parameterCount = created.parameters.length;
        await interaction.editReply({
            content: `Object **${created.name}** created (uid: \`${created.uid}\`). ${parameterCount} parameters initialized from template.`,
        });

        log.info(`Object "${created.name}" created from template "${template.name}" for org "${organizationUid}".`, LOG_TAG);
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Failed to create object: ${message}`, LOG_TAG, `ExecuteManageObject`);
        await interaction.editReply({ content: `Failed to create object: ${message}` });
    }
}
