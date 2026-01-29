import type { ButtonInteraction, Interaction } from 'discord.js';
import { log } from '../Common/Log.js';
import { flowManager } from '../Common/Flow/Manager.js';
import { HandleGameCreateControlInteraction } from '../SubCommand/Object/Game/GameCreateControls.js';
import { HandleOrganizationCreateControlInteraction } from '../SubCommand/Object/Organization/OrganizationCreateControls.js';
import { HandleUserCreateControlInteraction } from '../SubCommand/Object/User/UserCreateControls.js';

/**
 * Handles the 'interactionCreate' event from Discord by delegating processing to the shared flow manager.
 * @param interaction Interaction Discord interaction instance received from the gateway. Example ButtonInteraction.
 * @returns Promise<void> Resolves after the flow manager finishes handling the interaction. Example await onInteractionCreate(interaction).
 * @example
 * client.on('interactionCreate', onInteractionCreate);
 */
export async function OnInteractionCreate(interaction: Interaction): Promise<void> {
    log.info(
        `Interaction received: type=${interaction.type}, id=${interaction.id}, user=${interaction.user?.tag}`,
        `Interaction`,
    );

    try {
        let handled = false;
        if (interaction.isButton()) {
            handled = await HandleGameCreateControlInteraction(interaction as ButtonInteraction);
            if (!handled) {
                handled = await HandleOrganizationCreateControlInteraction(interaction as ButtonInteraction);
            }
            if (!handled) {
                handled = await HandleUserCreateControlInteraction(interaction as ButtonInteraction);
            }

        }

        if (!handled) {
            await flowManager.onInteraction(interaction);
        }
    } catch(error) {
        log.error(`Flow manager failed to process interaction ${interaction.id}: ${(error as Error).message}`, `Flow`);
    }
}
