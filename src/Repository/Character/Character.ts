/**
 * Character represents an identity that can interact with organization content.
 * Characters have names and descriptions, and can be related to organizations.
 * Users can be associated with characters to assume their identity for interactions.
 */
import type { DBObject } from '../Object/Object.js';
import type { UID } from '../Common/Ids.js';

export interface Character extends DBObject {
    description: string; // character description defining their background
    organizationUid: UID | null; // organization this character belongs to, null if independent
}
