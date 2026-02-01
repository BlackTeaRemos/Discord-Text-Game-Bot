import type { PermissionsObject } from '../../../Common/Permission/index.js';
import type { IFlowInteractionContext, FlowMemberProvider } from '../../../Common/Type/FlowContext.js';
import { ResolveCommandPermission, type CommandPermissionResult } from '../PermissionResolver.js';
import { GetOrganizationWithMembers } from '../../Object/Organization/View/index.js';
import { GetUserByUid } from '../../Object/User/View.js';

/**
 * Target context for resolving description permissions.
 * @property type string Target object type key (example: 'organization').
 * @property id string Target object uid (example: 'org_123').
 */
export interface DescriptionTargetPermissionContext {
    type: string;
    id: string;
}

export type DescriptionTargetPermissionResult = CommandPermissionResult;

/**
 * Build contextual permission overrides for editing descriptions.
 * Auto-allows editing when the target matches the character's organization or is the current user.
 * @param context IFlowInteractionContext Request context.
 * @param target DescriptionTargetPermissionContext Target being edited.
 * @returns Promise<PermissionsObject | undefined> Overrides permitting the operation.
 */
async function __BuildDescriptionTargetPermissionOverrides(
    context: IFlowInteractionContext,
    target: DescriptionTargetPermissionContext,
): Promise<PermissionsObject | undefined> {
    const userId = context.userId;

    const overrides: PermissionsObject = {};
    const allow = (token: string): void => {
        overrides[token] = `allowed`;
    };

    if (context.isAdministrator) {
        allow(`description:target:${target.type}:${target.id}:edit`);
        return overrides;
    }

    if (target.type === `user`) {
        const targetUser = await GetUserByUid(target.id);
        if (targetUser?.discord_id === userId) {
            allow(`description:target:user:${target.id}:edit`);
        }
    }

    if (target.type === `organization`) {
        if (context.character?.organizationUid === target.id) {
            allow(`description:target:organization:${target.id}:edit`);
        } else {
            const org = await GetOrganizationWithMembers(target.id);
            const isMember = org?.users.some(member => {
                return member.discordId === userId;
            });
            if (isMember) {
                allow(`description:target:organization:${target.id}:edit`);
            }
        }
    }

    return Object.keys(overrides).length ? overrides : undefined;
}

/**
 * Resolve whether a user can edit descriptions for a given target object.
 * The token template used is: description:target:{type}:{id}:edit
 *
 * @param options object Resolver options.
 * @returns Promise<DescriptionTargetPermissionResult> Permission result.
 */
export async function ResolveDescriptionTargetPermission(options: {
    context: IFlowInteractionContext;
    target: DescriptionTargetPermissionContext;
    memberProvider?: FlowMemberProvider;
}): Promise<DescriptionTargetPermissionResult> {
    const overrides = await __BuildDescriptionTargetPermissionOverrides(options.context, options.target);

    return ResolveCommandPermission({
        context: options.context,
        templates: [`description:target:{type}:{id}:edit`],
        additionalContext: { type: options.target.type, id: options.target.id },
        logSource: `DescriptionTargetPermission`,
        action: `description:target:${options.target.type}:${options.target.id}:edit`,
        permissions: overrides,
        memberProvider: options.memberProvider,
    });
}
