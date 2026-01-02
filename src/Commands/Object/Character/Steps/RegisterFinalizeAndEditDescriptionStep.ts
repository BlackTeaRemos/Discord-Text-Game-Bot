import { MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { FlowBuilder, StepContext } from '../../../../Common/Flow/index.js';
import type { InteractionExecutionContextCarrier } from '../../../../Common/Type/Interaction.js';
import { log } from '../../../../Common/Log.js';
import { CreateCharacter, SetUserActiveCharacter } from '../../../../Flow/Object/Character/index.js';
import { RunDescriptionEditorFlow } from '../../../../Flow/Object/Description/Editor/index.js';
import { BuildCharacterDescriptionEditorPermissions } from '../BuildCharacterDescriptionEditorPermissions.js';
import type { CharacterCreateFlowState } from '../CreateFlowTypes.js';

/**
 * Register the final step that persists the character, sets it active, and opens the description editor flow.
 * @param builder FlowBuilder<CharacterCreateFlowState> Flow builder to extend.
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Triggering interaction.
 * @returns FlowBuilder<CharacterCreateFlowState>
 */
export function RegisterFinalizeAndEditDescriptionStep(
    builder: FlowBuilder<CharacterCreateFlowState>,
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): FlowBuilder<CharacterCreateFlowState> {
    return builder
        .step()
        .prompt(async (ctx: StepContext<CharacterCreateFlowState>) => {
            const characterName = ctx.state.characterName?.trim();
            if (!characterName) {
                await interaction.followUp({
                    content: `Character creation cancelled: missing name.`,
                    flags: MessageFlags.Ephemeral,
                }).catch(() => {
                    return undefined;
                });
                await ctx.cancel();
                return;
            }

            try {
                const created = await CreateCharacter({
                    name: characterName,
                    friendlyName: characterName,
                    description: undefined,
                    organizationUid: ctx.state.organizationUid ?? undefined,
                    createdBy: interaction.user.id,
                });

                await SetUserActiveCharacter(interaction.user.id, created.uid);

                await interaction.editReply({
                    content: `Character created. Opening description editor...`,
                    components: [],
                }).catch(() => {
                    return undefined;
                });

                // Important: stop our FlowManager flow before entering the description editor,
                // otherwise FlowManager would steal interactions from the editor.
                await ctx.cancel();

                const canEditGlobal = interaction.memberPermissions?.has(`Administrator`) ?? false;

                await RunDescriptionEditorFlow(interaction as unknown as ChatInputCommandInteraction, {
                    objectType: `character`,
                    objectUid: created.uid,
                    userUid: interaction.user.id,
                    organizationUid: ctx.state.organizationUid,
                    canEditGlobal,
                    permissions: BuildCharacterDescriptionEditorPermissions(canEditGlobal),
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                log.error(`Failed to persist character or open description editor`, message, `CharacterCreateFlow`);

                await interaction.followUp({
                    content: `Unable to create character: ${message}`,
                    flags: MessageFlags.Ephemeral,
                }).catch(() => {
                    return undefined;
                });

                await ctx.cancel();
            }
        })
        .next();
}
