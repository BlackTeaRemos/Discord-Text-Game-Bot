import type { ChatInputCommandInteraction } from 'discord.js';
import type { FlowManager } from '../../../Common/Flow/index.js';
import type { InteractionExecutionContextCarrier } from '../../../Common/Type/Interaction.js';
import type { CharacterCreateFlowState } from './CreateFlowTypes.js';
import { RegisterOrganizationSelectionStep } from './Steps/RegisterOrganizationSelectionStep.js';
import { RegisterNamePromptStep } from './Steps/RegisterNamePromptStep.js';
import { RegisterFinalizeAndEditDescriptionStep } from './Steps/RegisterFinalizeAndEditDescriptionStep.js';

export interface RunCharacterCreateFlowOptions {
    flowManager: FlowManager;
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>;
}

/**
 * Run an interactive flow to create a character.
 * Flow steps:
 * - Select organization (or none)
 * - Prompt name
 * - Persist character and set active
 * - Open the existing description editor flow for the created character
 *
 * @param options RunCharacterCreateFlowOptions Flow manager and interaction. @example await RunCharacterCreateFlow({ flowManager, interaction })
 * @returns Promise<void>
 */
export async function RunCharacterCreateFlow(options: RunCharacterCreateFlowOptions): Promise<void> {
    const { flowManager, interaction } = options;

    const state: CharacterCreateFlowState = {
        organizationUid: null,
        organizationName: null,
        characterName: null,
    };

    let builder = flowManager.builder(
        interaction.user.id,
        interaction as any,
        state,
        (interaction as any).executionContext,
    );

    builder = RegisterOrganizationSelectionStep(builder, interaction);
    builder = RegisterNamePromptStep(builder, interaction);
    builder = RegisterFinalizeAndEditDescriptionStep(builder, interaction);

    await builder.start();
}
