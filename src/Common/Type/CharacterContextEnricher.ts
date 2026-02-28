import type { IFlowInteractionContext, ICharacterContext } from './FlowContext.js';
import { GetUserActiveCharacter } from '../../Flow/Object/Character/Relation.js';

/**
 * Enriches interaction context with character data resolved from user discord ID early in command processing
 * @param context IFlowInteractionContext Base context without character data
 * @returns Promise of IFlowInteractionContext Context enriched with character information
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
