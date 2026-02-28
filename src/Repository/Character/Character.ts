import type { DBObject } from '../Object/Object.js';
import type { UID } from '../Common/Ids.js';

export interface Character extends DBObject {
    description: string; // character description defining their background
    organizationUid: UID | null; // organization this character belongs to or null if independent
}
