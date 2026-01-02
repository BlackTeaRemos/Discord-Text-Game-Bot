import { MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../../Common/Type/Interaction.js';
import type { FlowManager } from '../../../Common/Flow/Manager.js';
import type { ExecutionContext } from '../../../Domain/index.js';
import { RunDescriptionEditorFlow } from '../../../Flow/Object/Description/Editor/index.js';
import { SelectDescriptionTarget } from './SelectDescriptionTarget.js';
import { ResolveDescriptionTargetPermission } from '../../../Flow/Command/Description/ResolveDescriptionTargetPermission.js';
import { ExtractFlowContext, ExtractFlowMember } from '../../../Common/Type/FlowContext.js';
import { RequestPermissionFromAdmin } from '../../Permission/PermissionUI.js';
import type { PermissionsObject } from '../../../Common/Permission/index.js';
import type { PermissionToken } from '../../../Common/Permission/types.js';

export interface DescriptionCreateFlowOptions {
    /**
     * Discord interaction that triggered the flow.
     */
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>;
    /**
     * Flow manager coordinating multi-step interactions.
     */
    flowManager: FlowManager;
    /**
     * Shared execution context for reuse within the flow.
     */
    executionContext: ExecutionContext;
}

/**
 * Run the interactive modal-driven description creation flow.
 * @param options DescriptionCreateFlowOptions Configuration for the flow execution. @example await RunDescriptionCreateFlow({ interaction, flowManager, executionContext })
 * @returns Promise<void> Resolves once the flow finishes. @example await RunDescriptionCreateFlow({ interaction, flowManager, executionContext })
 */
export async function RunDescriptionCreateFlow(options: DescriptionCreateFlowOptions): Promise<void> {
    const { interaction, flowManager, executionContext } = options;
    void flowManager;
    void executionContext;

    const selection = await SelectDescriptionTarget(interaction as unknown as ChatInputCommandInteraction);
    if (!selection) {
        return;
    }

    const flowContext = ExtractFlowContext(interaction);
    const memberProvider = async() => {
        const member = await interaction.guild?.members.fetch(interaction.user.id);
        return member ? ExtractFlowMember(member) : null;
    };

    const permissionResult = await ResolveDescriptionTargetPermission({
        context: flowContext,
        target: { type: selection.type, id: selection.id },
        memberProvider,
    });

    if (!permissionResult.allowed) {
        const approved = await __TryApprove(interaction, permissionResult.tokens, permissionResult.requiresApproval);
        if (!approved) {
            await interaction.followUp({
                content: `Permission denied for the selected target.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
    }

    const objectType = selection.type === `building` ? `factory` : selection.type;
    const canEditGlobal = interaction.memberPermissions?.has(`Administrator`) ?? false;

    await interaction.editReply({ content: `Opening description editor...`, components: [] });

    await RunDescriptionEditorFlow(interaction as unknown as ChatInputCommandInteraction, {
        objectType,
        objectUid: selection.id,
        userUid: interaction.user.id,
        organizationUid: null,
        canEditGlobal,
        permissions: __BuildEditorPermissions(canEditGlobal),
    });
}

/**
 * Build default permission set for description scope UI.
 * This is intentionally permissive for user/org scopes because scope visibility is further
 * restricted by GetVisibleScopes (membership) and canEditGlobal.
 * @param canEditGlobal boolean Whether global scope is enabled. @example true
 * @returns PermissionsObject Permission map. @example { 'description:scope:user:view': 'allowed' }
 */
function __BuildEditorPermissions(canEditGlobal: boolean): PermissionsObject {
    const permissions: PermissionsObject = {
        [`description:scope:user:view`]: `allowed`,
        [`description:scope:user:edit`]: `allowed`,
        [`description:scope:organization:view`]: `allowed`,
        [`description:scope:organization:edit`]: `allowed`,
    };

    if (canEditGlobal) {
        permissions[`description:scope:global:view`] = `allowed`;
        permissions[`description:scope:global:edit`] = `allowed`;
    }

    return permissions;
}

/**
 * Attempt to request approval for denied permissions.
 * Persistence is handled by RequestPermissionFromAdmin for 'approve_forever'.
 * @param interaction ChatInputCommandInteraction The triggering interaction.
 * @param tokens PermissionToken[] Tokens to request.
 * @param requiresApproval boolean | undefined Whether the denial is approvable.
 * @returns Promise<boolean> True when approved.
 */
async function __TryApprove(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
    tokens: PermissionToken[],
    requiresApproval: boolean | undefined,
): Promise<boolean> {
    if (!requiresApproval || tokens.length === 0) {
        return false;
    }

    const decision = await RequestPermissionFromAdmin(interaction, { tokens });
    return decision === `approve_once` || decision === `approve_forever`;
}
