import type { IFlowInteractionContext, ICharacterContext } from './FlowContext.js';
import { GetUserActiveCharacter } from '../../Flow/Object/Character/Relation.js';

/**
 * Enrich interaction context with character data resolved from user discord ID.
 * This should be called early in command processing to populate character context.
 * @param context IFlowInteractionContext Base context without character data. @example ExtractFlowContext(interaction)
 * @returns Promise<IFlowInteractionContext> Context enriched with character information.
 * @example
 * const baseContext = ExtractFlowContext(interaction);
 * const enrichedContext = await EnrichWithCharacter(baseContext);
 */
export async function EnrichWithCharacter(context: IFlowInteractionContext): Promise<IFlowInteractionContext> {
    const activeCharacter = await GetUserActiveCharacter(context.userId);

    const characterContext: ICharacterContext | null = activeCharacter
        ? {
              characterUid: activeCharacter.uid,
              organizationUid: activeCharacter.organizationUid,
          }
        : null;

    return {
        ...context,
        character: characterContext,
    };
}
