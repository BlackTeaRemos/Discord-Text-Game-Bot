/**
 * Character domain exports for character management and relationships.
 */

export type { ViewCharacter, CharacterWithOrganization } from './View.js';
export {
    GetCharacterByUid,
    GetCharacterWithOrganization,
    ListCharactersByOrganization,
} from './View.js';

export {
    AssociateCharacterWithOrganization,
    RemoveCharacterFromOrganization,
    GetUserActiveCharacter,
    SetUserActiveCharacter,
    ClearUserActiveCharacter,
    ListAvailableCharactersForUser,
} from './Relation.js';

export type { CreateCharacterOptions, CreatedCharacter } from './Create.js';
export { CreateCharacter } from './Create.js';
