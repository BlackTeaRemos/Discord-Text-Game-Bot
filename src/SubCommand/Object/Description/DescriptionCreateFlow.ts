import { MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../../Common/Type/Interaction.js';
import type { FlowManager } from '../../../Common/Flow/Manager.js';
import type { ExecutionContext } from '../../../Domain/index.js';
import { RunDescriptionEditorFlow } from '../../../Flow/Object/Description/Editor/index.js';
import { SelectDescriptionTarget, type DescriptionTargetSelection } from './SelectDescriptionTarget.js';
import {
    ResolveExecutionOrganization,
    ResolveOrganization,
} from '../../../Flow/Object/Organization/index.js';
import { ResolveDescriptionTargetPermission } from '../../../Flow/Command/Description/ResolveDescriptionTargetPermission.js';
import { ExtractFlowContext, ExtractFlowMember } from '../../../Common/Type/FlowContext.js';
import { RequestPermissionFromAdmin } from '../../Permission/PermissionUI.js';
import { resolve } from '../../../Common/Permission/index.js';
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
    /**
     * Optional pre-selected target to skip interactive selection.
     */
    target?: DescriptionTargetSelection;
}

/**
 * Run the interactive modal-driven description creation flow.
 * @param options DescriptionCreateFlowOptions Configuration for the flow execution. @example await RunDescriptionCreateFlow({ interaction, flowManager, executionContext })
 * @returns Promise<void> Resolves once the flow finishes. @example await RunDescriptionCreateFlow({ interaction, flowManager, executionContext })
 */
export async function RunDescriptionCreateFlow(options: DescriptionCreateFlowOptions): Promise<void> {
    const { interaction, flowManager, executionContext, target } = options;
    void flowManager;
    void executionContext;

    const selection = target ?? await SelectDescriptionTarget(interaction as unknown as ChatInputCommandInteraction);
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
        const resolution = await resolve(permissionResult.tokens, {
            context: flowContext,
            member: await memberProvider(),
            requestApproval: payload => {
                return RequestPermissionFromAdmin(interaction, payload as any);
            },
        });

        if (!resolution.success) {
            await interaction.followUp({
                content: `Permission denied for the selected target.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
    }

    const objectType = selection.type === `building` ? `factory` : selection.type;
    const canEditGlobal = interaction.memberPermissions?.has(`Administrator`) ?? false;

    // Resolve execution organization using defaults (no requested override in interactive flow)
    const executionOrganization = await ResolveExecutionOrganization(interaction.user.id, null);

    if (executionOrganization.scopeType === `organization` && executionOrganization.organizationUid) {
        const organizationPermission = await ResolveOrganization({
            context: {
                organizationUid: executionOrganization.organizationUid,
                userId: interaction.user.id,
                action: `create_description`,
            },
            skipApproval: false,
        });

        if (!organizationPermission.allowed) {
            await interaction.followUp({ content: `Permission denied (${executionOrganization.organizationName}).`, flags: MessageFlags.Ephemeral });
            return;
        }
    } else {
        const resolution = await resolve([`user:${interaction.user.id}:create_description`], {
            context: flowContext,
            member: await memberProvider(),
            permissions: {
                [`user:${interaction.user.id}:create_description`]: `allowed`,
            },
        });
        if (!resolution.success) {
            await interaction.followUp({ content: `Permission denied (User).`, flags: MessageFlags.Ephemeral });
            return;
        }
    }

    await interaction.editReply({ content: `Opening description editor for **${objectType}** \`${selection.id}\` as ${executionOrganization.organizationName}...`, components: [] });

    await RunDescriptionEditorFlow(interaction as unknown as ChatInputCommandInteraction, {
        objectType,
        objectUid: selection.id,
        userUid: interaction.user.id,
        organizationUid: executionOrganization.organizationUid,
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
