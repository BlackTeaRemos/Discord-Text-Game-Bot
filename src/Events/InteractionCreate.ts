import type { ButtonInteraction, Interaction, StringSelectMenuInteraction } from 'discord.js';
import { Log } from '../Common/Log.js';
import { flowManager } from '../Common/Flow/Manager.js';
import { HandleGameCreateControlInteraction } from '../SubCommand/Object/Game/GameCreateControls.js';
import { HandleUserCreateControlInteraction } from '../SubCommand/Object/User/UserCreateControls.js';
import { HandleOrganizationSelectControlInteraction } from '../SubCommand/Object/Organization/OrganizationSelectControls/index.js';
import { ObjectViewRenderer } from '../Framework/ObjectView/ObjectViewRenderer.js';
import { MAIN_EVENT_BUS } from '../Events/MainEventBus.js';
import { EVENT_NAMES } from '../Domain/index.js';

export async function OnInteractionCreate(interaction: Interaction): Promise<void> {
    try {
        let handled = false;
        if (interaction.isButton()) {
            handled = await HandleGameCreateControlInteraction(interaction as ButtonInteraction);
            if (!handled) {
                handled = await HandleUserCreateControlInteraction(interaction as ButtonInteraction);
            }
        }

        if (!handled && interaction.isStringSelectMenu()) {
            handled = await HandleOrganizationSelectControlInteraction(interaction as StringSelectMenuInteraction);
        }

        if (!handled && interaction.isButton()) {
            handled = await ObjectViewRenderer.DispatchInteraction(
                interaction as ButtonInteraction,
            );
        }

        if (handled) {
            MAIN_EVENT_BUS.Emit(EVENT_NAMES.userComponentInteraction, interaction.id, interaction.user.id);
            return;
        }

        MAIN_EVENT_BUS.Emit(EVENT_NAMES.userFlowInteraction, interaction.id, interaction.user.id);
        await flowManager.onInteraction(interaction);
    } catch(error) {
        Log.error(`Flow manager failed to process interaction ${interaction.id}: ${(error as Error).message}`, `Flow`);
    }
}
